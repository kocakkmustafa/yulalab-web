import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error The existing jsdom runtime has no installed declarations; keep this Node-only harness without adding a dependency.
import { JSDOM } from "jsdom";
import { SUPPORTED_LOCALES, localePath } from "@/i18n/locales";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { MOTION_CONSENT_COPY } from "@/data/motion-consent-copy";
import { MOTION_CONSENT_ENDPOINT, motionConsentEndpoint } from "@/data/motion-consent-config";

const LIVE_ENDPOINT = "https://aljdbngmeqwmsqhvfeau.supabase.co/functions/v1/motion-parental-consent";

const ENDPOINT = "https://e2eyulamotionconsent.supabase.co/functions/v1/motion-parental-consent";
const TOKEN = "Abc-_".repeat(8) + "xyz"; // 43 base64url characters, the Core link-token shape
const windows: JSDOM[] = [];
type Reply = { status: number; body?: unknown } | Error;

afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function consentPage(locale: string) {
  const { GET } = await import("@/app/[locale]/motion/consent/route");
  return GET(new Request(`https://consent.example.invalid${localePath(locale, "/motion/consent")}`), {
    params: Promise.resolve({ locale }),
  });
}

async function settle() {
  for (let index = 0; index < 20; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

// Evaluates both shipped scripts against a scripted Motion Core function. This is
// a correctness simulation, not browser CORS, provider, or live-function acceptance.
async function mount(locale: string, replies: Reply[], fragment = `#token=${TOKEN}`) {
  const html = await (await consentPage(locale)).text();
  const dom = new JSDOM(html, {
    url: `https://consent.example.invalid${localePath(locale, "/motion/consent")}${fragment}`,
    runScripts: "outside-only",
  });
  windows.push(dom);
  dom.window.setTimeout = globalThis.setTimeout as unknown as typeof dom.window.setTimeout;
  dom.window.clearTimeout = globalThis.clearTimeout as unknown as typeof dom.window.clearTimeout;
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const next = replies.shift();
    if (!next) throw new Error("unexpected call");
    if (next instanceof Error) throw next;
    return { status: next.status, json: async () => next.body ?? {} } as unknown as Response;
  });
  Object.defineProperty(dom.window, "fetch", { value: fetchImpl, configurable: true });
  Object.defineProperty(dom.window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener() {} }) });
  const inline = [...dom.window.document.querySelectorAll("script")];
  expect(inline).toHaveLength(2);
  expect(inline[0].textContent).toBe(THEME_BOOTSTRAP);
  dom.window.eval(inline[0].textContent!);
  dom.window.eval(inline[1].textContent!);
  await settle();
  const doc = dom.window.document;
  const $ = (id: string) => doc.getElementById(id)!;
  return { dom, doc, $, calls, click: async (id: string) => { ($(id) as HTMLButtonElement).click(); await settle(); } };
}

const pending = (locale = "tr") => ({ status: 200, body: { status: "pending", teenEmail: "t***@example.com", expiresAt: "2026-10-30T12:00:00.000Z", locale } });

