import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { testDatabaseUrl } from "./helpers/attribution-db";
import {
  DATA_REQUEST_TOKEN_CURRENT_KEY_ID_ENV,
  DATA_REQUEST_TOKEN_CURRENT_SECRET_ENV,
  DATA_REQUEST_TOKEN_PREVIOUS_KEY_ID_ENV,
  DATA_REQUEST_TOKEN_PREVIOUS_SECRET_ENV,
} from "@/server/data-request-token";

const SCHEMA = "t_dsr_route";
const ORIGIN = "https://yulalab.com";
const INTAKE_ROLE = "t_dsr_route_intake";
const MAIL_ROLE = "t_dsr_route_mail";
const PURGE_ROLE = "t_dsr_route_purge";
let pool: Pool;
const roleLoginUrl = (schema: string, username: string) => {
  const url = new URL(testDatabaseUrl(schema));
  url.username = username;
  return url.toString();
};

beforeAll(async () => {
  pool = new Pool({ connectionString: testDatabaseUrl(SCHEMA), max: 6 });
  const migrations = [
    "../db/migrations/0001_attribution.sql",
    "../db/migrations/0002_leads_consents_outbox.sql",
    "../db/migrations/0003_data_request_verification.sql",
  ].map((file) => readFileSync(path.resolve(import.meta.dirname, file), "utf8")).join("\n");
  const migration4 = readFileSync(
    path.resolve(import.meta.dirname, "../db/migrations/0004_access_boundary.sql"),
    "utf8",
  );
  await pool.query(`BEGIN;
    DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;
    CREATE SCHEMA ${SCHEMA};
    SET LOCAL search_path = ${SCHEMA};
    ${migrations}
    DROP ROLE IF EXISTS ${INTAKE_ROLE};
    DROP ROLE IF EXISTS ${MAIL_ROLE};
    DROP ROLE IF EXISTS ${PURGE_ROLE};
    CREATE ROLE ${INTAKE_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
    CREATE ROLE ${MAIL_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
    CREATE ROLE ${PURGE_ROLE} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
    SELECT set_config('yulalab.runtime_role', '${INTAKE_ROLE}', false);
    SELECT set_config('yulalab.target_schema', '${SCHEMA}', false);
    SELECT set_config('yulalab.intake_role', '${INTAKE_ROLE}', false);
    SELECT set_config('yulalab.mail_role', '${MAIL_ROLE}', false);
    SELECT set_config('yulalab.purge_role', '${PURGE_ROLE}', false);
    ${migration4}
    COMMIT;
  `);
});

afterAll(async () => {
  await pool.query(`BEGIN;
    DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;
    DROP ROLE IF EXISTS ${INTAKE_ROLE}, ${MAIL_ROLE}, ${PURGE_ROLE};
    COMMIT;`);
  await pool.end();
});

beforeEach(async () => {
  await pool.query("TRUNCATE data_requests, event_outbox CASCADE");
  process.env.YULA_DATABASE_SCHEMA = SCHEMA;
  process.env.YULA_INTAKE_DATABASE_URL = roleLoginUrl(SCHEMA, INTAKE_ROLE);
  process.env.YULA_MAIL_DATABASE_URL = "postgres://mail-test@invalid.invalid/yula";
  process.env.YULA_PURGE_DATABASE_URL = "postgres://purge-test@invalid.invalid/yula";
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  process.env.LEADS_ENABLED = "1";
  process.env[DATA_REQUEST_TOKEN_CURRENT_KEY_ID_ENV] = "2026-08-current";
  process.env[DATA_REQUEST_TOKEN_CURRENT_SECRET_ENV] = "test-only-current-data-request-secret-32-bytes";
  delete process.env[DATA_REQUEST_TOKEN_PREVIOUS_KEY_ID_ENV];
  delete process.env[DATA_REQUEST_TOKEN_PREVIOUS_SECRET_ENV];
  process.env.SENDGRID_API_KEY = "SG.test";
  process.env.MAIL_FROM = "hello@yulalab.com";
  process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR = "d-dsr-tr";
  process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN = "d-dsr-en";
  const { resetRateLimit } = await import("@/server/rate-limit");
  resetRateLimit();
});

