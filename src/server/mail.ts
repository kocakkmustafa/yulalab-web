import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  dataRequestTokenKeyForId,
  dataRequestTokenKeyring,
  dataRequestTokenKeyringMissing,
  dataRequestVerificationUrl,
  deriveDataRequestToken,
  tokenHashMatches,
} from "@/server/data-request-token";
import {
  mailIdentityDiagnosticCodes,
  resolveMailIdentity,
  type MailIdentity,
} from "@/server/mail-identity";

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
 * message and the COMMIT that records it is not acknowledged, the database
 * outcome is unknown: the row may remain claimable, or may be committed.
 * A later run can send it again. The alternative — stamping the row before
 * the send — trades a duplicate receipt for a lost one, and a person who
 * receives two acknowledgements is better served than one who receives
 * none.
 */

export const MAX_ATTEMPTS = 5;

/** How long one send may take before it is treated as a failure. */
export const SEND_TIMEOUT_MS = 10_000;

/** Drain size is independent from the daily/pending admission budget. */
export const DRAIN_BATCH_LIMIT = 10;
/** Application guard, not proof of a particular provider's runtime limit. */
export const DRAIN_TIME_BUDGET_MS = 20_000;
export const DRAIN_DB_TIMEOUT_MS = 1_000;
const DRAIN_TAIL_RESERVE_MS = 2_000;
const MIN_ROW_BUDGET_MS = SEND_TIMEOUT_MS + 3 * DRAIN_DB_TIMEOUT_MS;

/** A returned HTTP rejection, unlike a lost response or send timeout. */
export class MailProviderRejectionError extends Error {
  constructor(status: number) {
    super(`sendgrid rejected the message: ${status}`);
    this.name = "MailProviderRejectionError";
  }
}

class MailDrainTimeoutError extends Error {
  constructor(readonly stage: "connect" | "query" | "send") {
    super(`mail ${stage} deadline exceeded`);
    this.name = "MailDrainTimeoutError";
  }
}

type Queryable = {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
};

/** Race one operation only: its late settlement cannot resume row processing. */
async function withinBudget<T>(
  operation: () => Promise<T>,
  deadline: number,
  limitMs: number,
  stage: "connect" | "query" | "send",
  onTimeout: () => void,
): Promise<T> {
  const remaining = Math.min(limitMs, deadline - performance.now());
  if (remaining <= 0) throw new MailDrainTimeoutError(stage);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        onTimeout();
        reject(new MailDrainTimeoutError(stage));
      }, remaining);
      // Both handlers remain attached after timeout, consuming late rejection
      // without allowing it to start a send, stamp, or another SQL statement.
      Promise.resolve().then(operation).then(resolve, reject);
    });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function acquireClient(pool: Pool, deadline: number): Promise<PoolClient> {
  let abandoned = false;
  return withinBudget(async () => {
    const client = await pool.connect();
    if (abandoned || performance.now() >= deadline) {
      client.release(true);
      throw new MailDrainTimeoutError("connect");
    }
    return client;
  }, deadline, DRAIN_DB_TIMEOUT_MS, "connect", () => { abandoned = true; });
}

