import type { Pool, PoolClient } from "pg";

/**
 * The outbox consumer.
 *
 * `createLead()` and `createDataRequest()` write rows to `event_outbox` in
 * the same transaction as the record they belong to, and stop there. Until
 * something drains that table, every receipt is written and never sent —
 * which is worse than not queueing at all, because the queue makes it look
 * handled.
 *
 * The one property everything below serves: A TRANSPORT THAT IS NOT
 * CONFIGURED, OR THAT FAILS, MUST NEVER MARK A ROW DELIVERED. A row wrongly
 * stamped `delivered_at` is never retried and never appears in any count, so
 * the receipt is lost permanently and nothing records that it did not
 * arrive.
 *
 * Delivery is at-least-once, not exactly-once. If the provider accepts a
 * message and the COMMIT that records it then fails, the row stays claimable
 * and a later run sends it again. The alternative — stamping the row before
 * the send — trades a duplicate receipt for a lost one, and a person who
 * receives two acknowledgements is better served than one who receives
 * none.
 */

export const MAX_ATTEMPTS = 5;

/** How long one send may take before it is treated as a failure. */
export const SEND_TIMEOUT_MS = 10_000;

/** Bounded so one run cannot hold a connection for an unbounded time. */
const BATCH_LIMIT = 100;

export type OutboxEventType =
  | "lead_receipt"
  | "lead_internal_route"
  | "data_request_verification";

export interface MailMessage {
  outboxId: string;
  eventType: OutboxEventType;
  to: string;
  locale: "tr" | "en";
  /** The queued payload: a receipt id and a route. Never a message body. */
  data: Record<string, unknown>;
}

export interface MailTransport {
  /**
   * Whether this transport can actually deliver. Read BEFORE any row is
   * claimed: an unconfigured provider must not consume the retry budget of
   * rows it never attempted, or a month of scheduled runs against a site
   * with no mail credentials would leave every row dead on the morning the
   * credentials arrive.
   */
  readonly configured: boolean;
  send(message: MailMessage): Promise<void>;
}

export function unconfiguredTransport(): MailTransport {
  return {
    configured: false,
    async send() {
      throw new Error("mail transport is not configured");
    },
  };
}

export interface DrainResult {
  /** Handed to the provider and stamped. */
  delivered: number;
  /** Attempted and refused by the provider; retried on a later run. */
  failed: number;
  /** Not attempted, because the transport is not configured. */
  skipped: number;
  /** The record this row belonged to is gone, so there is nobody to send to. */
  dropped: number;
  /** This consumer cannot address the message; see `resolveRecipient`. */
  blocked: number;
  /**
   * Deliverable rows still waiting when the run ended.
   *
   * Without it a run that hits BATCH_LIMIT returns the healthiest-looking
   * body possible — {delivered: 100, failed: 0} — while the queue grows
   * behind it and `purge_at` deletes the overflow, undelivered, at thirty
   * days. Same argument as the whole-backlog `blocked` count: a number
   * capped by the batch size reads as steady exactly while it gets worse.
   */
  remaining: number;
  /**
   * The run stopped early on an unexpected error. The counts above are what
   * DID happen and are reported rather than discarded — a job that
   * half-worked must not report success, and must not report zero either.
   */
  aborted: boolean;
}

type Resolution =
  | { kind: "send"; to: string; locale: "tr" | "en" }
  | { kind: "dropped" }
  | { kind: "blocked" };

interface OutboxRow {
  id: string;
  event_type: OutboxEventType;
  aggregate_id: string;
  payload_json: Record<string, unknown>;
}

/**
 * Which event types this consumer can currently put an address on.
 *
 * ONE declaration, read from two places: the claim query filters on it, and
 * `resolveRecipient` refuses anything it excludes. Two lists would drift —
 * and the drift is silent in the worst direction, because a type the query
 * claims but the resolver blocks is a row that costs a batch slot forever.
 */
const ADDRESSABLE: Record<OutboxEventType, () => boolean> = {
  lead_receipt: () => true,
  lead_internal_route: () => Boolean(process.env.LEADS_INTERNAL_ADDRESS?.trim()),
  // See resolveRecipient: the verification token is sha256 at rest, so the
  // link cannot be rebuilt here. Never deliverable until that is decided.
  data_request_verification: () => false,
};

