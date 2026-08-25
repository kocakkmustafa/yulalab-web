import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GET } from "@/app/api/mail/route";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";
import { resetPool } from "@/server/db";

const original = { ...process.env };
const localLoginUrl = (schema: string) => {
  const url = new URL(testDatabaseUrl(schema));
  url.username = process.env.USER ?? "postgres";
  return url.toString();
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  delete process.env.CRON_SECRET;
  delete process.env.YULA_INTAKE_DATABASE_URL;
  delete process.env.YULA_MAIL_DATABASE_URL;
  delete process.env.YULA_PURGE_DATABASE_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...original };
});

function get(authorization?: string) {
  return new Request("https://yulalab.com/api/mail", {
    headers: authorization ? { authorization } : {},
  });
}

describe("who may drain the queue", () => {
  it("refuses an anonymous caller", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(get())).status).toBe(401);
  });

  it("refuses a wrong secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(get("Bearer wrong!"))).status).toBe(401);
  });

  it("refuses everyone when no secret is configured, rather than running open", async () => {
    // A deployment that forgot CRON_SECRET must not expose a send endpoint,
    // and must answer identically to a wrong guess so nobody can tell which.
    const unset = await GET(get("Bearer anything"));
    expect(unset.status).toBe(401);
    expect(await unset.json()).toEqual({ drained: null, reason: "unauthorized" });
  });
});

describe("with no database", () => {
  it("says so instead of pretending the queue was empty", async () => {
    // {delivered: 0} would read as "nothing to send" on a monitor.
    process.env.CRON_SECRET = "s3cret";
    const response = await GET(get("Bearer s3cret"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ drained: null, reason: "storage_unavailable" });
  });
});

describe("the schedule", () => {
  it("is registered in vercel.json, because an unrun consumer is the defect", () => {
    // The whole point of this route. purgeExpiredLeads shipped with no
    // caller once already; a drain with no schedule repeats it exactly.
    //
    // Only that an entry EXISTS. Asserting the daily shape would encode the
    // current cadence as the intended one, and it is not: the roadmap's
    // target is a receipt within 60 seconds, and daily is roughly four
    // orders of magnitude off that. Sub-daily cron needs a paid plan, which
    // is a founder gate — so this is an unmet acceptance criterion held
    // open, not a shape to lock in. Nothing published promises faster.
    const config = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "../vercel.json"), "utf8"),
    ) as { crons: { path: string; schedule: string }[] };
    const entry = config.crons.find((c) => c.path === "/api/mail");
    expect(entry).toBeDefined();
    expect(entry!.schedule).toMatch(/^[\d*/ ,-]+$/);
  });
});

describe("when the scheduler actually calls it", () => {
  const SCHEMA = "t_mail_route";

  it("sends what is queued and stamps it, against a real database", async () => {
    // The three tests above stop at 401 and 503. With only those, replacing
    // the drainOutbox call with a hardcoded {delivered: 0, ...} left the
    // whole suite green — this route would have shipped consuming nothing,
    // which is precisely the defect its own docstring atones for.
    const pool = await createIsolatedSchema(SCHEMA);
    try {
      for (const file of [
        "../db/migrations/0002_leads_consents_outbox.sql",
        "../db/migrations/0003_data_request_verification.sql",
      ]) {
        await pool.query(readFileSync(path.resolve(import.meta.dirname, file), "utf8"));
      }
      const { rows } = await pool.query(
        `INSERT INTO leads (name, email, intent, message, locale, dedupe_key)
         VALUES ('Ada', 'ada@example.com', 'studio', 'hello', 'tr', repeat('b', 64))
         RETURNING id`,
      );
      await pool.query(
        `INSERT INTO event_outbox (event_type, aggregate_id, payload_json)
         VALUES ('lead_receipt', $1, '{"receiptId":"YL-1","locale":"tr"}'::jsonb)`,
        [rows[0].id],
      );

      process.env.CRON_SECRET = "s3cret";
      process.env.YULA_INTAKE_DATABASE_URL = "postgres://intake-test@invalid.invalid/yula";
      process.env.YULA_DATABASE_SCHEMA = SCHEMA;
      process.env.YULA_MAIL_DATABASE_URL = localLoginUrl(SCHEMA);
      process.env.YULA_PURGE_DATABASE_URL = "postgres://purge-test@invalid.invalid/yula";
      process.env.LEADS_ENABLED = "1";
      process.env.SENDGRID_API_KEY = "SG.key";
      process.env.MAIL_FROM = "hello@yulalab.com";
      process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-tr";
      process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_EN = "d-en";
      const fetchMock = vi.fn(async () => new Response("", { status: 202 }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await GET(get("Bearer s3cret"));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ delivered: 1, remaining: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const after = await pool.query("SELECT delivered_at FROM event_outbox");
      expect(after.rows[0].delivered_at).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
      await resetPool("mail");
      await dropSchema(pool, SCHEMA);
    }
  });
});

describe("a queue with rows nothing will ever retry", () => {
  const SCHEMA = "t_mail_route_dead";

  it("answers 503 with the counts, not 200 with a clean-looking body", async () => {
    // A row past MAX_ATTEMPTS is a person who will never receive a receipt
    // and nothing will try again. `remaining` carries the same attempts
    // filter as the claim query, so it reads 0 exactly when that becomes
    // permanent — the body looks like an empty, healthy queue.
    const pool = await createIsolatedSchema(SCHEMA);
    try {
      for (const file of [
        "../db/migrations/0002_leads_consents_outbox.sql",
        "../db/migrations/0003_data_request_verification.sql",
      ]) {
        await pool.query(readFileSync(path.resolve(import.meta.dirname, file), "utf8"));
      }
      const { rows } = await pool.query(
        `INSERT INTO leads (name, email, intent, message, locale, dedupe_key)
         VALUES ('Ada', 'ada@example.com', 'studio', 'hello', 'tr', repeat('c', 64))
         RETURNING id`,
      );
      await pool.query(
        `INSERT INTO event_outbox (event_type, aggregate_id, payload_json, attempts)
         VALUES ('lead_receipt', $1, '{"receiptId":"YL-1","locale":"tr"}'::jsonb, 5)`,
        [rows[0].id],
      );

      process.env.CRON_SECRET = "s3cret";
      process.env.YULA_INTAKE_DATABASE_URL = "postgres://intake-test@invalid.invalid/yula";
      process.env.YULA_DATABASE_SCHEMA = SCHEMA;
      process.env.YULA_MAIL_DATABASE_URL = localLoginUrl(SCHEMA);
      process.env.YULA_PURGE_DATABASE_URL = "postgres://purge-test@invalid.invalid/yula";
      process.env.LEADS_ENABLED = "1";
      process.env.SENDGRID_API_KEY = "SG.key";
      process.env.MAIL_FROM = "hello@yulalab.com";
      process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_TR = "d-tr";
      process.env.SENDGRID_TEMPLATE_LEAD_RECEIPT_EN = "d-en";
      vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 202 })));

      const response = await GET(get("Bearer s3cret"));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ dead: 1, remaining: 0, delivered: 0 });
    } finally {
      vi.unstubAllGlobals();
      await resetPool("mail");
      await dropSchema(pool, SCHEMA);
    }
  });
});