function boundedQueries(db: PoolClient, deadline: number, onTimeout: () => void): Queryable {
  return {
    query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) {
      return withinBudget(() => db.query<R>(text, values), deadline, DRAIN_DB_TIMEOUT_MS, "query", onTimeout);
    },
  };
}

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
  send(message: MailMessage, options?: { signal?: AbortSignal }): Promise<void>;
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
  /** Failed attempts whose retry counter was committed; see `uncertain`. */
  failed: number;
  /** A started send or provider acceptance could not be durably reconciled. */
  uncertain: number;
  /** Stopped before claiming more work to preserve the total time budget. */
  budgetExhausted: boolean;
  /** Not attempted, because the transport is not configured. */
  skipped: number;
  /** The record this row belonged to is gone, so there is nobody to send to. */
  dropped: number;
  /** This consumer cannot address the message; see `resolveRecipient`. */
  blocked: number;
  /**
   * Deliverable rows still waiting when the run ended. `null` when the run
   * could not measure it — reporting 0 for "I do not know" is the failure
   * this whole file is about.
   *
   * Without it a run that hits DRAIN_BATCH_LIMIT returns the healthiest-looking
   * body possible — {delivered: 10, failed: 0} — while the queue grows
   * behind it and `purge_at` deletes the overflow, undelivered, at thirty
   * days. Same argument as the whole-backlog `blocked` count: a number
   * capped by the batch size reads as steady exactly while it gets worse.
   */
  remaining: number | null;
  /**
   * Rows that exhausted MAX_ATTEMPTS and will never be retried.
   *
   * Without it a permanently dead queue reports perfect health: `remaining`
   * carries the same `attempts < MAX_ATTEMPTS` filter as the claim query, so
   * it falls to zero at the exact moment failure becomes permanent. Two
   * people who will never receive a receipt, and every counter clean.
   *
   * Unambiguous only because a dropped row is now DELETED rather than
   * retired by spending its attempts — otherwise an honoured deletion would
   * be counted here as a delivery failure.
   */
  dead: number | null;
  /**
   * The run stopped early on an unexpected error. The counts above are what
   * DID happen and are reported rather than discarded — a job that
   * half-worked must not report success, and must not report zero either.
   */
  aborted: boolean;
  /**
   * Environment variables that are absent and are holding event types back.
   *
   * Returned rather than merely computed. `missingTemplates()` used to exist
   * "so an operator can see which one is missing" while its only caller was
   * `mailTransport()`, so nothing ever surfaced it: a queue would report
   * `blocked: N` with no way to learn why.
   */
  missingConfig: string[];
}

