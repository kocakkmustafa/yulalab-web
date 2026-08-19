import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

/**
 * Lead capture.
 *
 * Unlike `attributions`, this handles personal data on purpose — a lead is a
 * name, an address and a message, and the point is to reply to a person. The
 * protections are therefore different in kind from 0001's "no PII by
 * construction": consent recorded beside the record, a retention date
 * written at insert time, and redaction at every log site.
 */

/**
 * The version of the notice THIS SERVER shows, recorded as the thing
 * consented to.
 *
 * Taking it from the request defeated the whole design argument: a consent
 * row exists to answer "to what did they agree", and a version the caller
 * names proves nothing — any client could post "1970-01-01" and the database
 * would record consent to a notice that never existed. It is pinned here and
 * tied to the /privacy copy; whatever the client sends is ignored.
 */
export const CURRENT_NOTICE_VERSION = "2026-08-19";

export type LeadIntent = "product" | "studio" | "partnership" | "press" | "privacy";

export type LeadInput = {
  name: string;
  email: string;
  company?: string;
  intent: LeadIntent;
  productSlug?: string;
  message: string;
  locale: "tr" | "en";
  /**
   * Optional override for tests. Production always records
   * CURRENT_NOTICE_VERSION; a version chosen by the submitter would make the
   * consent record unable to answer "to what".
   */
  noticeVersion?: string;
};

export type LeadResult = { receiptId: string };

/**
 * A short, quotable identifier derived from the row.
 *
 * Derived rather than random so it can be looked up from the id alone, and
 * so re-deriving it never produces a second "stable" reference to the same
 * lead. Uppercase hex is unambiguous when someone reads it back over email.
 */
export function receiptIdFor(leadId: string): string {
  return `YL-${leadId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Content-and-day hash, stored UNIQUE.
 *
 * Deduplication is resolved by the database, not by a check-then-insert in
 * the application: two rapid submissions race, and the loser would otherwise
 * create a second lead and a second receipt for one person. Including the
 * date means the same person genuinely writing again tomorrow is a new lead
 * rather than a silently swallowed one.
 */
export function dedupeKey(input: Pick<LeadInput, "email" | "message" | "intent">, now: Date): string {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${input.email.trim().toLowerCase()}|${input.message.trim()}|${input.intent}|${day}`)
    .digest("hex");
}

/** Where a given intent should land internally. */
export function routeFor(intent: LeadIntent): string {
  switch (intent) {
    case "product":
      return "support";
    case "press":
      return "press";
    case "privacy":
      return "privacy";
    default:
      return "merhaba";
  }
}

type Queryable = Pick<PoolClient, "query">;

/** Just enough of a Pool to be swapped in a test. */
export type Connectable = { connect: () => Promise<PoolClient> };

/**
 * Writes the lead, its consent and both outbox rows atomically.
 *
 * One transaction because the failure modes are asymmetric in a way that
 * matters: a mail provider outage must not lose the lead, and a rejected
 * lead must not send a receipt. Delivery is deliberately NOT inline — the
 * outbox is read by a separate retryable step, so a slow provider cannot
 * hold the request open.
 */
