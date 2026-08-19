import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";
import { recordAttribution } from "@/server/attribution";

const SCHEMA = "t_purge_route";
const SECRET = "test-secret-not-a-real-one";
let pool: Pool;

beforeAll(async () => {
  pool = await createIsolatedSchema(SCHEMA);
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
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
  await pool.query("TRUNCATE attributions, leads, lead_consents, event_outbox, data_requests CASCADE");
  process.env.DATABASE_URL = testDatabaseUrl(SCHEMA);
  process.env.CRON_SECRET = "cron-secret-for-tests";
});

afterEach(async () => {
  const { resetPool } = await import("@/server/db");
  await resetPool();
  delete process.env.DATABASE_URL;
  delete process.env.CRON_SECRET;
});

function call(auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  return new Request("https://yulalab.com/api/purge", { headers });
}

async function get(auth?: string) {
  const { GET } = await import("@/app/api/purge/route");
  return GET(call(auth));
}

describe("GET /api/purge", () => {
  it("actually deletes expired rows when the scheduler calls it", async () => {
    await recordAttribution(
      pool,
      {
        v: 1,
        event: "product_view",
        locale: "tr",
        page: "/projects/lifeos",
        product: "lifeos",
        session: "a".repeat(32),
      },
      { now: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), secret: SECRET },
    );
    await recordAttribution(
      pool,
      {
        v: 1,
        event: "product_view",
        locale: "tr",
        page: "/projects/lifeos",
        product: "lifeos",
        session: "b".repeat(32),
      },
      { now: new Date(), secret: SECRET },
    );

    const res = await get("Bearer cron-secret-for-tests");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ purged: 1, purgedLeads: 0 });

    const { rows } = await pool.query("SELECT count(*)::int AS n FROM attributions");
    expect(rows[0].n).toBe(1);
  });

  it("refuses an unauthenticated call", async () => {
    expect((await get()).status).toBe(401);
    expect((await get("Bearer wrong")).status).toBe(401);
  });

  it("refuses to run at all when CRON_SECRET is unset", async () => {
    // A public endpoint that deletes rows must not be reachable just
    // because someone forgot to configure it — and it answers exactly as it
    // does for a wrong secret, so a caller cannot probe whether the deploy
    // is configured.
    delete process.env.CRON_SECRET;
    const res = await get("Bearer anything");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ purged: null, reason: "unauthorized" });
  });
});

describe("both retentions run, not just the first one", () => {
  it("the purge route calls the lead purge too", async () => {
    // purgeExpiredLeads shipped with NO production caller — the exact defect
    // this route was created to atone for, one file away, while its own
    // docstring claimed the count existed "so a scheduled run can be observed
    // rather than assumed".
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const route = readFileSync(
      path.resolve(import.meta.dirname, "../src/app/api/purge/route.ts"),
      "utf8",
    );
    expect(route).toContain("purgeExpiredLeads");
    expect(route).toContain("purgeExpiredAttributions");
  });

  it("reports both counts so a silent no-op is visible", async () => {
    const { createLead } = await import("@/server/leads");
    await createLead(pool, {
      name: "Kaan",
      email: "a@b.co",
      intent: "studio",
      message: "old lead",
      locale: "tr",
    }, { now: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) });

    const res = await get("Bearer cron-secret-for-tests");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ purgedLeads: 1 });
  });
});

describe("the schedule is actually wired", () => {
  it("vercel.json schedules the purge route", async () => {
    // The defect this guards against was not a broken function — the
    // function passed its own test. It was a function nothing ever called.
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const config = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "../vercel.json"), "utf8"),
    ) as { crons?: Array<{ path: string; schedule: string }> };
    const cron = config.crons?.find((c) => c.path === "/api/purge");
    expect(cron, "no cron entry points at /api/purge").toBeTruthy();
    // Daily, not merely "five fields": a schedule of "0 4 1 1 *" would pass
    // a shape check and run once a year while the page promises 30 days.
    const [minute, hour, dom, month, dow] = (cron?.schedule ?? "").split(" ");
    expect([dom, month, dow]).toEqual(["*", "*", "*"]);
    expect(minute).toMatch(/^\d{1,2}$/);
    expect(hour).toMatch(/^\d{1,2}$/);
  });
});
