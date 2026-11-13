import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp } from "@/server/rate-limit";

const h = (init: Record<string, string>) => new Headers(init);
const NETLIFY = {};
const VERCEL = { VERCEL: "1" };

describe("clientIp", () => {
  it("prefers the Netlify header over a forged x-forwarded-for", () => {
    const headers = h({
      "x-nf-client-connection-ip": "203.0.113.7",
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-real-ip": "3.3.3.3",
    });
    expect(clientIp(headers, NETLIFY)).toBe("203.0.113.7");
    // Rotating the forged header changes nothing.
    const rotated = h({
      "x-nf-client-connection-ip": "203.0.113.7",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(clientIp(rotated, NETLIFY)).toBe("203.0.113.7");
  });

  it("does not return a forged x-forwarded-for when the Netlify header is invalid", () => {
    expect(
      clientIp(h({ "x-nf-client-connection-ip": "garbage", "x-forwarded-for": "1.1.1.1" }), NETLIFY),
    ).toBeNull();
  });

  it("on Vercel uses the first x-forwarded-for hop and ignores the Netlify header", () => {
    const headers = h({
      "x-forwarded-for": "198.51.100.9, 10.0.0.1",
      "x-nf-client-connection-ip": "6.6.6.6",
    });
    expect(clientIp(headers, VERCEL)).toBe("198.51.100.9");
  });

  it("without the Netlify header uses the first x-forwarded-for hop", () => {
    expect(clientIp(h({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }), NETLIFY)).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip and accepts IPv6", () => {
    expect(clientIp(h({ "x-real-ip": "2001:DB8::1" }), NETLIFY)).toBe("2001:db8::1");
    expect(clientIp(h({ "x-real-ip": "192.0.2.5" }), VERCEL)).toBe("192.0.2.5");
  });

  it.each([
    ["empty", ""],
    ["not an ip", "evil"],
    ["with port", "1.2.3.4:80"],
    ["out-of-range octet", "999.1.1.1"],
    ["too long", "1".repeat(65)],
    ["too long ipv6", `${"0:".repeat(40)}1`],
  ])("rejects %s", (_l, value) => {
    expect(clientIp(h({ "x-nf-client-connection-ip": value }), NETLIFY)).toBeNull();
    expect(clientIp(h({ "x-forwarded-for": value }), VERCEL)).toBeNull();
  });

  it("returns null when no header exists", () => {
    expect(clientIp(h({}), NETLIFY)).toBeNull();
    expect(clientIp(h({}), VERCEL)).toBeNull();
  });
});

describe("IPv6 canonicalisation", () => {
  it("maps equivalent spellings to one key", () => {
    const a = clientIp(h({ "x-real-ip": "2001:db8::1" }), NETLIFY);
    const b = clientIp(h({ "x-real-ip": "2001:0DB8:0:0:0:0:0:1" }), NETLIFY);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(a).not.toContain("[");
  });

  it("rejects zone ids", () => {
    expect(clientIp(h({ "x-real-ip": "fe80::1%eth0" }), NETLIFY)).toBeNull();
    expect(clientIp(h({ "x-real-ip": "fe80::1%25eth0" }), NETLIFY)).toBeNull();
  });

  it("canonicalises IPv4-mapped IPv6 deterministically", () => {
    const a = clientIp(h({ "x-real-ip": "::ffff:1.2.3.4" }), NETLIFY);
    const b = clientIp(h({ "x-real-ip": "::FFFF:0102:0304" }), NETLIFY);
    expect(a).toBe("::ffff:102:304");
    expect(a).toBe(b);
  });
});

describe("routes key the limiter on clientIp", () => {
  const keys: string[] = [];
  const ORIGIN = "https://yulalab.com";

  beforeEach(() => {
    keys.length = 0;
    vi.resetModules();
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("LEADS_ENABLED", "1");
    vi.doMock("@/server/rate-limit", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/server/rate-limit")>()),
      allowRequest: (key: string) => {
        keys.push(key);
        return false;
      },
    }));
  });

  afterEach(() => {
    vi.doUnmock("@/server/rate-limit");
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const headers = (extra: Record<string, string> = {}) => ({
    origin: ORIGIN,
    "content-type": "application/json",
    "x-nf-client-connection-ip": "203.0.113.7",
    "x-forwarded-for": "6.6.6.6",
    ...extra,
  });

  const eventBody = JSON.stringify({
    v: 1,
    event: "store_outbound",
    locale: "tr",
    page: "/projects/lifeos",
    product: "lifeos",
    target: "https://apps.apple.com/tr/app/id123",
    targetCategory: "store",
    session: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  });

  it("events: Netlify header wins over forged x-forwarded-for", async () => {
    const { POST } = await import("@/app/api/events/route");
    const res = await POST(
      new Request(`${ORIGIN}/api/events`, { method: "POST", headers: headers(), body: eventBody }),
    );
    expect(res.status).toBe(429);
    expect(keys).toEqual(["ip:203.0.113.7"]);
  });

  it("events: no valid IP falls back to the session key", async () => {
    const { POST } = await import("@/app/api/events/route");
    await POST(
      new Request(`${ORIGIN}/api/events`, {
        method: "POST",
        headers: headers({ "x-nf-client-connection-ip": "junk" }),
        body: eventBody,
      }),
    );
    expect(keys).toEqual(["session:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"]);
  });

  it("leads: lead:<ip> from the Netlify header, lead:unknown without one", async () => {
    const { POST } = await import("@/app/api/leads/route");
    const payload = JSON.stringify({
      name: "Kaan",
      email: "someone@example.com",
      intent: "studio",
      message: "We would like to talk about a build.",
      locale: "tr",
      consent: true,
      website: "",
      budgetBand: "150-400k",
      timing: "now",
      decisionRole: "founder",
    });
    const send = (hdrs: Record<string, string>) =>
      POST(new Request(`${ORIGIN}/api/leads`, { method: "POST", headers: hdrs, body: payload }));
    expect((await send(headers())).status).toBe(429);
    await send({ origin: ORIGIN, "content-type": "application/json" });
    expect(keys).toEqual(["lead:203.0.113.7", "lead:unknown"]);
  });

  it("data-request: dsr:<ip> from the Netlify header, dsr:unknown without one", async () => {
    const { POST } = await import("@/app/api/data-request/route");
    const send = (hdrs: Record<string, string>) =>
      POST(
        new Request(`${ORIGIN}/api/data-request`, {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({ token: "x" }),
        }),
      );
    expect((await send(headers())).status).toBe(429);
    await send({ origin: ORIGIN, "content-type": "application/json" });
    expect(keys).toEqual(["dsr:203.0.113.7", "dsr:unknown"]);
  });
});