describe("Motion parental-consent capability route", () => {
  it("keeps the same copy keys in all fourteen locales", () => {
    expect(Object.keys(MOTION_CONSENT_COPY).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    const keys = Object.keys(MOTION_CONSENT_COPY.en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      const copy = MOTION_CONSENT_COPY[locale];
      expect(Object.keys(copy).sort(), locale).toEqual(keys);
      for (const value of Object.values(copy)) expect(value.trim(), locale).not.toBe("");
      expect(copy.pending, locale).toContain("{email}");
      expect(copy.expires, locale).toContain("{date}");
    }
  });

  it("accepts only the exact Supabase function shape for the endpoint", () => {
    expect(MOTION_CONSENT_ENDPOINT).toBe(LIVE_ENDPOINT);
    expect(motionConsentEndpoint({})).toBe(LIVE_ENDPOINT);
    expect(motionConsentEndpoint({ YULA_MOTION_CONSENT_ENDPOINT: ENDPOINT })).toBe(ENDPOINT);
    for (const value of [
      "http://e2eyulamotionconsent.supabase.co/functions/v1/motion-parental-consent",
      "https://e2eyulamotionconsent.supabase.co.evil.example/functions/v1/motion-parental-consent",
      "https://evil.example/functions/v1/motion-parental-consent",
      `${ENDPOINT}?x=1`,
      "https://short.supabase.co/functions/v1/motion-parental-consent",
    ]) {
      expect(motionConsentEndpoint({ YULA_MOTION_CONSENT_ENDPOINT: value }), value).toBeNull();
    }
  });

  it.each(SUPPORTED_LOCALES)("%s serves an independent no-store, no-referrer, noindex document", async (locale) => {
    const response = await consentPage(locale);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toMatch(/no-store/);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toMatch(/noindex.*noarchive/);
    const csp = response.headers.get("content-security-policy")!;
    const nonces = [...html.matchAll(/<script nonce="([^"]+)"/g)].map((match) => match[1]);
    expect(nonces).toHaveLength(2);
    expect(nonces[0]).toBe(nonces[1]);
    expect(csp).toContain(`script-src 'nonce-${nonces[0]}'`);
    expect(csp).toContain(`style-src 'nonce-${nonces[0]}'`);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain(`connect-src ${LIVE_ENDPOINT}`);
    expect(csp.replace(LIVE_ENDPOINT, "")).not.toMatch(/unsafe-inline|unsafe-eval|https?:\/\//);
    // The visible copy names "Apple or Google" accounts (Ek D), so match Google hosts, not the word.
    expect(html).not.toMatch(/vercel|analytics|google(?:apis|tagmanager|usercontent|-analytics)|gstatic|<link\b|<iframe\b|<img\b|@import|url\(/i);
    expect(html).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">`);
    expect(html).toContain('<meta name="robots" content="noindex,nofollow,noarchive">');
    expect(html).toContain(MOTION_CONSENT_COPY[locale].heading.replaceAll("'", "&#39;"));
  });

  it("allows exactly the configured function in connect-src", async () => {
    vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
    const csp = (await consentPage("en")).headers.get("content-security-policy")!;
    expect(csp).toContain(`connect-src ${ENDPOINT}`);
    expect(csp.match(/https:\/\//g)).toHaveLength(1);
  });

  it("returns 404 for a non-canonical locale segment", async () => {
    expect((await consentPage("zh")).status).toBe(404);
    expect((await consentPage("tr.test")).status).toBe(404);
  });

  it("shows the unavailable state without any request while no function is configured", async () => {
    // A value outside the function shape disables the page (no fallback to the live constant).
    vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", "disabled");
    const page = await mount("tr", []);
    expect(page.calls).toHaveLength(0);
    expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.tr.unavailable);
    expect(page.$("actions").hidden).toBe(true);
    expect(page.dom.window.location.hash).toBe("");
  });

  describe("with the function configured", () => {
    it("removes the fragment, then views and approves with a text/plain, no-referrer, credential-free POST", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("tr", [pending("tr"), { status: 200, body: { status: "approved" } }]);
      expect(page.dom.window.location.href).toBe(`https://consent.example.invalid${localePath("tr", "/motion/consent")}`);
      expect(page.calls[0].url).toBe(ENDPOINT);
      expect(page.calls[0].body).toEqual({ action: "view", token: TOKEN });
      const headers = page.calls[0].init.headers as Record<string, string>;
      expect(headers["content-type"]).toMatch(/^text\/plain/);
      expect(page.calls[0].init.referrerPolicy).toBe("no-referrer");
      expect(page.calls[0].init.credentials).toBe("omit");
      expect(page.$("teen").textContent).toBe("Onay bekleyen hesap: t***@example.com");
      expect(page.$("actions").hidden).toBe(false);
      await page.click("approve");
      expect(page.calls[1].body).toEqual({ action: "decide", token: TOKEN, decision: "approve" });
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.tr.approved);
      expect(page.$("actions").hidden).toBe(true);
    });

    it("needs a second, explicit confirmation before declining and deleting", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("en", [pending("en"), { status: 200, body: { status: "denied" } }]);
      await page.click("deny");
      expect(page.calls).toHaveLength(1);
      expect(page.$("confirm").hidden).toBe(false);
      expect(page.$("warning").textContent).toBe(MOTION_CONSENT_COPY.en.denyWarning);
      await page.click("cancel");
      expect(page.$("confirm").hidden).toBe(true);
      expect(page.$("actions").hidden).toBe(false);
      await page.click("deny");
      await page.click("deny-confirm");
      expect(page.calls[1].body).toEqual({ action: "decide", token: TOKEN, decision: "deny" });
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en.denied);
    });

    it("switches to the language stored with the request", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      for (const [stored, expected] of [["de", "de"], ["pt-br", "pt-BR"], ["es", "es-419"], ["zh", "zh-Hans"], ["ar", "ar"]] as const) {
        const page = await mount("tr", [pending(stored)]);
        expect(page.doc.documentElement.lang, stored).toBe(expected);
        expect(page.doc.documentElement.dir, stored).toBe(expected === "ar" ? "rtl" : "ltr");
        expect(page.$("heading").textContent, stored).toBe(MOTION_CONSENT_COPY[expected].heading);
        expect(page.$("approve").textContent, stored).toBe(MOTION_CONSENT_COPY[expected].approve);
      }
      const unknown = await mount("en", [pending("xx")]);
      expect(unknown.doc.documentElement.lang).toBe("en");
    });

    it.each([
      [404, "invalid"],
      [410, "expired"],
    ] as const)("maps a %s view to the %s state without actions", async (status, key) => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("en", [{ status, body: status === 410 ? { status: "expired" } : { error: "invalid_link" } }]);
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en[key]);
      expect(page.$("actions").hidden).toBe(true);
      expect(page.$("retry").hidden).toBe(true);
    });

    it("offers a retry after a 503 or network failure on view", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("en", [{ status: 503, body: { error: "server_unavailable" } }, new Error("offline"), pending("en")]);
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en.serverError);
      expect(page.$("retry").hidden).toBe(false);
      await page.click("retry");
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en.serverError);
      await page.click("retry");
      expect(page.$("actions").hidden).toBe(false);
      expect(page.calls.map((call) => call.body.action)).toEqual(["view", "view", "view"]);
    });

    it("keeps decision buttons after a 503 and reports uncertainty when the decision response is lost", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("en", [pending("en"), { status: 503, body: { error: "server_unavailable" } }, new Error("lost")]);
      await page.click("approve");
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en.serverError);
      expect(page.$("actions").hidden).toBe(false);
      await page.click("approve");
      expect(page.$("status").textContent).toBe(MOTION_CONSENT_COPY.en.uncertain);
      expect(page.$("actions").hidden).toBe(true);
    });

    it("treats a malformed fragment as invalid without contacting the function", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      for (const fragment of ["", "#token=short", "#token=" + "a".repeat(31), `#token=${TOKEN}%3Cscript`]) {
        const page = await mount("en", [], fragment);
        expect(page.calls, fragment).toHaveLength(0);
        expect(page.$("status").textContent, fragment).toBe(MOTION_CONSENT_COPY.en.invalid);
      }
    });

    it("renders the masked address as text, never as markup", async () => {
      vi.stubEnv("YULA_MOTION_CONSENT_ENDPOINT", ENDPOINT);
      const page = await mount("en", [{ status: 200, body: { status: "pending", teenEmail: "<img src=x onerror=alert(1)>", expiresAt: "2026-10-30T12:00:00Z", locale: "en" } }]);
      expect(page.$("teen").querySelector("img")).toBeNull();
      expect(page.$("teen").textContent).toContain("<img src=x onerror=alert(1)>");
    });
  });
});