export function deliverableEventTypes(): OutboxEventType[] {
  return (Object.keys(ADDRESSABLE) as OutboxEventType[]).filter((t) => ADDRESSABLE[t]());
}

/**
 * Where does this message go?
 *
 * The queue stores a POINTER (`aggregate_id`), never a copy of the address.
 * That is what makes deletion honest: purge a lead and its pending receipt
 * has nothing left to address, so it is dropped rather than sent. Had the
 * address been copied into the payload, an honoured "delete my data" would
 * still have left a live address sitting in a queue for thirty days.
 */
async function resolveRecipient(db: PoolClient, row: OutboxRow): Promise<Resolution> {
  if (!ADDRESSABLE[row.event_type]()) return { kind: "blocked" };

  if (row.event_type === "lead_receipt") {
    const { rows } = await db.query<{ email: string; locale: "tr" | "en" }>(
      "SELECT email, locale FROM leads WHERE id = $1",
      [row.aggregate_id],
    );
    if (!rows.length) return { kind: "dropped" };
    return { kind: "send", to: rows[0].email, locale: rows[0].locale };
  }

  if (row.event_type === "lead_internal_route") {
    // The lead must still exist, exactly as for the receipt above.
    //
    // createLead writes TWO rows. Checking one and not the other honours a
    // deletion request halfway: the person's receipt is dropped while the
    // studio inbox is still told about them. The address here is ours, not
    // theirs, which is what made it look like the check did not apply — but
    // the NOTIFICATION is about a record we promised to erase.
    const { rowCount } = await db.query("SELECT 1 FROM leads WHERE id = $1", [row.aggregate_id]);
    if (!rowCount) return { kind: "dropped" };

    // ADDRESSABLE has already established the address is set; absent
    // configuration is `blocked` rather than `failed` because there is no
    // provider outage to retry against, and burning attempts would silently
    // discard the notification once the address is finally set.
    return { kind: "send", to: process.env.LEADS_INTERNAL_ADDRESS!.trim(), locale: "tr" };
  }

  // data_request_verification, unreachable via ADDRESSABLE and kept as the
  // explanation for why.
  //
  // Blocked BY DESIGN, and this is the honest outcome rather than a gap left
  // open. The verification token is sha256 at rest and the plaintext is
  // returned once to the caller and never persisted (`src/server/
  // data-requests.ts`), so the link in this mail cannot be rebuilt here.
  // Closing it means choosing between putting a live credential in a queued
  // payload for thirty days and sending at creation time, which gives up the
  // outbox's guarantee — a decision, not a detail. Until it is made this
  // consumer refuses the row: nothing sent, nothing stamped, no attempt
  // spent. A verification mail with a broken link is worse than none.
  return { kind: "blocked" };
}

/**
 * Sends what is pending and returns what happened.
 *
 * Rows are claimed one at a time with FOR UPDATE SKIP LOCKED, one row per
 * transaction, so the lock is held across a single send rather than the
 * whole run.
 *
 * What each half actually buys, measured rather than assumed — dropping
 * SKIP LOCKED and re-running the concurrency test passes:
 *
 *   FOR UPDATE gives exactly-once. A second worker blocks on the lock, and
 *   under READ COMMITTED Postgres re-evaluates `delivered_at IS NULL` once
 *   the lock is granted — so after the first worker commits, the row no
 *   longer matches and the second skips it. The lock, not SKIP LOCKED, is
 *   what stops one person getting two receipts.
 *
 *   SKIP LOCKED gives liveness. The lock is held across a network call to
 *   the mail provider; without it every other worker queues behind the
 *   slowest send in flight, and N instances do the work of one.
 */
