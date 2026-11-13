import { describe, expect, it, vi } from "vitest";
import { callCronRoute } from "../netlify/lib/call-cron-route";
import { config as mailConfig } from "../netlify/functions/mail-drain";
import { config as purgeConfig } from "../netlify/functions/purge-daily";

const ENV = { CRON_SECRET: "test-only-secret", URL: "https://example.test" };
const res = (status: number) => Promise.resolve(new Response("{}", { status }));

describe("Netlify scheduled cron callers (WEB-P0-07b)", () => {
  it("are inert until CRON_SECRET and URL exist", async () => {
    const f = vi.fn();
    expect(await callCronRoute("/api/mail", {}, f as unknown as typeof fetch)).toBe("skipped");
    expect(await callCronRoute("/api/mail", { URL: ENV.URL }, f as unknown as typeof fetch)).toBe("skipped");
    expect(await callCronRoute("/api/purge", { CRON_SECRET: "x" }, f as unknown as typeof fetch)).toBe("skipped");
    expect(f).not.toHaveBeenCalled();
  });

  it("calls the route with the bearer secret and no redirects", async () => {
    const f = vi.fn(() => res(200));
    expect(await callCronRoute("/api/mail", ENV, f as unknown as typeof fetch)).toBe("ok");
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://example.test/api/mail");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-only-secret");
    expect(init.redirect).toBe("error");
  });

  it("maps 503 to an alarm and 401 to unauthorized without logging the body or secret", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await callCronRoute("/api/mail", ENV, (() => res(503)) as unknown as typeof fetch)).toBe("alarm");
    expect(await callCronRoute("/api/purge", ENV, (() => res(401)) as unknown as typeof fetch)).toBe("unauthorized");
    expect(await callCronRoute("/api/mail", ENV, (() => Promise.reject(new TypeError("boom"))) as unknown as typeof fetch)).toBe("error");
    expect(JSON.stringify(err.mock.calls)).not.toContain("test-only-secret");
    err.mockRestore();
  });

  it("schedules: mail every 15 minutes, purge once a day", () => {
    expect(mailConfig.schedule).toBe("*/15 * * * *");
    expect(purgeConfig.schedule).toBe("0 1 * * *");
  });
});
