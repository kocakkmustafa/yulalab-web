import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createIsolatedSchema, dropSchema } from "./helpers/attribution-db";
import { drainOutbox, MAX_ATTEMPTS, unconfiguredTransport } from "@/server/mail";
import { createLead } from "@/server/leads";
import type { MailMessage, MailTransport } from "@/server/mail";

/**
 * The outbox consumer.
 *
 * The property everything else serves: a transport that is not configured, or
 * that fails, must NEVER mark a row delivered. A wrongly-delivered row is
 * never retried, so the receipt is lost permanently and nothing anywhere
 * records that it did not arrive — silent success, made worse by a queue.
 */
const SCHEMA = "t_mail";
let pool: Pool;

beforeAll(async () => {
  pool = await createIsolatedSchema(SCHEMA);
  for (const file of [
    "../db/migrations/0002_leads_consents_outbox.sql",
    "../db/migrations/0003_data_request_verification.sql",
  ]) {
    await pool.query(readFileSync(path.resolve(import.meta.dirname, file), "utf8"));
  }
});

afterAll(async () => {
  await dropSchema(pool, SCHEMA);
});

beforeEach(async () => {
  await pool.query("TRUNCATE leads, event_outbox, data_requests CASCADE");
  process.env.LEADS_INTERNAL_ADDRESS = "studio@yulalab.com";
});

