import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";

const SCHEMA = "t_leads_route";
const ORIGIN = "https://yulalab.com";
let pool: Pool;

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
  process.env.DATABASE_URL = testDatabaseUrl(SCHEMA);
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  const { resetRateLimit } = await import("@/server/rate-limit");
  resetRateLimit();
});

afterEach(async () => {
  const { resetPool } = await import("@/server/db");
  await resetPool();
  delete process.env.DATABASE_URL;
  vi.restoreAllMocks();
});

function body(overrides: Record<string, unknown> = {}) {
  return {
    name: "Kaan",
    email: "someone@example.com",
    intent: "studio",
    message: "We would like to talk about a build.",
    locale: "tr",
    noticeVersion: "2026-08-19",
    consent: true,
    website: "", // honeypot, must stay empty
    ...overrides,
  };
}

async function post(payload: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/leads/route");
  return POST(
    new Request(`${ORIGIN}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

describe("a valid submission", () => {
  it("accepts it and returns a quotable receipt", async () => {
    const res = await post(body());
    expect(res.status).toBe(201);
    const json = (await res.json()) as { receiptId: string };
    expect(json.receiptId).toMatch(/^YL-[0-9A-F]{8}$/);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(1);
  });

  it("returns the same receipt for a double submit and stores one lead", async () => {
    const first = (await (await post(body())).json()) as { receiptId: string };
    const second = (await (await post(body())).json()) as { receiptId: string };
    expect(second.receiptId).toBe(first.receiptId);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(1);
  });
});

describe("rejections", () => {
  it.each([
    ["a malformed email", { email: "not-an-email" }],
    ["a missing name", { name: "  " }],
    ["an empty message", { message: "   " }],
    ["an oversized message", { message: "x".repeat(4001) }],
    ["an unknown intent", { intent: "spam" }],
    ["an unsupported locale", { locale: "de" }],
    ["a missing notice version", { noticeVersion: "" }],
  ])("rejects %s with 400", async (_label, override) => {
    const res = await post(body(override));
    expect(res.status).toBe(400);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(0);
  });

  it("refuses a submission without explicit consent", async () => {
    // Consent is the lawful basis recorded on the row; without it there is
    // nothing to record and no basis to store the person's data at all.
    const res = await post(body({ consent: false }));
    expect(res.status).toBe(400);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(0);
  });

  it("silently accepts but does not store a honeypot submission", async () => {
    // Answering 400 tells a bot exactly which field betrayed it. A 201 with
    // no row costs nothing and teaches nothing.
    const res = await post(body({ website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect((await pool.query("SELECT * FROM leads")).rowCount).toBe(0);
  });

  it("rejects a foreign origin", async () => {
    const res = await post(body(), { origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("rate-limits a flood from one client", async () => {
    let limited = 0;
    for (let i = 0; i < 40; i += 1) {
      const res = await post(body({ message: `attempt ${i}` }), { "x-forwarded-for": "203.0.113.9" });
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });
});

describe("honest failure when storage is unavailable", () => {
  it("does not pretend to have captured the lead", async () => {
    delete process.env.DATABASE_URL;
    const res = await post(body());
    expect(res.status).toBe(503);
    const json = (await res.json()) as { receiptId?: string };
    expect(json.receiptId).toBeUndefined();
  });
});

describe("PII never reaches the logs", () => {
  it("logs no name, email or message when a write fails", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    // Point at a database that exists but has no leads table.
    process.env.DATABASE_URL = testDatabaseUrl("public");
    const res = await post(body({ email: "kaan.kocak@example.com", message: "secret plans" }));
    expect(res.status).toBe(503);
    const logged = errors.join("\n");
    expect(logged).not.toContain("kaan.kocak@example.com");
    expect(logged).not.toContain("secret plans");
    expect(logged).not.toContain("Kaan");
  });
});