export async function createLead(
  pool: Connectable,
  input: LeadInput,
  { now }: { now: Date },
): Promise<LeadResult> {
  const key = dedupeKey(input, now);

  // A DEDICATED connection, not pool.query().
  //
  // pool.query() acquires a connection per statement and releases it, so
  // BEGIN can land on one connection and the INSERT on another — the INSERT
  // then autocommits and the transaction is fiction. Measured against a real
  // Postgres with max:5 and one connection held busy: a row inserted between
  // BEGIN and ROLLBACK SURVIVED the rollback. Sequential queries on an idle
  // pool reuse the same connection, which is why a test can pass while
  // production, under concurrent submissions, splits a lead from its consent.
  const db = (await pool.connect()) as PoolClient;
  let poisoned = false;

  try {
    await db.query("BEGIN");
    // ON CONFLICT, not SELECT-then-INSERT.
    //
    // The previous version checked for an existing row and then inserted,
    // which is only atomic when something else happens to serialise it.
    // Measured: with max:5, or across two serverless instances — the normal
    // way two near-simultaneous requests are served — one submitter got a
    // 503 from a unique violation for a lead that HAD been stored. The
    // database resolves the race; the application does not try to.
    const inserted = await db.query(
      `INSERT INTO leads (name, email, company, intent, product_slug, message, locale, dedupe_key, created_at, retention_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING id`,
      [
        input.name.trim(),
        input.email.trim(),
        input.company?.trim() || null,
        input.intent,
        input.intent === "product" ? (input.productSlug ?? null) : null,
        input.message.trim(),
        input.locale,
        key,
        now,
        new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
      ],
    );
    if (!inserted.rowCount || !inserted.rows[0]) {
      // Someone else won the race with the identical submission. Return
      // THEIR receipt rather than an error: from the person's point of view
      // their message did arrive, once.
      const existing = await db.query("SELECT id FROM leads WHERE dedupe_key = $1", [key]);
      await db.query("COMMIT");
      return { receiptId: receiptIdFor(existing.rows[0].id) };
    }
    const leadId = inserted.rows[0].id as string;

    await db.query(
      `INSERT INTO lead_consents (lead_id, notice_version, accepted_at, lawful_basis)
       VALUES ($1,$2,$3,'consent')`,
      [leadId, input.noticeVersion ?? CURRENT_NOTICE_VERSION, now],
    );

    // The payload carries only what delivery needs. The message body is NOT
    // copied here: it already lives on the lead, and duplicating personal
    // data into a queue row would give the same text a second home with its
    // own retention story to get wrong.
    const receiptId = receiptIdFor(leadId);
    await db.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json, created_at)
       VALUES ('lead_receipt', $1, $2, $3)`,
      [leadId, JSON.stringify({ receiptId, locale: input.locale }), now],
    );
    await db.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json, created_at)
       VALUES ('lead_internal_route', $1, $2, $3)`,
      [
        leadId,
        JSON.stringify({ receiptId, route: routeFor(input.intent), intent: input.intent }),
        now,
      ],
    );

    await db.query("COMMIT");
    return { receiptId: receiptIdFor(leadId) };
  } catch (error) {
    // A failed ROLLBACK leaves the connection in an aborted transaction.
    // Returning it to the pool hands the next caller a broken one, so it is
    // destroyed instead. BEGIN is inside the try for the same reason: a
    // BEGIN that throws on a server-closed connection previously skipped the
    // finally entirely and leaked the client permanently — at max:1 that
    // bricks the instance.
    let rollbackFailed = false;
    await db.query("ROLLBACK").catch(() => {
      rollbackFailed = true;
    });
    poisoned = rollbackFailed;
    throw error;
  } finally {
    db.release(poisoned ? true : undefined);
  }
}

/**
 * Deletes leads past their retention date. Consents follow by cascade.
 * Returns the count so a scheduled run can be observed rather than assumed.
 */
export async function purgeExpiredLeads(db: Queryable, now: Date): Promise<number> {
  const result = await db.query("DELETE FROM leads WHERE retention_until <= $1", [now]);
  return result.rowCount ?? 0;
}

/**
 * What may be written to a log when a lead write fails.
 *
 * A function rather than an inline console.error so it can be tested with a
 * REAL driver error. The previous test pointed at a missing table, whose
 * 42P01 error contains no personal data at all — so `console.error(…, error)`
 * survived as a mutant and the redaction was never actually exercised.
 *
 * The error that does carry PII is a CHECK violation: pg puts the entire
 * failing row in `detail` ("Failing row contains (…, Kaan,
 * kaan.kocak@example.com, …, secret plans, …)"), and util.inspect — which is
 * what console.error(err) prints — exposes it. Only the class name and the
 * SQLSTATE leave this function.
 */
export function redactWriteFailure(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const name = error instanceof Error ? error.constructor.name : "unknown";
  return code ? `${name}(${code})` : name;
}
