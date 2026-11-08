import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
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

describe("routes share the helper", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/server/rate-limit");
  });

  it.each(["leads", "events"])("%s route imports clientIp and has no private header parsing", (name) => {
    const src = readFileSync(
      path.resolve(import.meta.dirname, `../src/app/api/${name}/route.ts`),
      "utf8",
    );
    expect(src).toMatch(/import \{[^}]*clientIp[^}]*\} from "@\/server\/rate-limit"/);
    expect(src).toContain("clientIp(request.headers)");
    expect(src).not.toMatch(/headers\.get\("x-forwarded-for"\)/);
    expect(src).not.toMatch(/headers\.get\("x-real-ip"\)/);
  });

  it("events route keys the limiter on the helper's IP", async () => {
    const keys: string[] = [];
    vi.doMock("@/server/rate-limit", async (orig) => ({
      ...(await orig<typeof import("@/server/rate-limit")>()),
      allowRequest: (key: string) => {
        keys.push(key);
        return false;
      },
    }));
    process.env.NEXT_PUBLIC_SITE_URL = "https://yulalab.com";
    const { POST } = await import("@/app/api/events/route");
    const res = await POST(
      new Request("https://yulalab.com/api/events", {
        method: "POST",
        headers: {
          origin: "https://yulalab.com",
          "content-type": "application/json",
          "x-nf-client-connection-ip": "203.0.113.7",
          "x-forwarded-for": "6.6.6.6",
        },
        body: JSON.stringify({
          v: 1,
          event: "store_outbound",
          locale: "tr",
          page: "/projects/lifeos",
          product: "lifeos",
          target: "https://apps.apple.com/tr/app/id123",
          targetCategory: "store",
          session: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
        }),
      }),
    );
    expect(res.status).toBe(429);
    expect(keys).toEqual(["ip:203.0.113.7"]);
  });
});
