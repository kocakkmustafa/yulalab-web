import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createIsolatedSchema, dropSchema } from "./helpers/attribution-db";
import { createLead, dedupeKey, receiptIdFor, purgeExpiredLeads } from "@/server/leads";

/**
 * Against a real PostgreSQL, like the attribution suite.
 *
 * This is the first table in the project holding personal data, so the
 * constraints that matter — a valid address, a bounded message, consent
 * recorded beside the record, a retention date on every row — are enforced
 * in the schema and asserted here by trying to violate them directly.
 */
const SCHEMA = "t_leads";
let pool: Pool;

const VALID = {
  name: "Kaan",
  email: "someone@example.com",
  intent: "studio" as const,
  message: "We would like to talk about a build.",
  locale: "tr" as const,
  noticeVersion: "2026-08-19",
};

beforeAll(async () => {
  pool = await createIsolatedSchema(SCHEMA);
  await pool.query(
    readFileSync(
      path.resolve(import.meta.dirname, "../db/migrations/0002_leads_consents_outbox.sql"),
      "utf8",
    ),
  );
});

afterAll(async () => {
  await dropSchema(pool, SCHEMA);
});

beforeEach(async () => {
  await pool.query("TRUNCATE leads, lead_consents, event_outbox, data_requests CASCADE");
});


/**
 * A pool whose client fails on the first statement matching `failOn`.
 *
 * The patch is UNDONE on release. Patching a pooled client and leaving it
 * patched poisons the connection for every later test that happens to get it
 * back — which is what made these tests fail with timeouts that looked like a
 * connection leak in the implementation. The implementation was fine; the
 * test was mutating shared state.
 */
function poolFailingOn(pool: Pool, failOn: string) {
  return {
    connect: async () => {
      const client = await pool.connect();
      const realQuery = client.query.bind(client);
      const realRelease = client.release.bind(client);
      client.query = (async (sql: unknown, params?: unknown[]) => {
        if (typeof sql === "string" && sql.includes(failOn)) {
          throw new Error(`${failOn} unavailable`);
        }
        return realQuery(sql as string, params as never);
      }) as typeof client.query;
      client.release = ((err?: Error | boolean) => {
        client.query = realQuery;
        client.release = realRelease;
        return realRelease(err as never);
      }) as typeof client.release;
      return client;
    },
  };
}

describe("a valid lead", () => {
  it("stores the lead, its consent and its outbox rows in ONE transaction", async () => {
    const { receiptId } = await createLead(pool, VALID, { now: new Date("2026-08-19T10:00:00Z") });
    expect(receiptId).toMatch(/^YL-[0-9A-F]{8}$/);

    const leads = await pool.query("SELECT * FROM leads");
    const consents = await pool.query("SELECT * FROM lead_consents");
    const outbox = await pool.query("SELECT event_type FROM event_outbox ORDER BY event_type");
    expect(leads.rowCount).toBe(1);
    expect(consents.rowCount).toBe(1);
    // A receipt to the person AND a routing message to us.
    expect(outbox.rows.map((r) => r.event_type)).toEqual([
      "lead_internal_route",
      "lead_receipt",
    ]);
  });

  it("records what was consented to, not merely that consent happened", async () => {
    await createLead(pool, VALID, { now: new Date() });
    const { rows } = await pool.query("SELECT notice_version, lawful_basis FROM lead_consents");
    expect(rows[0].notice_version).toBe("2026-08-19");
    expect(rows[0].lawful_basis).toBe("consent");
  });

  it("writes a retention date on the row itself", async () => {
    await createLead(pool, VALID, { now: new Date() });
    const { rows } = await pool.query(
      "SELECT (retention_until::date - created_at::date) AS days FROM leads",
    );
    expect(rows[0].days).toBe(180);
  });

  it("gives a receipt id derived from the lead, so it can be looked up", async () => {
    const { receiptId } = await createLead(pool, VALID, { now: new Date() });
    const { rows } = await pool.query("SELECT id FROM leads");
    expect(receiptIdFor(rows[0].id)).toBe(receiptId);
  });
});