export async function drainOutbox(
  pool: Pool,
  transport: MailTransport,
): Promise<DrainResult> {
  const result: DrainResult = {
    delivered: 0,
    failed: 0,
    skipped: 0,
    dropped: 0,
    blocked: 0,
    remaining: 0,
    aborted: false,
  };

  const deliverable = deliverableEventTypes();
  const pending = async () => {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT
         count(*) FILTER (WHERE event_type = ANY($2::text[]))::int      AS deliverable,
         count(*) FILTER (WHERE NOT (event_type = ANY($2::text[])))::int AS unaddressable
       FROM event_outbox
       WHERE delivered_at IS NULL AND attempts < $1`,
      [MAX_ATTEMPTS, deliverable],
    );
    return rows[0] as unknown as { deliverable: number; unaddressable: number };
  };

  // The whole backlog, not the handful that fitted in one batch.
  //
  // Blocked rows are never retired, so they sit at the front of
  // `ORDER BY created_at` until they purge thirty days later. Examining one
  // used to cost a slot in the batch — so a backlog larger than BATCH_LIMIT
  // meant real receipts were never reached, not on that run and not on any
  // later run either, because the backlog does not move. The claim query
  // excludes them in SQL instead: the batch bounds WORK DONE, not rows
  // looked at.
  const before = await pending();
  result.blocked = before.unaddressable;

  if (!transport.configured) {
    // Only the rows credentials would actually help. Counting the
    // permanently-unaddressable ones here too would inflate the one number
    // that means "mail is waiting on the founder gate".
    result.skipped = before.deliverable;
    result.remaining = before.deliverable;
    return result;
  }

  // Rows this run has already handled. A failed row stays claimable — that
  // is the point of the retry — but must not be re-claimed by the SAME run,
  // or one bad provider minute would spend every attempt a row will ever
  // get, in a loop, in seconds.
  const handled: string[] = [];

  for (let i = 0; i < BATCH_LIMIT; i += 1) {
    const db = (await pool.connect()) as PoolClient;
    let poisoned = false;
    try {
      await db.query("BEGIN");
      const claimed = await db.query<OutboxRow>(
        `SELECT id, event_type, aggregate_id, payload_json
           FROM event_outbox
          WHERE delivered_at IS NULL
            AND attempts < $1
            AND id <> ALL($2::uuid[])
            AND event_type = ANY($3::text[])
          ORDER BY created_at
          LIMIT 1
          FOR UPDATE SKIP LOCKED`,
        [MAX_ATTEMPTS, handled, deliverable],
      );
      if (!claimed.rowCount) {
        await db.query("COMMIT");
        break;
      }

      const row = claimed.rows[0];
      handled.push(row.id);
      const resolution = await resolveRecipient(db, row);

      if (resolution.kind === "blocked") {
        // Unreachable while ADDRESSABLE and the claim query agree, which is
        // the point of them sharing one declaration. Left in because the
        // alternative to refusing here is sending to an address we do not
        // have; counted, not silently skipped.
        await db.query("COMMIT");
        result.blocked += 1;
        continue;
      }

      if (resolution.kind === "dropped") {
        // Retire it without claiming it was delivered — because it was not.
        // `delivered_at` stays NULL so the row never counts as sent; the
        // attempt budget is spent so no later run keeps looking for a record
        // that no longer exists. The row itself still purges on schedule.
        await db.query("UPDATE event_outbox SET attempts = $1 WHERE id = $2", [
          MAX_ATTEMPTS,
          row.id,
        ]);
        await db.query("COMMIT");
        result.dropped += 1;
        continue;
      }

      try {
        await transport.send({
          outboxId: row.id,
          eventType: row.event_type,
          to: resolution.to,
          locale: resolution.locale,
          data: row.payload_json,
        });
      } catch {
        // The provider's error is deliberately not carried further: it can
        // quote the recipient address back in its message, and this runs on
        // a path that logs. The count is what a caller needs.
        await db.query("UPDATE event_outbox SET attempts = attempts + 1 WHERE id = $1", [row.id]);
        await db.query("COMMIT");
        result.failed += 1;
        continue;
      }

      // now(), not a timestamp passed in from the caller.
      //
      // `created_at` is written by the database, and `delivered_after_creation`
      // compares the two. An injected clock that is even slightly behind — a
      // value captured before the row was written, a container whose time has
      // drifted — makes EVERY delivery fail that check, and the rejection
      // escapes the per-row handler and stops the whole run. One clock skew
      // would take the queue down. This is the same two-sources-for-one-time
      // drift that migration 0002 removed from `retention_until`; the fix is
      // the same one: let the clock that wrote the row write the stamp.
      await db.query("UPDATE event_outbox SET delivered_at = now() WHERE id = $1", [row.id]);
      await db.query("COMMIT");
      result.delivered += 1;
    } catch (error) {
      let rollbackFailed = false;
      await db.query("ROLLBACK").catch(() => {
        rollbackFailed = true;
      });
      poisoned = rollbackFailed;
      // Name only: a driver error can quote the row it was working on, and
      // that row points at a person.
      console.error("outbox drain aborted", error instanceof Error ? error.name : "unknown");
      result.aborted = true;
    } finally {
      db.release(poisoned ? true : undefined);
    }
    if (result.aborted) break;
  }

  result.remaining = (await pending()).deliverable;
  return result;
}

/**
 * SendGrid.
 *
 * ⚠️ THE PROVIDER CALL ITSELF IS UNVERIFIED. No mail has been sent through
 * this function. Sending needs an API key and SPF/DKIM/DMARC on the domain,
 * both founder gates, so "SendGrid accepts this request shape" is a claim
 * this session cannot make. What IS covered by tests is the part that can
 * hurt: a non-2xx must throw rather than count as delivered, and the API key
 * must not travel in an error. `fetchImpl` is injected for exactly that.
 */
export function sendgridTransport(
  apiKey: string,
  from: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = SEND_TIMEOUT_MS,
): MailTransport {
  return {
    configured: true,
    async send(message) {
      const response = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        // A fetch that HANGS rather than rejecting would hold this row's
        // transaction until the platform kills the function — `attempts` is
        // never incremented, so the MAX_ATTEMPTS budget covers rejections
        // but not hangs, and `ORDER BY created_at` hands the same row back
        // first on every later run. That is a poison row that blocks the
        // whole queue, deterministically and invisibly.
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: message.to }] }],
          from: { email: from },
          // The template is chosen by event and rendered by the provider, so
          // no copy — and no message body — passes through here.
          template_id: templateFor(message.eventType, message.locale),
          dynamic_template_data: message.data,
        }),
      });
      if (!response.ok) {
        // Status only. The provider echoes the recipient address back in its
        // error bodies, and this throw reaches a log.
        throw new Error(`sendgrid rejected the message: ${response.status}`);
      }
    },
  };
}

function templateKey(eventType: OutboxEventType, locale: "tr" | "en"): string {
  return `SENDGRID_TEMPLATE_${eventType.toUpperCase()}_${locale.toUpperCase()}`;
}

function templateFor(eventType: OutboxEventType, locale: "tr" | "en"): string {
  return process.env[templateKey(eventType, locale)] ?? "";
}

/** Which locales each deliverable event actually needs a template for. */
const TEMPLATE_LOCALES: Record<OutboxEventType, readonly ("tr" | "en")[]> = {
  // Written to a person, in the language they wrote to us in.
  lead_receipt: ["tr", "en"],
  // Written to our own inbox, which is Turkish.
  lead_internal_route: ["tr"],
  data_request_verification: [],
};

/**
 * Env vars a deliverable event type needs and does not have.
 *
 * Exported so an operator can see WHICH one is missing. Without this the
 * failure is silent and expensive: with a key and a sender but no template,
 * `configured` would be true, SendGrid rejects an empty `template_id`, and
 * on a daily schedule MAX_ATTEMPTS retires every receipt in five days —
 * permanent loss, reported as ordinary provider failures.
 */
export function missingTemplates(): string[] {
  return deliverableEventTypes().flatMap((type) =>
    TEMPLATE_LOCALES[type]
      .filter((locale) => !templateFor(type, locale))
      .map((locale) => templateKey(type, locale)),
  );
}

/**
 * The transport this deployment actually has.
 *
 * Unconfigured unless the whole chain is present — key, sender AND the
 * templates every deliverable event needs. `LEADS_ENABLED` is in the
 * condition on purpose: the surface that WRITES leads is closed until legal
 * review, and a consumer that would send mail for a form nobody can submit
 * is a way to discover, later and by accident, that one of the two switches
 * was flipped alone.
 */
export function mailTransport(fetchImpl: typeof fetch = fetch): MailTransport {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (process.env.LEADS_ENABLED !== "1" || !apiKey || !from) return unconfiguredTransport();
  // The templates are part of the chain, not a detail. See missingTemplates.
  if (missingTemplates().length > 0) return unconfiguredTransport();
  return sendgridTransport(apiKey, from, fetchImpl);
}
