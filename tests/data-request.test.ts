import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createIsolatedSchema, dropSchema } from "./helpers/attribution-db";
import {
  createDataRequest,
  verifyDataRequest,
  hashToken,
  purgeExpiredVerifications,
} from "@/server/data-requests";

/**
 * A data request is a capability question, not a form question.
 *
 * Acting on an unverified "delete my data" is itself a way to delete
 * somebody else's, so a submission may only ever create a `pending` row, and
 * the token that proves ownership is treated as a secret: hashed at rest,
 * time-limited, and spent on use.
 */
const SCHEMA = "t_data_requests";
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
});

const NOW = new Date("2026-08-19T10:00:00Z");

describe("submitting a request", () => {
  it("creates a pending row and queues a verification message", async () => {
    const { token } = await createDataRequest(
      pool,
      { email: "someone@example.com", requestType: "delete" },
      { now: NOW },
    );
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const { rows } = await pool.query("SELECT * FROM data_requests");
    expect(rows).toHaveLength(1);
    expect(rows[0].verification_state).toBe("pending");
    expect(rows[0].completed_at).toBeNull();

    const outbox = await pool.query("SELECT event_type FROM event_outbox");
    expect(outbox.rows.map((r) => r.event_type)).toEqual(["data_request_verification"]);
  });

  it("never stores the token itself", async () => {
    // The token is a capability: whoever holds it can prove ownership of that
    // address. A database read must not become the ability to verify other
    // people's requests.
    const { token } = await createDataRequest(
      pool,
      { email: "someone@example.com", requestType: "access" },
      { now: NOW },
    );
    const { rows } = await pool.query("SELECT * FROM data_requests");
    expect(JSON.stringify(rows[0])).not.toContain(token);
    expect(rows[0].verification_token_hash).toBe(hashToken(token));
  });

  it("keeps the token out of the queued payload too", async () => {
    // The outbox row would otherwise be a second copy of the secret, with a
    // different retention and nobody watching it.
    const { token } = await createDataRequest(
      pool,
      { email: "someone@example.com", requestType: "delete" },
      { now: NOW },
    );
    const { rows } = await pool.query("SELECT payload_json FROM event_outbox");
    expect(JSON.stringify(rows[0].payload_json)).not.toContain(token);
  });

  it("gives the link a deadline", async () => {
    await createDataRequest(pool, { email: "a@b.co", requestType: "delete" }, { now: NOW });
    // In seconds: pg renders a 24-hour interval as {days: 1}, so asserting
    // on .hours silently read undefined and would have passed for any window.
    const { rows } = await pool.query(
      "SELECT EXTRACT(EPOCH FROM (verification_expires_at - created_at))::int AS seconds FROM data_requests",
    );
    expect(rows[0].seconds).toBe(24 * 60 * 60);
  });
});

describe("verifying", () => {
  it("moves a pending request to verified with the right token", async () => {
    const { token } = await createDataRequest(
      pool,
      { email: "a@b.co", requestType: "delete" },
      { now: NOW },
    );
    const result = await verifyDataRequest(pool, token, { now: NOW });
    expect(result.verified).toBe(true);

    const { rows } = await pool.query("SELECT verification_state FROM data_requests");
    expect(rows[0].verification_state).toBe("verified");
  });

  it("spends the token, so the same link cannot be replayed", async () => {
    const { token } = await createDataRequest(
      pool,
      { email: "a@b.co", requestType: "delete" },
      { now: NOW },
    );
    await verifyDataRequest(pool, token, { now: NOW });
    const { rows } = await pool.query("SELECT verification_token_hash FROM data_requests");
    expect(rows[0].verification_token_hash).toBeNull();

    const second = await verifyDataRequest(pool, token, { now: NOW });
    expect(second.verified).toBe(false);
  });

  it("refuses a token past its deadline", async () => {
    const { token } = await createDataRequest(
      pool,
      { email: "a@b.co", requestType: "delete" },
      { now: NOW },
    );
    const late = new Date(NOW.getTime() + 25 * 60 * 60 * 1000);
    expect((await verifyDataRequest(pool, token, { now: late })).verified).toBe(false);
    const { rows } = await pool.query("SELECT verification_state FROM data_requests");
    expect(rows[0].verification_state).toBe("pending");
  });

  it("refuses an unknown token", async () => {
    await createDataRequest(pool, { email: "a@b.co", requestType: "delete" }, { now: NOW });
    expect((await verifyDataRequest(pool, "f".repeat(64), { now: NOW })).verified).toBe(false);
  });

  it("says the same thing for an unknown token as for a wrong one", async () => {
    // Distinguishing them would turn this endpoint into an oracle for which
    // addresses have requests outstanding.
    const unknown = await verifyDataRequest(pool, "a".repeat(64), { now: NOW });
    const malformed = await verifyDataRequest(pool, "nonsense", { now: NOW });
    expect(unknown).toEqual(malformed);
  });
});

describe("the database refuses impossible states", () => {
  it("will not let a pending request exist without a live token", async () => {
    await expect(
      pool.query(
        "INSERT INTO data_requests (email, request_type, verification_state) VALUES ($1,$2,'pending')",
        ["a@b.co", "delete"],
      ),
    ).rejects.toThrow();
  });

  it("will not keep a token on a request that is no longer pending", async () => {
    await expect(
      pool.query(
        `INSERT INTO data_requests (email, request_type, verification_state, verification_token_hash)
         VALUES ($1,$2,'verified',$3)`,
        ["a@b.co", "delete", "b".repeat(64)],
      ),
    ).rejects.toThrow();
  });

  it("will not complete a request that was never verified", async () => {
    await expect(
      pool.query(
        `INSERT INTO data_requests (email, request_type, verification_state, verification_expires_at, verification_token_hash, completed_at)
         VALUES ($1,$2,'pending',now()+interval '1 day',$3, now())`,
        ["a@b.co", "delete", "c".repeat(64)],
      ),
    ).rejects.toThrow();
  });

  it("will not store a raw token in the hash column", async () => {
    await expect(
      pool.query(
        `INSERT INTO data_requests (email, request_type, verification_state, verification_expires_at, verification_token_hash)
         VALUES ($1,$2,'pending',now()+interval '1 day','not-a-hash')`,
        ["a@b.co", "delete"],
      ),
    ).rejects.toThrow();
  });
});

describe("unverified requests do not linger", () => {
  it("expires a pending request whose window has closed and clears its token", async () => {
    await createDataRequest(pool, { email: "a@b.co", requestType: "delete" }, { now: NOW });
    const expired = await purgeExpiredVerifications(
      pool,
      new Date(NOW.getTime() + 25 * 60 * 60 * 1000),
    );
    expect(expired).toBe(1);
    const { rows } = await pool.query(
      "SELECT verification_state, verification_token_hash FROM data_requests",
    );
    expect(rows[0].verification_state).toBe("expired");
    expect(rows[0].verification_token_hash).toBeNull();
  });

  it("leaves a request still inside its window alone", async () => {
    await createDataRequest(pool, { email: "a@b.co", requestType: "delete" }, { now: NOW });
    expect(await purgeExpiredVerifications(pool, NOW)).toBe(0);
  });
});
