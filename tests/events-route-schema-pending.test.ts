import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Production has migration 0005 but NOT 0006. These tests simulate that
// without a database: the write layer throws what Postgres / PostgREST throw.
const recordAttribution = vi.fn();
vi.mock("@/server/attribution", () => ({
  recordAttribution: (...args: unknown[]) => recordAttribution(...args),
}));
vi.mock("@/server/db", () => ({
  getPool: () => ({}),
  isDatabaseConfigured: () => true,
}));

const ORIGIN = "https://yulalab.com";
const SESSION = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

const legacy = { v: 1, event: "product_view", locale: "tr", page: "/projects/lifeos", product: "lifeos", session: SESSION };
const v2Event = { v: 1, event: "home_view", locale: "tr", page: "/", session: SESSION };
const v2Locale = { ...legacy, locale: "pt-BR" };

async function post(payload: unknown) {
  const { resetRateLimit } = await import("@/server/rate-limit");
  resetRateLimit();
  const { POST } = await import("@/app/api/events/route");
  return POST(
    new Request(`${ORIGIN}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(payload),
    }),
  );
}

const pgError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('relation "attributions" does not exist (secret detail)'), { code, ...extra });

beforeEach(() => {
  recordAttribution.mockReset();
  process.env.ATTRIBUTION_SECRET = "test-secret-not-a-real-one";
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
  delete process.env.EVENTS_V2_ENABLED;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ATTRIBUTION_SECRET;
  delete process.env.EVENTS_V2_ENABLED;
});

describe("EVENTS_V2_ENABLED off (default)", () => {
  it.each([["v2 event", v2Event], ["non-TR/EN locale", v2Locale]])(
    "drops a %s with 204 and never touches the database",
    async (_name, payload) => {
      const res = await post(payload);
      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
      expect(recordAttribution).not.toHaveBeenCalled();
    },
  );

  it("still stores a legacy event exactly as before", async () => {
    recordAttribution.mockResolvedValue(undefined);
    const res = await post(legacy);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ stored: true });
    expect(recordAttribution).toHaveBeenCalledTimes(1);
  });

  it("still validates: a malformed v2 event is a 400, not a silent 204", async () => {
    expect((await post({ ...v2Event, target: "https://x.example" })).status).toBe(400);
  });
});

describe("EVENTS_V2_ENABLED on but 0006 / table missing", () => {
  beforeEach(() => {
    process.env.EVENTS_V2_ENABLED = "1";
  });

  it.each([
    ["Postgres undefined_table 42P01", pgError("42P01")],
    ["PostgREST PGRST205", pgError("PGRST205")],
    ["relation does not exist message only", new Error('relation "attributions" does not exist')],
    ["CHECK violation on event_name constraint", pgError("23514", { constraint: "attributions_event_name_check" })],
    ["CHECK violation on locale constraint", pgError("23514", { constraint: "attributions_locale_check" })],
  ])("v2 event + %s degrades to 204 with no error leak", async (_name, error) => {
    recordAttribution.mockRejectedValue(error);
    for (const payload of [v2Event, v2Locale]) {
      const res = await post(payload);
      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
    }
    const logged = JSON.stringify([...vi.mocked(console.warn).mock.calls, ...vi.mocked(console.error).mock.calls]);
    expect(logged).not.toContain("secret detail");
  });

  it("an unrelated database failure is still an honest 503, never 500", async () => {
    recordAttribution.mockRejectedValue(Object.assign(new Error("terminating connection (secret detail)"), { code: "57P01" }));
    const res = await post(v2Event);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ stored: false, reason: "write_failed" });
  });

  it("a legacy event keeps the documented 503 {stored:false} when the table is gone (not 500, no leak)", async () => {
    recordAttribution.mockRejectedValue(pgError("42P01"));
    const res = await post(legacy);
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ stored: false, reason: "write_failed" });
    expect(text).not.toContain("secret detail");
  });
});
