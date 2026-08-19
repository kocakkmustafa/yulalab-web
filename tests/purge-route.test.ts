import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";
import { recordAttribution } from "@/server/attribution";

const SCHEMA = "t_purge_route";
const SECRET = "test-secret-not-a-real-one";
let pool: Pool;

beforeAll(async () => {
  pool = await createIsolatedSchema(SCHEMA);
});

afterAll(async () => {
  await dropSchema(pool, SCHEMA);
});

beforeEach(async () => {
  await pool.query("TRUNCATE attributions");
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
    await expect(res.json()).resolves.toEqual({ purged: 1 });

    const { rows } = await pool.query("SELECT count(*)::int AS n FROM attributions");
    expect(rows[0].n).toBe(1);
  });

  it("refuses an unauthenticated call", async () => {
    expect((await get()).status).toBe(401);
    expect((await get("Bearer wrong")).status).toBe(401);
  });

  it("refuses to run at all when CRON_SECRET is unset", async () => {
    // A public endpoint that deletes rows must not be reachable just
    // because someone forgot to configure it.
    delete process.env.CRON_SECRET;
    expect((await get("Bearer anything")).status).toBe(503);
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
    expect(cron?.schedule).toMatch(/^\S+ \S+ \S+ \S+ \S+$/);
  });
});