type Resolution =
  | {
      kind: "send";
      to: string;
      locale: "tr" | "en";
      data?: Record<string, unknown>;
      verification?: { requestId: string; tokenKeyId: string };
    }
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
const HAS_ADDRESS: Record<OutboxEventType, () => boolean> = {
  lead_receipt: () => true,
  lead_internal_route: () => resolveMailIdentity().internalRoute.ready,
  data_request_verification: () => {
    try {
      dataRequestTokenKeyring();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Can this event type be delivered right now?
 *
 * An address AND the templates it needs. Per TYPE rather than globally: the
 * missing internal-route template used to make the whole transport report
 * itself unconfigured, so setting YULA_LEADS_INTERNAL_ADDRESS — a small, low-risk
 * change — silently stopped every customer receipt. A type that is missing
 * something is `blocked`: not sent, not stamped, and no attempt spent, so it
 * resumes the moment the variable is set.
 */
function isDeliverable(type: OutboxEventType): boolean {
  return HAS_ADDRESS[type]() && missingTemplatesFor(type).length === 0;
}

export function deliverableEventTypes(): OutboxEventType[] {
  return (Object.keys(HAS_ADDRESS) as OutboxEventType[]).filter(isDeliverable);
}

/**
 * Env vars that are absent and are holding an addressed event type back.
 *
 * Surfaced through DrainResult, not just consulted here — the previous
 * version documented itself as being "so an operator can see WHICH one is
 * missing" while its only caller was `mailTransport()`, so a queue reported
 * `blocked: N` and no way to find out why.
 */
export function missingTemplates(): string[] {
  const missing = (Object.keys(HAS_ADDRESS) as OutboxEventType[])
    .filter((type) => HAS_ADDRESS[type]())
    .flatMap(missingTemplatesFor);
  const keyringMissing = dataRequestTokenKeyringMissing();
  missing.push(...keyringMissing);
  try {
    dataRequestTokenKeyring();
  } catch {
    if (keyringMissing.length === 0) missing.push("DATA_REQUEST_TOKEN_KEYRING");
  }
  return [...new Set(missing)];
}

export function dataRequestDeliveryMissingConfig(): string[] {
  const missing = dataRequestTokenKeyringMissing();
  if (!process.env.SENDGRID_API_KEY?.trim()) missing.push("SENDGRID_API_KEY");
  const identity = resolveMailIdentity().transport;
  missing.push(...mailIdentityDiagnosticCodes(identity));
  missing.push(...missingTemplatesFor("data_request_verification"));
  try {
    dataRequestTokenKeyring();
  } catch {
    if (missing.length === 0) missing.push("DATA_REQUEST_TOKEN_KEYRING");
  }
  return [...new Set(missing)];
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
async function resolveRecipient(db: Queryable, row: OutboxRow): Promise<Resolution> {
  if (!isDeliverable(row.event_type)) return { kind: "blocked" };

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

    // isDeliverable has already established the address is valid; absent
    // configuration is `blocked` rather than `failed` because there is no
    // provider outage to retry against, and burning attempts would silently
    // discard the notification once the address is finally set.
    const internalRoute = resolveMailIdentity().internalRoute;
    if (!internalRoute.ready) return { kind: "blocked" };
    return { kind: "send", to: internalRoute.value.address, locale: "tr" };
  }

  const locale = row.payload_json.locale;
  if (locale !== "tr" && locale !== "en") return { kind: "blocked" };
  const tokenKeyId = row.payload_json.tokenKeyId;
  if (typeof tokenKeyId !== "string") return { kind: "blocked" };
  const key = dataRequestTokenKeyForId(tokenKeyId);
  if (!key) return { kind: "blocked" };

  const { rows } = await db.query<{
    email: string;
    request_type: string;
    verification_state: string;
    verification_token_hash: string | null;
    verification_token_key_id: string | null;
    verification_queue_expires_at: Date;
  }>(
    `SELECT email, request_type, verification_state, verification_token_hash,
            verification_token_key_id, verification_queue_expires_at
       FROM data_requests
      WHERE id = $1`,
    [row.aggregate_id],
  );
  if (!rows.length || rows[0].verification_state !== "pending") return { kind: "dropped" };
  if (rows[0].verification_token_key_id !== tokenKeyId) return { kind: "blocked" };
  if (new Date(rows[0].verification_queue_expires_at).getTime() <= Date.now()) {
    await db.query(
      `UPDATE data_requests
          SET verification_state = 'expired', verification_token_hash = NULL
        WHERE id = $1 AND verification_state = 'pending'`,
      [row.aggregate_id],
    );
    return { kind: "dropped" };
  }

  const token = deriveDataRequestToken(row.aggregate_id, key.secret);
  if (!tokenHashMatches(token, rows[0].verification_token_hash)) return { kind: "blocked" };

  return {
    kind: "send",
    to: rows[0].email,
    locale,
    data: {
      requestType: rows[0].request_type,
      verificationUrl: dataRequestVerificationUrl(token, locale),
    },
    verification: { requestId: row.aggregate_id, tokenKeyId },
  };
}

/**
 * Claims are serialized by a row lock inside one transaction per message.
 * SKIP LOCKED lets independent workers progress; it does not make an external
 * provider effect exactly-once. A lost send/COMMIT response remains uncertain.
 * No new claim starts without enough headroom for one send and its writes.
 */
export async function drainOutbox(
  pool: Pool,
  transport: MailTransport,
): Promise<DrainResult> {
  const deadline = performance.now() + DRAIN_TIME_BUDGET_MS;
  const workDeadline = deadline - DRAIN_TAIL_RESERVE_MS;
  const result: DrainResult = {
    delivered: 0, failed: 0, uncertain: 0, budgetExhausted: false,
    skipped: 0, dropped: 0, blocked: 0, remaining: null, dead: null,
    aborted: false, missingConfig: [],
  };
  const deliverable = deliverableEventTypes();
  const pending = async () => {
    // Own the connection so a timed-out query can be destroyed rather than
    // silently returning an occupied connection to a serverless pool.
    const db = await acquireClient(pool, deadline);
    let poisoned = false;
    try {
      const { rows } = await boundedQueries(db, deadline, () => { poisoned = true; }).query<{
        deliverable: number; unaddressable: number; dead: number;
      }>(
        `SELECT
           count(*) FILTER (
             WHERE attempts < $1 AND event_type = ANY($2::text[]))::int AS deliverable,
           count(*) FILTER (
             WHERE attempts < $1 AND NOT (event_type = ANY($2::text[])))::int AS unaddressable,
           count(*) FILTER (WHERE attempts >= $1)::int AS dead
         FROM event_outbox WHERE delivered_at IS NULL`,
        [MAX_ATTEMPTS, deliverable],
      );
      if (!rows[0]) throw new Error("outbox counts are unavailable");
      return rows[0];
    } finally {
      db.release(poisoned ? true : undefined);
    }
  };

  // Count the whole backlog, including types that are blocked by config.
  let before: Awaited<ReturnType<typeof pending>>;
  try {
    before = await pending();
  } catch {
    result.aborted = true;
    return result; // Counts remain unknown, never a fabricated empty queue.
  }
  result.blocked = before.unaddressable;
  const identity = resolveMailIdentity();
  result.missingConfig = [...new Set([
    ...mailIdentityDiagnosticCodes(identity.transport),
    ...mailIdentityDiagnosticCodes(identity.internalRoute),
    ...missingTemplates(),
  ])];
  if (!transport.configured) {
    result.skipped = before.deliverable;
    result.remaining = before.deliverable;
    result.dead = before.dead;
    return result;
  }

  const handled: string[] = [];
  for (let i = 0; i < DRAIN_BATCH_LIMIT; i += 1) {
    if (workDeadline - performance.now() < MIN_ROW_BUDGET_MS) {
      result.budgetExhausted = true;
      break;
    }
    let db: PoolClient;
    try {
      db = await acquireClient(pool, workDeadline);
    } catch {
      result.aborted = true;
      break;
    }
    let poisoned = false;
    let providerAccepted = false;
    const queries = boundedQueries(db, workDeadline, () => { poisoned = true; });
    try {
      await queries.query("BEGIN");
      const claimed = await queries.query<OutboxRow>(
        `SELECT id, event_type, aggregate_id, payload_json
           FROM event_outbox
          WHERE delivered_at IS NULL
            AND attempts < $1
            AND id <> ALL($2::uuid[])
            AND event_type = ANY($3::text[])
          ORDER BY created_at, id
          LIMIT 1
          FOR UPDATE SKIP LOCKED`,
        [MAX_ATTEMPTS, handled, deliverable],
      );
      if (!claimed.rowCount) {
        await queries.query("COMMIT");
        break;
      }
      const row = claimed.rows[0];
      handled.push(row.id);
      const resolution = await resolveRecipient(queries, row);
      if (resolution.kind === "blocked") {
        await queries.query("COMMIT");
        result.blocked += 1;
        continue;
      }
      if (resolution.kind === "dropped") {
        await queries.query("DELETE FROM event_outbox WHERE id = $1", [row.id]);
        await queries.query("COMMIT");
        result.dropped += 1;
        continue;
      }

      const controller = new AbortController();
      // Verification needs its sent/expiry update as well as the outbox
      // stamp and COMMIT; ordinary receipts need only the latter two.
      const deliveryWriteBudgetMs = (resolution.verification ? 3 : 2) * DRAIN_DB_TIMEOUT_MS;
      let sendStarted = false;
      try {
        // A transport must honor cancellation when possible. The bounded
        // await also covers a faulty double/provider that ignores the signal.
        await withinBudget(() => {
          sendStarted = true;
          return transport.send({
            outboxId: row.id, eventType: row.event_type, to: resolution.to,
            locale: resolution.locale, data: resolution.data ?? row.payload_json,
          }, { signal: controller.signal });
        }, workDeadline - deliveryWriteBudgetMs,
        SEND_TIMEOUT_MS, "send", () => { controller.abort(); });
        providerAccepted = true;
      } catch (error) {
        if (!sendStarted) {
          result.budgetExhausted = true;
          throw error; // No send started; do not invent a failed attempt.
        }
        // Only an explicit HTTP rejection establishes a known failed send.
        // A generic network error/timeout may follow provider acceptance.
        const uncertain = !(error instanceof MailProviderRejectionError);
        if (uncertain) result.uncertain += 1;
        await queries.query("UPDATE event_outbox SET attempts = attempts + 1 WHERE id = $1", [row.id]);
        await queries.query("COMMIT");
        result.failed += 1;
        if (uncertain) {
          result.aborted = true;
          break; // Never start another send after abandoning one in flight.
        }
        continue;
      }

      if (resolution.verification) {
        const refreshed = await queries.query(
          `UPDATE data_requests
              SET verification_sent_at = COALESCE(verification_sent_at, now()),
                  verification_expires_at = COALESCE(verification_expires_at, now() + interval '24 hours'),
                  purge_at = GREATEST(purge_at, now() + interval '24 hours')
            WHERE id = $1 AND verification_state = 'pending'
              AND verification_token_key_id = $2
            RETURNING verification_sent_at, verification_expires_at`,
          [resolution.verification.requestId, resolution.verification.tokenKeyId],
        );
        if (!refreshed.rowCount) throw new Error("verification delivery state changed after provider acceptance");
      }
      // Keep the database's clock and delivery/expiry writes in one commit.
      await queries.query(
        `UPDATE event_outbox
            SET delivered_at = now(),
                purge_at = GREATEST(purge_at, now() + interval '24 hours')
          WHERE id = $1`,
        [row.id],
      );
      await queries.query("COMMIT");
      result.delivered += 1;
    } catch (error) {
      if (providerAccepted) result.uncertain += 1;
      // A query timeout can leave SQL in flight: do not queue ROLLBACK behind
      // it. Destroy the owned connection. That is not proof of remote SQL
      // cancellation or of the outcome of an unacknowledged COMMIT.
      if (!poisoned) {
        try {
          await withinBudget(() => db.query("ROLLBACK"), deadline,
            DRAIN_DB_TIMEOUT_MS, "query", () => { poisoned = true; });
        } catch {
          poisoned = true;
        }
      }
      console.error("outbox drain aborted", error instanceof Error ? error.name : "unknown");
      result.aborted = true;
    } finally {
      db.release(poisoned ? true : undefined);
    }
    if (result.aborted) break;
  }

  try {
    const after = await pending();
    result.remaining = after.deliverable;
    result.dead = after.dead;
  } catch {
    result.aborted = true; // Preserve completed counts; unknown remains null.
  }
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
  identity: MailIdentity,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = SEND_TIMEOUT_MS,
): MailTransport {
  return {
    configured: true,
    async send(message, options) {
      const response = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        // A fetch that HANGS rather than rejecting would hold this row's
        // transaction until the platform kills the function — `attempts` is
        // never incremented, so the MAX_ATTEMPTS budget covers rejections
        // but not hangs, and `ORDER BY created_at` hands the same row back
        // first on every later run. That is a poison row that blocks the
        // whole queue, deterministically and invisibly.
        signal: options?.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: message.to }],
            custom_args: { yulalab_outbox_id: message.outboxId },
            dynamic_template_data: dynamicTemplateData(message),
          }],
          from: { email: identity.fromEmail, name: identity.fromName },
          reply_to: { email: identity.replyToEmail },
          // The template is chosen by event and rendered by the provider, so
          // no copy — and no message body — passes through here.
          template_id: templateFor(message.eventType, message.locale),
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false },
          },
        }),
      });
      if (!response.ok) {
        // Status only. The provider echoes the recipient address back in its
        // error bodies, and this throw reaches a log.
        throw new MailProviderRejectionError(response.status);
      }
    },
  };
}