let seq = 0;
/** A real lead plus the receipt row createLead() would have queued beside it. */
async function queueReceipt(email = `person${(seq += 1)}@example.com`): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO leads (name, email, intent, message, locale, dedupe_key)
     VALUES ('Ada', $1, 'studio', 'hello', 'tr', $2) RETURNING id`,
    [email, String(seq).padStart(64, "0")],
  );
  const leadId = rows[0].id as string;
  await pool.query(
    `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
     VALUES ('lead_receipt', $1, $2::jsonb)`,
    [leadId, JSON.stringify({ receiptId: `YL-${seq}`, locale: "tr" })],
  );
  return leadId;
}

function transportThat(behaviour: "succeeds" | "fails"): MailTransport & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    configured: true,
    async send(message) {
      if (behaviour === "fails") throw new Error("provider unavailable");
      sent.push(message);
    },
  };
}

describe("an unconfigured transport", () => {
  it("delivers nothing and marks nothing delivered", async () => {
    await queueReceipt();
    await queueReceipt();
    const result = await drainOutbox(pool, unconfiguredTransport());
    expect(result.delivered).toBe(0);
    expect(result.skipped).toBe(2);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM event_outbox WHERE delivered_at IS NULL",
    );
    expect(rows[0].n).toBe(2);
  });

  it("does not burn retry attempts on rows it never tried to send", async () => {
    // Otherwise a month of cron runs against an unconfigured provider would
    // exhaust every row's budget, and the queue would be dead on the morning
    // mail is finally switched on.
    await queueReceipt();
    for (let i = 0; i < 5; i += 1) {
      await drainOutbox(pool, unconfiguredTransport());
    }
    const { rows } = await pool.query("SELECT max(attempts)::int AS a FROM event_outbox");
    expect(rows[0].a).toBe(0);
  });
});

describe("delivery", () => {
  it("sends undelivered rows and stamps them", async () => {
    await queueReceipt();
    await queueReceipt();
    const transport = transportThat("succeeds");
    const result = await drainOutbox(pool, transport);
    expect(result.delivered).toBe(2);
    expect(transport.sent).toHaveLength(2);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM event_outbox WHERE delivered_at IS NULL",
    );
    expect(rows[0].n).toBe(0);
  });

  it("takes no clock from its caller, and stamps after creation", async () => {
    // Named for what it can actually observe. "The database's clock, not
    // the caller's" is unobservable when both clocks agree — which they do
    // in a test — so the ordering assertion below passed just as happily
    // with `SET delivered_at = $2, [new Date()]`, the very thing it was
    // supposed to forbid.
    //
    // What IS checkable is that there is no clock to inject: drainOutbox
    // takes (pool, transport) and nothing else, so reintroducing an
    // `options: { now }` parameter breaks this line rather than sailing
    // past a comment.
    expect(drainOutbox.length).toBe(2);

    const before = new Date();
    await queueReceipt();
    await drainOutbox(pool, transportThat("succeeds"));
    const { rows } = await pool.query("SELECT delivered_at, created_at FROM event_outbox");
    expect(rows[0].delivered_at.getTime()).toBeGreaterThanOrEqual(rows[0].created_at.getTime());
    expect(rows[0].delivered_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("never sends a delivered row twice", async () => {
    await queueReceipt();
    const transport = transportThat("succeeds");
    await drainOutbox(pool, transport);
    await drainOutbox(pool, transport);
    expect(transport.sent).toHaveLength(1);
  });

  it("counts a failure, leaves the row undelivered, and stops hammering a down provider", async () => {
    await queueReceipt();
    await queueReceipt();
    const result = await drainOutbox(pool, transportThat("fails"));
    expect(result.delivered).toBe(0);
    expect(result.failed).toBe(2);

    const { rows } = await pool.query(
      "SELECT attempts, delivered_at FROM event_outbox ORDER BY created_at",
    );
    // One attempt each within a single run — a failing row must not be
    // re-claimed by the same drain, or one bad provider minute would spend
    // every retry a row will ever get.
    expect(rows.map((r) => r.attempts)).toEqual([1, 1]);
    expect(rows.every((r) => r.delivered_at === null)).toBe(true);
  });

  it("gives up after MAX_ATTEMPTS rather than retrying forever", async () => {
    await queueReceipt();
    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) {
      await drainOutbox(pool, transportThat("fails"));
    }
    const { rows } = await pool.query("SELECT attempts FROM event_outbox");
    expect(rows[0].attempts).toBe(MAX_ATTEMPTS);

    const result = await drainOutbox(pool, transportThat("succeeds"));
    expect(result.delivered).toBe(0);
  });
});

describe("a lead that has been deleted", () => {
  it("drops its pending receipt instead of sending it", async () => {
    // The queue holds a pointer, not a copy. Purging the lead — retention or
    // an honoured deletion request — must take the unsent receipt with it.
    const leadId = await queueReceipt();
    await pool.query("DELETE FROM leads WHERE id = $1", [leadId]);

    const transport = transportThat("succeeds");
    const result = await drainOutbox(pool, transport);
    expect(transport.sent).toHaveLength(0);
    expect(result.dropped).toBe(1);
    expect(result.delivered).toBe(0);
  });

  it("does not re-examine the dropped row on every later run", async () => {
    const leadId = await queueReceipt();
    await pool.query("DELETE FROM leads WHERE id = $1", [leadId]);
    await drainOutbox(pool, transportThat("succeeds"));
    const again = await drainOutbox(pool, transportThat("succeeds"));
    expect(again.dropped).toBe(0);

    // ...and it is still not recorded as delivered, because it was not.
    const { rows } = await pool.query("SELECT delivered_at FROM event_outbox");
    expect(rows[0].delivered_at).toBeNull();
  });
});

describe("an event this consumer cannot address", () => {
  it("refuses data_request_verification rather than sending a broken link", async () => {
    // The verification token is sha256 at rest and the plaintext is never
    // persisted, so the link cannot be rebuilt here. Blocking is the honest
    // outcome: not sent, not delivered, and no attempt burned.
    const { rows } = await pool.query(
      `INSERT INTO data_requests (email, request_type, verification_token_hash, verification_expires_at)
       VALUES ('ada@example.com', 'access', repeat('a', 64), now() + interval '1 hour')
       RETURNING id`,
    );
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
       VALUES ('data_request_verification', $1, '{"requestType":"access"}'::jsonb)`,
      [rows[0].id],
    );
    const transport = transportThat("succeeds");
    const result = await drainOutbox(pool, transport);
    expect(transport.sent).toHaveLength(0);
    expect(result.blocked).toBe(1);

    const { rows: after } = await pool.query("SELECT attempts, delivered_at FROM event_outbox");
    expect(after[0].attempts).toBe(0);
    expect(after[0].delivered_at).toBeNull();
  });

  it("blocks an internal route with nowhere to route to", async () => {
    delete process.env.LEADS_INTERNAL_ADDRESS;
    const leadId = await queueReceipt();
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
       VALUES ('lead_internal_route', $1, '{"receiptId":"YL-1","route":"studio","intent":"studio"}'::jsonb)`,
      [leadId],
    );
    const result = await drainOutbox(pool, transportThat("succeeds"));
    expect(result.blocked).toBe(1);
    expect(result.delivered).toBe(1); // the receipt still goes
  });
});

describe("two workers do not send the same message twice", () => {
  it("claims each row exactly once under concurrency", async () => {
    // More than one instance runs in production, and each row must be sent
    // once. This asserts exactly-once, which is the row lock's doing —
    // measured: it still passes with SKIP LOCKED removed, because Postgres
    // re-checks `delivered_at IS NULL` after granting the lock. SKIP LOCKED
    // earns its place on throughput (no worker queues behind another's
    // network call), which is a latency property this cannot assert without
    // becoming a flaky clock test.
    for (let i = 0; i < 6; i += 1) await queueReceipt();
    const a = transportThat("succeeds");
    const b = transportThat("succeeds");
    const [ra, rb] = await Promise.all([
      drainOutbox(pool, a),
      drainOutbox(pool, b),
    ]);
    expect(ra.delivered + rb.delivered).toBe(6);
    const ids = [...a.sent, ...b.sent].map((m) => m.outboxId);
    expect(new Set(ids).size).toBe(6);
  });
});

describe("what reaches the transport", () => {
  it("carries the address it is sent to and the receipt, and no message body", async () => {
    // Queued by the REAL createLead, not by this file's fixture.
    //
    // Asserting "the body is absent" against a payload the test wrote
    // itself proves only that the test did not write one. If createLead
    // started copying `message` into payload_json — the change this is
    // meant to catch — the fixture version stayed green.
    const secret = "please keep this between us";
    await createLead(
      pool,
      {
        name: "Ada",
        email: "ada@example.com",
        intent: "studio",
        message: secret,
        locale: "tr",
      },
      { now: new Date() },
    );

    process.env.LEADS_INTERNAL_ADDRESS = "studio@yulalab.com";
    const transport = transportThat("succeeds");
    await drainOutbox(pool, transport);

    const receipt = transport.sent.find((m) => m.eventType === "lead_receipt");
    expect(receipt?.to).toBe("ada@example.com");
    expect(receipt?.locale).toBe("tr");
    // A receipt says "we have it". It does not quote it — not to the
    // person, and not to the provider.
    expect(JSON.stringify(transport.sent)).not.toContain(secret);
  });
});

describe("a backlog of rows that cannot be addressed", () => {
  it("does not starve the receipts behind it", async () => {
    // data_request_verification is permanently blocked and never retired, so
    // those rows sit at the front of `ORDER BY created_at` until they purge
    // 30 days later. If examining one costs a slot in the batch, a backlog
    // larger than the batch means real receipts are never reached — not this
    // run, and not any later run either, because the backlog does not move.
    const { rows } = await pool.query(
      `INSERT INTO data_requests (email, request_type, verification_token_hash, verification_expires_at)
       VALUES ('ada@example.com', 'access', repeat('a', 64), now() + interval '1 hour')
       RETURNING id`,
    );
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json, created_at)
       SELECT 'data_request_verification', $1, '{"requestType":"access"}'::jsonb,
              now() - interval '1 hour'
         FROM generate_series(1, 120)`,
      [rows[0].id],
    );
    await queueReceipt("ada@example.com");

    const transport = transportThat("succeeds");
    const result = await drainOutbox(pool, transport);
    expect(result.delivered).toBe(1);
    expect(transport.sent[0]?.to).toBe("ada@example.com");

    // And the backlog is reported whole. A count capped at the batch size
    // would sit at 100 while the queue grew past it — the number a monitor
    // watches would go flat exactly as the problem got worse.
    expect(result.blocked).toBe(120);
  });
});

