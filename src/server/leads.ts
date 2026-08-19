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

export type LeadIntent = "product" | "studio" | "partnership" | "press" | "privacy";

export type LeadInput = {
  name: string;
  email: string;
  company?: string;
  intent: LeadIntent;
  productSlug?: string;
  message: string;
  locale: "tr" | "en";
  /** The dated version of the notice the person actually accepted. */
  noticeVersion: string;
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
  const db: Queryable & { release: () => void } = (await pool.connect()) as PoolClient & {
    release: () => void;
  };

  await db.query("BEGIN");
  try {
    const existing = await db.query("SELECT id FROM leads WHERE dedupe_key = $1", [key]);
    if (existing.rowCount && existing.rows[0]) {
      await db.query("COMMIT");
      return { receiptId: receiptIdFor(existing.rows[0].id) };
    }

    const inserted = await db.query(
      `INSERT INTO leads (name, email, company, intent, product_slug, message, locale, dedupe_key, created_at, retention_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
    const leadId = inserted.rows[0].id as string;

    await db.query(
      `INSERT INTO lead_consents (lead_id, notice_version, accepted_at, lawful_basis)
       VALUES ($1,$2,$3,'consent')`,
      [leadId, input.noticeVersion, now],
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
    await db.query("ROLLBACK").catch(() => {
      /* the original error is the one worth surfacing */
    });
    throw error;
  } finally {
    db.release();
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