function templateFor(eventType: OutboxEventType, locale: "tr" | "en"): string {
  const definition = templateDefinition(eventType, locale);
  if (process.env[definition.envKey] !== definition.templateId) {
    throw new Error("mail template configuration is invalid");
  }
  return definition.templateId;
}

type TemplateDefinition = Readonly<{ envKey: string; templateId: string }>;

const TEMPLATE_CATALOG: Readonly<
  Record<OutboxEventType, Partial<Record<"tr" | "en", TemplateDefinition>>>
> = Object.freeze({
  lead_receipt: Object.freeze({
    tr: Object.freeze({
      envKey: "SENDGRID_TEMPLATE_LEAD_RECEIPT_TR",
      templateId: "d-cef2371a06014280857d0f17e3056305",
    }),
    en: Object.freeze({
      envKey: "SENDGRID_TEMPLATE_LEAD_RECEIPT_EN",
      templateId: "d-d42d50b22fda48e49cfbb6ab373f420e",
    }),
  }),
  lead_internal_route: Object.freeze({
    tr: Object.freeze({
      envKey: "SENDGRID_TEMPLATE_LEAD_INTERNAL_ROUTE_TR",
      templateId: "d-2ce67d70cec249aeab61577361a50572",
    }),
  }),
  data_request_verification: Object.freeze({
    tr: Object.freeze({
      envKey: "SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR",
      templateId: "d-934e79bac8f841dfb7066e169d8f4ffc",
    }),
    en: Object.freeze({
      envKey: "SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN",
      templateId: "d-e9aeeaa9dc8949679777b61eed0f41dc",
    }),
  }),
});