describe("deletion is honoured for every row a lead wrote, not just the receipt", () => {
  it("drops the internal notification too when the lead is gone", async () => {
    // createLead writes TWO outbox rows. Honouring "delete my data" on one
    // and not the other means the studio inbox still receives a
    // notification about a person whose record we promised to erase.
    const leadId = await queueReceipt();
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
       VALUES ('lead_internal_route', $1, '{"receiptId":"YL-1","route":"studio","intent":"studio"}'::jsonb)`,
      [leadId],
    );
    await pool.query("DELETE FROM leads WHERE id = $1", [leadId]);

    const transport = transportThat("succeeds");
    const result = await drainOutbox(pool, transport);
    expect(transport.sent).toHaveLength(0);
    expect(result.dropped).toBe(2);
  });
});

describe("what is left over after a run", () => {
  it("reports the backlog the batch could not reach", async () => {
    // Otherwise 150 queued receipts return {delivered: 100, failed: 0} —
    // the healthiest-looking response body possible while 50 people wait,
    // and purge_at deletes them undelivered at 30 days.
    for (let i = 0; i < 105; i += 1) await queueReceipt();
    const result = await drainOutbox(pool, transportThat("succeeds"));
    expect(result.delivered).toBe(100);
    expect(result.remaining).toBe(5);
  });

  it("is zero when the queue is genuinely empty", async () => {
    await queueReceipt();
    const result = await drainOutbox(pool, transportThat("succeeds"));
    expect(result.remaining).toBe(0);
  });
});

describe("the unconfigured count", () => {
  it("does not inflate 'waiting on credentials' with rows credentials cannot help", async () => {
    const { rows } = await pool.query(
      `INSERT INTO data_requests (email, request_type, verification_token_hash, verification_expires_at)
       VALUES ('ada@example.com', 'access', repeat('a', 64), now() + interval '1 hour')
       RETURNING id`,
    );
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
       SELECT 'data_request_verification', $1, '{"requestType":"access"}'::jsonb
         FROM generate_series(1, 2)`,
      [rows[0].id],
    );
    await queueReceipt();

    const result = await drainOutbox(pool, unconfiguredTransport());
    expect(result.skipped).toBe(1);
    expect(result.blocked).toBe(2);
  });
});

describe("where an internal notification actually goes", () => {
  it("is sent to the configured studio address", async () => {
    // Asserting only that it is 'blocked without an address' leaves the
    // destination itself unanchored: pointing every lead notification at
    // the wrong inbox would not have failed a single test.
    const leadId = await queueReceipt();
    await pool.query(
      `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
       VALUES ('lead_internal_route', $1, '{"receiptId":"YL-1","route":"studio","intent":"studio"}'::jsonb)`,
      [leadId],
    );
    process.env.LEADS_INTERNAL_ADDRESS = "studio@yulalab.com";

    const transport = transportThat("succeeds");
    await drainOutbox(pool, transport);
    const internal = transport.sent.find((m) => m.eventType === "lead_internal_route");
    expect(internal?.to).toBe("studio@yulalab.com");
  });
});
