import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";

const SCHEMA = "t_dsr_route";
const ORIGIN = "https://yulalab.com";
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
  await pool.query("TRUNCATE data_requests, event_outbox CASCADE");
  process.env.DATABASE_URL = testDatabaseUrl(SCHEMA);
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  process.env.LEADS_ENABLED = "1";
  const { resetRateLimit } = await import("@/server/rate-limit");
  resetRateLimit();
});

afterEach(async () => {
  const { resetPool } = await import("@/server/db");
  await resetPool();
  delete process.env.DATABASE_URL;
  delete process.env.LEADS_ENABLED;
  vi.restoreAllMocks();
});

async function post(payload: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/data-request/route");
  return POST(
    new Request(`${ORIGIN}/api/data-request`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

describe("submitting", () => {
  it("accepts a well-formed request and stores it pending", async () => {
    const res = await post({ email: "someone@example.com", requestType: "delete" });
    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({ status: "submitted" });
    const { rows } = await pool.query("SELECT verification_state FROM data_requests");
    expect(rows[0].verification_state).toBe("pending");
  });

  it("answers identically for an address we have never seen", async () => {
    // The property that matters: this endpoint must not become an oracle for
    // who is in the database.
    const known = await post({ email: "someone@example.com", requestType: "access" });
    const unknown = await post({ email: "nobody-here@example.com", requestType: "access" });
    expect(unknown.status).toBe(known.status);
    await expect(unknown.json()).resolves.toEqual(await known.json());
  });

  it("answers identically even when the write fails", async () => {
    const good = await post({ email: "a@example.com", requestType: "delete" });
    const goodBody = await good.json();

    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.DATABASE_URL = testDatabaseUrl("public"); // no data_requests table
    const { resetPool } = await import("@/server/db");
    await resetPool();

    const failed = await post({ email: "b@example.com", requestType: "delete" });
    expect(failed.status).toBe(good.status);
    await expect(failed.json()).resolves.toEqual(goodBody);
  });

  it("still reports shape problems, which are the caller's own mistake", async () => {
    expect((await post({ email: "not-an-email", requestType: "delete" })).status).toBe(400);
    expect((await post({ email: "a@b.co", requestType: "sell" })).status).toBe(400);
    expect((await post({ email: "a@b.co", requestType: "delete", extra: 1 })).status).toBe(400);
  });
});

describe("verifying", () => {
  it("verifies with the token that was issued", async () => {
    const { createDataRequest } = await import("@/server/data-requests");
    const { token } = await createDataRequest(
      pool,
      { email: "a@b.co", requestType: "delete" },
      { now: new Date() },
    );
    const res = await post({ token });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ verified: true });
  });

  it("answers 200 with verified:false for an unknown token, not 404", async () => {
    // A 404 would tell a caller which links are live.
    const res = await post({ token: "f".repeat(64) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ verified: false });
  });

  it("gives the same answer for a malformed token", async () => {
    const res = await post({ token: "nonsense" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ verified: false });
  });
});

describe("the surface is closed by default", () => {
  it("refuses everything unless collection is enabled", async () => {
    delete process.env.LEADS_ENABLED;
    const res = await post({ email: "a@b.co", requestType: "delete" });
    expect(res.status).toBe(503);
    expect((await pool.query("SELECT * FROM data_requests")).rowCount).toBe(0);
  });
});

describe("abuse controls", () => {
  it("rate-limits a flood without throttling a second client", async () => {
    let limited = 0;
    for (let i = 0; i < 40; i += 1) {
      const res = await post({ email: `x${i}@example.com`, requestType: "access" }, {
        "x-forwarded-for": "203.0.113.9",
      });
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
    const other = await post({ email: "other@example.com", requestType: "access" }, {
      "x-forwarded-for": "198.51.100.4",
    });
    expect(other.status).toBe(202);
  });

  it("rejects a foreign origin", async () => {
    expect((await post({ email: "a@b.co", requestType: "delete" }, { origin: "https://evil.example" })).status).toBe(403);
  });
});

describe("PII stays out of the logs", () => {
  it("logs only a shape when the write fails", async () => {
    const errors: string[] = [];
    const { inspect } = await import("node:util");
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map((a) => (typeof a === "string" ? a : inspect(a))).join(" "));
    });
    process.env.DATABASE_URL = testDatabaseUrl("public");
    const { resetPool } = await import("@/server/db");
    await resetPool();

    await post({ email: "kaan.kocak@example.com", requestType: "delete" });
    const logged = errors.join("\n");
    expect(logged).not.toContain("kaan.kocak@example.com");
  });
});