function templateDefinition(
  eventType: OutboxEventType,
  locale: "tr" | "en",
): TemplateDefinition {
  const definition = TEMPLATE_CATALOG[eventType][locale];
  if (!definition) throw new Error("mail template configuration is invalid");
  return definition;
}

function requiredTemplateValue(message: MailMessage, key: string): string {
  const value = message.data[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("mail template data is invalid");
  }
  return value;
}

function dynamicTemplateData(message: MailMessage): Record<string, string> {
  switch (message.eventType) {
    case "lead_receipt":
      return {
        receiptId: requiredTemplateValue(message, "receiptId"),
        locale: message.locale,
      };
    case "lead_internal_route":
      return {
        receiptId: requiredTemplateValue(message, "receiptId"),
        route: requiredTemplateValue(message, "route"),
        intent: requiredTemplateValue(message, "intent"),
      };
    case "data_request_verification":
      return {
        requestType: requiredTemplateValue(message, "requestType"),
        verificationUrl: requiredTemplateValue(message, "verificationUrl"),
      };
  }
}

/** Which locales each deliverable event actually needs a template for. */
const TEMPLATE_LOCALES: Record<OutboxEventType, readonly ("tr" | "en")[]> = {
  // Written to a person, in the language they wrote to us in.
  lead_receipt: ["tr", "en"],
  // Written to our own inbox, which is Turkish.
  lead_internal_route: ["tr"],
  data_request_verification: ["tr", "en"],
};