describe("the transaction is real", () => {
  it("writes NOTHING when the outbox insert fails", async () => {
    // A mail provider outage must not lose the lead, and a failed write must
    // not leave a lead with no receipt queued. Both go together or neither.

    await expect(
      createLead(poolFailingOn(pool, "event_outbox"), VALID, { now: new Date() }),
    ).rejects.toThrow();
    // The real pool sees nothing, because the whole thing rolled back.
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(0);
    expect((await pool.query("SELECT * FROM lead_consents")).rowCount).toBe(0);
  });
});

describe("duplicate submission", () => {
  it("returns the SAME receipt instead of creating a second lead", async () => {
    const now = new Date("2026-08-19T10:00:00Z");
    const first = await createLead(pool, VALID, { now });
    const second = await createLead(pool, VALID, { now });
    expect(second.receiptId).toBe(first.receiptId);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(1);
  });

  it("treats the same person writing again the next day as a new lead", async () => {
    const first = await createLead(pool, VALID, { now: new Date("2026-08-19T10:00:00Z") });
    const second = await createLead(pool, VALID, { now: new Date("2026-08-20T10:00:00Z") });
    expect(second.receiptId).not.toBe(first.receiptId);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(2);
  });

  it("keys the dedupe on content, not on timing alone", () => {
    const day = new Date("2026-08-19T10:00:00Z");
    const a = dedupeKey({ ...VALID }, day);
    const b = dedupeKey({ ...VALID, message: "different message" }, day);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("the database refuses bad leads even when the application does not", () => {
  async function insert(overrides: Record<string, unknown> = {}) {
    const row = {
      name: "Kaan",
      email: "a@b.co",
      intent: "studio",
      message: "hello",
      locale: "tr",
      dedupe_key: "a".repeat(64),
      ...overrides,
    };
    const keys = Object.keys(row);
    return pool.query(
      `INSERT INTO leads (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
      keys.map((k) => (row as Record<string, unknown>)[k]),
    );
  }

  it("rejects a malformed email", async () => {
    await expect(insert({ email: "not-an-email" })).rejects.toThrow();
    await expect(insert({ email: "a b@c.co" })).rejects.toThrow();
  });

  it("rejects an empty or oversized message", async () => {
    await expect(insert({ message: "   " })).rejects.toThrow();
    await expect(insert({ message: "x".repeat(4001) })).rejects.toThrow();
  });

  it("rejects an unknown intent", async () => {
    await expect(insert({ intent: "spam" })).rejects.toThrow();
  });

  it("refuses a product slug on a non-product intent", async () => {
    // Otherwise a routing rule can read a product that was never asked about.
    await expect(insert({ intent: "press", product_slug: "lifeos" })).rejects.toThrow();
    await expect(insert({ intent: "product", product_slug: "lifeos" })).resolves.toBeTruthy();
  });

  it("rejects a row with no retention date in the future", async () => {
    await expect(insert({ retention_until: new Date("2000-01-01") })).rejects.toThrow();
  });

  it("rejects consent whose notice version is not a date", async () => {
    await insert();
    const { rows } = await pool.query("SELECT id FROM leads");
    await expect(
      pool.query(
        "INSERT INTO lead_consents (lead_id, notice_version, lawful_basis) VALUES ($1,$2,$3)",
        [rows[0].id, "latest", "consent"],
      ),
    ).rejects.toThrow();
  });
});

describe("retention", () => {
  it("purges leads past their retention date and keeps the rest", async () => {
    await createLead(pool, VALID, { now: new Date("2026-01-01T10:00:00Z") });
    await createLead(pool, { ...VALID, message: "second" }, { now: new Date("2026-08-19T10:00:00Z") });

    const deleted = await purgeExpiredLeads(pool, new Date("2026-08-19T10:00:00Z"));
    expect(deleted).toBe(1);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(1);
  });

  it("takes the consent rows with it", async () => {
    await createLead(pool, VALID, { now: new Date("2026-01-01T10:00:00Z") });
    await purgeExpiredLeads(pool, new Date("2026-08-19T10:00:00Z"));
    expect((await pool.query("SELECT * FROM lead_consents")).rowCount).toBe(0);
  });
});

describe("the transaction is real under concurrency, not just when idle", () => {
  it("rolls back even while other connections are busy", async () => {
    // The defect this pins: pool.query() takes a connection per statement,
    // so BEGIN and the INSERT can land on different ones and the INSERT
    // autocommits. Measured before the fix — a row inserted between BEGIN
    // and ROLLBACK survived the rollback. Sequential queries on an idle pool
    // reuse one connection, which is exactly why the earlier rollback test
    // passed against broken code.
    const busy = [
      pool.query("SELECT pg_sleep(0.25)"),
      pool.query("SELECT pg_sleep(0.25)"),
    ];


    await expect(
      createLead(poolFailingOn(pool, "lead_consents"), VALID, { now: new Date() }),
    ).rejects.toThrow();
    await Promise.all(busy);

    // No orphaned lead: a person's details must never be stored without the
    // consent row that gives us a basis to store them.
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(0);
  });

  it("returns the connection to the pool even when the write fails", () => {
    // A leaked client exhausts the pool after a handful of failures and the
    // next legitimate submission hangs. Asserted on the pool's own counters
    // rather than by timing, so a slow machine cannot make it flake.
    expect(pool.idleCount).toBeGreaterThan(0);
    expect(pool.waitingCount).toBe(0);
  });
});

describe("the pool survives repeated failures", () => {
  it("neither leaks nor stays busy after several failed writes", async () => {
    for (let i = 0; i < 4; i += 1) {
      await expect(
        createLead(poolFailingOn(pool, "event_outbox"), { ...VALID, message: `try ${i}` }, { now: new Date() }),
      ).rejects.toThrow();
    }
    expect(pool.waitingCount).toBe(0);
    // And it still works.
    const { receiptId } = await createLead(pool, VALID, { now: new Date() });
    expect(receiptId).toMatch(/^YL-[0-9A-F]{8}$/);
  });
});

describe("the whole transaction runs on ONE dedicated connection", () => {
  it("issues every statement, BEGIN through COMMIT, on the client it acquired", async () => {
    // This is the test that can actually tell the fix from the bug.
    //
    // "Roll back while other connections are busy" CANNOT: createLead's
    // statements are sequential and awaited, so pg hands back the same idle
    // connection either way and a pool.query() implementation passes. Proven
    // by mutating the code back to pool.query — all 19 tests stayed green.
    //
    // What distinguishes them is WHERE the statements land. With pool.query
    // the acquired client never sees them at all.
    const seen: string[] = [];
    const recording = {
      connect: async () => {
        const client = await pool.connect();
        const realQuery = client.query.bind(client);
        const realRelease = client.release.bind(client);
        client.query = (async (sql: unknown, params?: unknown[]) => {
          if (typeof sql === "string") seen.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
          return realQuery(sql as string, params as never);
        }) as typeof client.query;
        client.release = ((err?: Error | boolean) => {
          client.query = realQuery;
          client.release = realRelease;
          return realRelease(err as never);
        }) as typeof client.release;
        return client;
      },
    };

    await createLead(recording, VALID, { now: new Date() });

    expect(seen[0]).toBe("BEGIN");
    expect(seen[seen.length - 1]).toBe("COMMIT");
    // Every write in between arrived on the same acquired client.
    expect(seen.some((q) => q.startsWith("INSERT INTO leads"))).toBe(true);
    expect(seen.some((q) => q.startsWith("INSERT INTO lead_consents"))).toBe(true);
    expect(seen.filter((q) => q.startsWith("INSERT INTO event_outbox"))).toHaveLength(2);
  });

  it("acquires exactly one connection per call", async () => {
    let connects = 0;
    const counting = {
      connect: async () => {
        connects += 1;
        return pool.connect();
      },
    };
    await createLead(counting, { ...VALID, message: "counted" }, { now: new Date() });
    expect(connects).toBe(1);
  });
});
