import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createIsolatedSchema, dropSchema, testDatabaseUrl } from "./helpers/attribution-db";

const SCHEMA = "t_events_route";
const ORIGIN = "https://yulalab.com";

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
  process.env.ATTRIBUTION_SECRET = "test-secret-not-a-real-one";
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
});

afterEach(async () => {
  const { resetPool } = await import("@/server/db");
  await resetPool();
  delete process.env.DATABASE_URL;
  delete process.env.ATTRIBUTION_SECRET;
});

function body(overrides: Record<string, unknown> = {}) {
  return {
    v: 1,
    event: "store_outbound",
    locale: "tr",
    page: "/projects/lifeos",
    product: "lifeos",
    target: "https://apps.apple.com/tr/app/id123",
    targetCategory: "store",
    session: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    ...overrides,
  };
}

function request(
  payload: unknown,
  init: { origin?: string | null; method?: string; secFetchSite?: string } = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.secFetchSite) headers["sec-fetch-site"] = init.secFetchSite;
  return new Request(`${ORIGIN}/api/events`, {
    method: init.method ?? "POST",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

async function post(
  payload: unknown,
  init?: { origin?: string | null; method?: string; secFetchSite?: string },
) {
  const { POST } = await import("@/app/api/events/route");
  return POST(request(payload, init));
}

describe("POST /api/events", () => {
  it("accepts a valid outbound event with 202 and reports it stored", async () => {
    const res = await post(body());
    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toMatchObject({ stored: true });

    const { rows } = await pool.query("SELECT event_name, target_url FROM attributions");
    expect(rows).toHaveLength(1);
    expect(rows[0].event_name).toBe("store_outbound");
  });

  it("rejects an unknown event name with 400", async () => {
    const res = await post(body({ event: "not_an_event" }));
    expect(res.status).toBe(400);
    expect(await pool.query("SELECT * FROM attributions").then((r) => r.rowCount)).toBe(0);
  });

  it("rejects an unknown field with 400 rather than dropping it", async () => {
    const res = await post(body({ email: "kaan@example.com" }));
    expect(res.status).toBe(400);
    const payload = await res.json();
    // The error may name the key; it must never echo the value back.
    expect(JSON.stringify(payload)).not.toContain("kaan@example.com");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("rejects an oversized body with 413", async () => {
    const res = await post(body({ campaign: "a".repeat(20_000) }));
    expect(res.status).toBe(413);
  });

  it("rejects a cross-origin post with 403", async () => {
    const res = await post(body(), { origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("accepts a same-origin post from the links hub", async () => {
    const res = await post(body(), { origin: "https://links.yulalab.com" });
    expect(res.status).toBe(202);
  });
});

describe("honest failure when storage is unavailable", () => {
  it("reports 503 and stored:false rather than a silent 202", async () => {
    // A 202 here would inflate the attribution-completeness metric with
    // events that were never written — the site's own funnel would then
    // report a number it cannot back. Fail open for the visitor (their
    // navigation is never blocked), fail closed for the claim.
    delete process.env.DATABASE_URL;
    const res = await post(body());
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ stored: false });
  });

  it("refuses to store with a missing attribution secret", async () => {
    // Hashing with a constant fallback would create a permanently joinable
    // pseudonym; refusing is the safer failure.
    delete process.env.ATTRIBUTION_SECRET;
    const res = await post(body());
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ stored: false });
    expect(await pool.query("SELECT * FROM attributions").then((r) => r.rowCount)).toBe(0);
  });
});

describe("method handling", () => {
  it("answers GET with 405", async () => {
    const { GET } = await import("@/app/api/events/route");
    const res = await GET();
    expect(res.status).toBe(405);
  });
});


describe("origin allowlist edges", () => {
  async function tryOrigin(origin: string) {
    const { POST } = await import("@/app/api/events/route");
    return POST(request(body(), { origin }));
  }

  it("does not fall for a lookalike of a first-party host", async () => {
    expect((await tryOrigin("https://evil-vercel.app")).status).toBe(403);
    expect((await tryOrigin("https://vercel.app.evil.example")).status).toBe(403);
    expect((await tryOrigin("https://notyulalab.com")).status).toBe(403);
  });

  it("refuses ANY vercel.app host that is not this deployment", async () => {
    // The earlier version trusted the whole *.vercel.app suffix, so any
    // Vercel user could name a project and get a passing Origin. Preview
    // deployments are identified by VERCEL_URL — the host Vercel assigns to
    // THIS deployment — not by a wildcard over everybody's.
    expect((await tryOrigin("https://attacker-project.vercel.app")).status).toBe(403);
    expect((await tryOrigin("https://vercel.app")).status).toBe(403);
  });

  it("accepts the preview host of this very deployment", async () => {
    process.env.VERCEL_URL = "yulalab-git-preview-abc123.vercel.app";
    expect((await tryOrigin("https://yulalab-git-preview-abc123.vercel.app")).status).toBe(202);
    expect((await tryOrigin("https://someone-else.vercel.app")).status).toBe(403);
    delete process.env.VERCEL_URL;
  });

  it("accepts the origin this deployment is configured to serve", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:4173";
    expect((await tryOrigin("http://127.0.0.1:4173")).status).toBe(202);
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  });

  it("still refuses a foreign origin when the configured one is set", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:4173";
    expect((await tryOrigin("https://evil.example")).status).toBe(403);
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  });
});

describe("requests without an Origin header", () => {
  it("refuses a scripted post that sends no Origin and no Sec-Fetch-Site", async () => {
    // Previously this returned 202: any curl/script had unauthenticated
    // write access to a table holding KVKK-scope data.
    const res = await post(body(), { origin: null });
    expect(res.status).toBe(403);
  });

  it("accepts a same-origin browser request that omits Origin", async () => {
    // Sec-Fetch-Site is set by the browser and is a forbidden header, so
    // page script cannot forge it.
    expect((await post(body(), { origin: null, secFetchSite: "same-origin" })).status).toBe(202);
    expect((await post(body(), { origin: null, secFetchSite: "none" })).status).toBe(202);
  });

  it("refuses a cross-site request that omits Origin", async () => {
    expect((await post(body(), { origin: null, secFetchSite: "cross-site" })).status).toBe(403);
  });
});

describe("rate limiting", () => {
  it("stops a single session from flooding the table", async () => {
    const { resetRateLimit } = await import("@/server/rate-limit");
    resetRateLimit();
    const session = "f".repeat(32);
    let limited = 0;
    for (let i = 0; i < 40; i += 1) {
      const res = await post(body({ session }));
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM attributions");
    expect(rows[0].n).toBeLessThan(40);
    resetRateLimit();
  });
});

describe("value-level PII rejection (not just unknown fields)", () => {
  // Rejecting unknown FIELDS is not the same as constraining the VALUES of
  // known ones. Every case below was ACCEPTED and STORED by the first
  // version, while the public privacy page claimed such data "technically
  // cannot" enter.
  it.each([
    ["an email address in the page path", "/kaan@example.com is my email"],
    ["a sentence with a name and an ID", "/my name is Mustafa Kaan, TCKN 12345678901"],
    ["an injected newline (log forgery)", "/log\n2026-01-01 FAKE LOG LINE"],
    ["a script tag", "/<script>alert(1)</script>"],
    ["a NUL byte", "/x\u0000y"],
    ["a protocol-relative prefix", "//evil.example"],
  ])("rejects %s", async (_label, page) => {
    const { resetRateLimit } = await import("@/server/rate-limit");
    resetRateLimit();
    const res = await post(body({ event: "product_view", page, target: undefined, targetCategory: undefined }));
    expect(res.status).toBe(400);
    expect(await pool.query("SELECT * FROM attributions").then((r) => r.rowCount)).toBe(0);
  });

  it("strips query and fragment from the stored outbound URL", async () => {
    const { resetRateLimit } = await import("@/server/rate-limit");
    resetRateLimit();
    const res = await post(
      body({ target: "https://apps.apple.com/tr/app/id123?ref=kaan@example.com#a@b.co" }),
    );
    expect(res.status).toBe(202);
    const { rows } = await pool.query("SELECT target_url FROM attributions");
    expect(rows[0].target_url).toBe("https://apps.apple.com/tr/app/id123");
  });

  it("decides the target category itself instead of trusting the sender", async () => {
    // A sender labelling a store click "internal" would silently corrupt
    // the outbound/store split this endpoint exists to report.
    const { resetRateLimit } = await import("@/server/rate-limit");
    resetRateLimit();
    const res = await post(body({ targetCategory: "internal" }));
    expect(res.status).toBe(202);
    const { rows } = await pool.query("SELECT target_category FROM attributions");
    expect(rows[0].target_category).toBe("store");
  });

  it("refuses an oversized body before buffering it", async () => {
    const { resetRateLimit } = await import("@/server/rate-limit");
    resetRateLimit();
    const { POST } = await import("@/app/api/events/route");
    const huge = JSON.stringify(body({ campaign: "a".repeat(50_000) }));
    const res = await POST(
      new Request(`${ORIGIN}/api/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
          "content-length": String(Buffer.byteLength(huge)),
        },
        body: huge,
      }),
    );
    expect(res.status).toBe(413);
  });
});