/**
 * Template env vars this event type needs and does not have.
 *
 * Feeds `isDeliverable`, so a type with no template is BLOCKED rather than
 * attempted. Without that, `configured` was true, SendGrid rejects an empty
 * `template_id`, and on a daily schedule MAX_ATTEMPTS retires every receipt
 * in five days — permanent loss reported as ordinary provider failures.
 *
 * All locales of a type, not one: the claim query filters by event_type, so
 * that is the granularity at which a type can be held back. A receipt with
 * a Turkish template and no English one would otherwise deliver to some
 * people and burn the retries of others.
 */
function missingTemplatesFor(type: OutboxEventType): string[] {
  return TEMPLATE_LOCALES[type]
    .flatMap((locale) => {
      const definition = templateDefinition(type, locale);
      const configured = process.env[definition.envKey];
      if (configured === undefined || configured === "") return [definition.envKey];
      if (configured !== definition.templateId) return [`INVALID_${definition.envKey}`];
      return [];
    });
}

/**
 * The transport this deployment actually has.
 *
 * Unconfigured unless the transport chain is present: key and sender.
 * Templates gate individual event types, not this. `LEADS_ENABLED` gates only
 * new admission: durable rows accepted before intake closes must still drain,
 * otherwise a rollback abandons work the site already promised to process.
 */
export function mailTransport(fetchImpl: typeof fetch = fetch): MailTransport {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const identity = resolveMailIdentity().transport;
  if (!apiKey || !identity.ready) return unconfiguredTransport();
  // Templates are NOT checked here. They gate one event type at a time via
  // isDeliverable, so a missing template blocks that type and leaves the
  // others delivering, rather than taking the whole transport down.
  return sendgridTransport(apiKey, identity.value, fetchImpl);
}