afterEach(async () => {
  const { resetPool } = await import("@/server/db");
  await resetPool("intake");
  delete process.env.YULA_INTAKE_DATABASE_URL;
  delete process.env.YULA_MAIL_DATABASE_URL;
  delete process.env.YULA_PURGE_DATABASE_URL;
  delete process.env.YULA_DATABASE_SCHEMA;
  delete process.env.LEADS_ENABLED;
  delete process.env[DATA_REQUEST_TOKEN_CURRENT_KEY_ID_ENV];
  delete process.env[DATA_REQUEST_TOKEN_CURRENT_SECRET_ENV];
  delete process.env[DATA_REQUEST_TOKEN_PREVIOUS_KEY_ID_ENV];
  delete process.env[DATA_REQUEST_TOKEN_PREVIOUS_SECRET_ENV];
  delete process.env.SENDGRID_API_KEY;
  delete process.env.MAIL_FROM;
  delete process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR;
  delete process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN;
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
    const res = await post({ email: "someone@example.com", requestType: "delete", locale: "en" });
    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({ status: "submitted" });
    const { rows } = await pool.query("SELECT verification_state FROM data_requests");
    expect(rows[0].verification_state).toBe("pending");
    const outbox = await pool.query("SELECT payload_json FROM event_outbox");
    expect(outbox.rows[0].payload_json.locale).toBe("en");
  });

  it("answers identically for an address we have never seen", async () => {
    // The property that matters: this endpoint must not become an oracle for
    // who is in the database.
    const known = await post({ email: "someone@example.com", requestType: "access" });
    const unknown = await post({ email: "nobody-here@example.com", requestType: "access" });
    expect(unknown.status).toBe(known.status);
    await expect(unknown.json()).resolves.toEqual(await known.json());
  });

  it("fails honestly with one generic 503 and no row when the write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { resetPool } = await import("@/server/db");
    await resetPool("intake");
    process.env.YULA_DATABASE_SCHEMA = "public";
    process.env.YULA_INTAKE_DATABASE_URL = roleLoginUrl("public", INTAKE_ROLE); // rejected public schema

    const failed = await post({ email: "b@example.com", requestType: "delete" });
    expect(failed.status).toBe(503);
    await expect(failed.json()).resolves.toEqual({ error: "temporarily_unavailable" });
    expect((await pool.query("SELECT 1 FROM data_requests")).rowCount).toBe(0);
  });

  it("requires DB, keyring, provider, sender and both locale templates before writing", async () => {
    const cases: Array<[string, () => void]> = [
      ["database", () => { delete process.env.YULA_INTAKE_DATABASE_URL; }],
      ["key id", () => { delete process.env[DATA_REQUEST_TOKEN_CURRENT_KEY_ID_ENV]; }],
      ["key secret", () => { delete process.env[DATA_REQUEST_TOKEN_CURRENT_SECRET_ENV]; }],
      ["provider", () => { delete process.env.SENDGRID_API_KEY; }],
      ["sender", () => { delete process.env.MAIL_FROM; }],
      ["TR template", () => { delete process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR; }],
      ["EN template", () => { delete process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN; }],
    ];

    for (const [, remove] of cases) {
      remove();
      const response = await post({ email: "blocked@example.com", requestType: "access", locale: "tr" });
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: "temporarily_unavailable" });
      expect((await pool.query("SELECT 1 FROM data_requests")).rowCount).toBe(0);

      process.env.YULA_DATABASE_SCHEMA = SCHEMA;
      process.env.YULA_INTAKE_DATABASE_URL = roleLoginUrl(SCHEMA, INTAKE_ROLE);
      process.env[DATA_REQUEST_TOKEN_CURRENT_KEY_ID_ENV] = "2026-08-current";
      process.env[DATA_REQUEST_TOKEN_CURRENT_SECRET_ENV] = "test-only-current-data-request-secret-32-bytes";
      process.env.SENDGRID_API_KEY = "SG.test";
      process.env.MAIL_FROM = "hello@yulalab.com";
      process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR = "d-dsr-tr";
      process.env.SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN = "d-dsr-en";
      const { resetPool } = await import("@/server/db");
      await resetPool("intake");
    }
  });

  it("still reports shape problems, which are the caller's own mistake", async () => {
    expect((await post({ email: "not-an-email", requestType: "delete" })).status).toBe(400);
    expect((await post({ email: "a@b.co", requestType: "sell" })).status).toBe(400);
    expect((await post({ email: "a@b.co", requestType: "delete", locale: "fr" })).status).toBe(400);
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
    await pool.query(
      `UPDATE data_requests
          SET verification_sent_at = now(),
              verification_expires_at = now() + interval '24 hours'
        WHERE verification_state = 'pending'`,
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
    const { resetPool } = await import("@/server/db");
    await resetPool("intake");
    process.env.YULA_DATABASE_SCHEMA = "public";
    process.env.YULA_INTAKE_DATABASE_URL = roleLoginUrl("public", INTAKE_ROLE);

    await post({ email: "kaan.kocak@example.com", requestType: "delete" });
    const logged = errors.join("\n");
    expect(logged).not.toContain("kaan.kocak@example.com");
  });
});
