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
    const failing = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (typeof sql === "string" && sql.includes("event_outbox")) {
          throw new Error("outbox unavailable");
        }
        return pool.query(sql, params as never);
      }),
    } as unknown as Pool;

    await expect(createLead(failing, VALID, { now: new Date() })).rejects.toThrow();
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
