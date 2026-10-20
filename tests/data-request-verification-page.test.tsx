import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error The existing jsdom runtime has no installed declarations; keep this Node-only harness without adding a dependency.
import { JSDOM } from "jsdom";

const windows: JSDOM[] = [];
const token = "b".repeat(64);
type PageLocale = "tr" | "en";
type PageFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function verificationPage(locale: "tr" | "en") {
  const { GET } = await import("@/app/[locale]/data-request/verify/route");
  return GET(
    new Request(`https://yulalab.com/${locale === "en" ? "en/" : ""}data-request/verify`),
    { params: Promise.resolve({ locale }) },
  );
}

// Evaluate the shipped inline script, with no remote resource loading and a
// private fake fetch. This is a product correctness simulation, not a browser,
// token replay, SQL, provider or security boundary test.
async function mountPage(locale: PageLocale, fetchImpl: PageFetch, fragmentToken = token) {
  const html = await (await verificationPage(locale)).text();
  const dom = new JSDOM(html, {
    url: `https://verification.example.invalid/${locale === "en" ? "en/" : ""}data-request/verify#token=${fragmentToken}`,
    runScripts: "outside-only",
  });
  windows.push(dom);
  dom.window.setTimeout = globalThis.setTimeout as unknown as typeof dom.window.setTimeout;
  dom.window.clearTimeout = globalThis.clearTimeout as unknown as typeof dom.window.clearTimeout;
  Object.defineProperty(dom.window, "fetch", { value: fetchImpl, configurable: true });
  const inline = dom.window.document.querySelector("script")?.textContent;
  expect(inline).toBeTruthy();
  dom.window.eval(inline!);
  return {
    dom,
    button: dom.window.document.getElementById("verify") as HTMLButtonElement,
    status: dom.window.document.getElementById("status")!,
  };
}

function reply(status: number, body: unknown) {
  const json = vi.fn(async () => body);
  return { response: { status, json } as unknown as Response, json };
}

async function settleMicrotasks() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

describe("plain data-request verification capability route", () => {
  it.each(["tr", "en"] as const)(
    "%s is no-store, no-referrer, noindex/noarchive and third-party free",
    async (locale) => {
      const response = await verificationPage(locale);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toMatch(/no-store/i);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("x-robots-tag")).toMatch(/noindex.*noarchive/i);
      expect(response.headers.get("content-security-policy")).toMatch(/default-src 'none'/i);
      expect(response.headers.get("content-security-policy")).toMatch(/connect-src 'self'/i);
      expect(response.headers.get("content-security-policy")).not.toMatch(/https?:\/\//i);
      expect(html).not.toMatch(/vercel|analytics|google|<link\b|<iframe\b|<img\b|@import|@font-face|url\(/i);
      expect(html).not.toContain("__next");
      const nonce = /<script nonce="([^"]+)"/.exec(html)?.[1];
      expect(nonce).toBeTruthy();
      expect(html).toContain(`<style nonce="${nonce}">`);
      expect(response.headers.get("content-security-policy")).toContain(`style-src 'nonce-${nonce}'`);
      expect(response.headers.get("content-security-policy")).not.toContain("unsafe-inline");
    },
  );

  it("scrubs the fragment before any network-capable code and POSTs only on click", async () => {
    const html = await (await verificationPage("tr")).text();
    const scrub = html.indexOf("history.replaceState");
    const fetchCall = html.indexOf("fetch(");
    const clickBinding = html.indexOf('addEventListener("click"');

    expect(scrub).toBeGreaterThan(-1);
    expect(fetchCall).toBeGreaterThan(scrub);
    expect(clickBinding).toBeGreaterThan(scrub);
    expect(html).toContain("location.hash");
    expect(html).toContain("/api/data-request");
    expect(html).not.toMatch(/document\.referrer|navigator\.sendBeacon|new Image/i);
  });

  it.each(["tr", "en"] as const)("%s has an inert no-script state and a localized exit", async (locale) => {
    const html = await (await verificationPage(locale)).text();
    expect(html).toContain('<button id="verify" type="button" hidden>');
    expect(html).toContain("<noscript><p>");
    expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/contact"`);
  });

  it("a scanner GET performs no server-side POST or external request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await verificationPage("en");
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps unsupported UI locales outside the TR/EN mail capability route", async () => {
    const { GET } = await import("@/app/[locale]/data-request/verify/route");
    for (const locale of ["es-419", "pt-BR", "de", "fr", "ja", "ar", "tr.json"]) {
      const response = await GET(new Request("https://verification.example.invalid/data-request/verify"), {
        params: Promise.resolve({ locale }),
      });
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
    }
  });
});

describe("verification inline script product correctness simulation", () => {
  it.each(["tr", "en"] as const)("%s accepts only 200 with verified:true, then clears resources", async (locale) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(reply(200, { verified: true }).response);
    const { dom, button, status } = await mountPage(locale, fetchMock);
    expect(dom.window.location.hash).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    button.click();
    await settleMicrotasks();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/data-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      signal: expect.anything(),
    });
    expect(status.textContent).toContain(locale === "tr" ? "Talebiniz işleme alınabilir" : "Your request can now be processed");
    expect(status.textContent).not.toMatch(/hesabınız silindi|account.*deleted|deletion.*complete/i);
    expect(status.getAttribute("role")).toBe("status");
    expect(status.hasAttribute("aria-busy")).toBe(false);
    expect(button.hidden).toBe(true);
    expect(button.disabled).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    const email = dom.window.document.querySelector('a[href^="mailto:"]');
    expect(email?.getAttribute("href")).toBe("mailto:support@yulalab.com");
    expect([...dom.window.document.querySelectorAll("a")].some((link) => link.href.includes(token))).toBe(false);
  });

  it.each(["tr", "en"] as const)("%s treats 200/false as unconfirmed, including a possibly consumed earlier attempt", async (locale) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(reply(200, { verified: false }).response);
    const { button, status } = await mountPage(locale, fetchMock);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toContain(locale === "tr" ? "Önceki deneme tamamlanmış olabilir" : "An earlier attempt may have completed");
    expect(status.textContent).toContain(locale === "tr" ? "daha önce kullanılmış" : "already used");
    expect(status.getAttribute("role")).toBe("alert");
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([201, 202, 204, 500, 503])("status %i cannot claim verification even with a positive body", async (statusCode) => {
    vi.useFakeTimers();
    const { response, json } = reply(statusCode, { verified: true });
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(response);
    const { button, status } = await mountPage("en", fetchMock);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toContain("The verification response was not received");
    expect(status.textContent).not.toContain("The email address was verified");
    expect(json).not.toHaveBeenCalled();
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["null", null],
    ["array", [{ verified: true }]],
    ["missing boolean", {}],
    ["string boolean", { verified: "true" }],
    ["numeric boolean", { verified: 1 }],
    ["primitive", true],
  ])("a 200 response with %s is uncertain and retryable", async (_label, body) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(reply(200, body).response);
    const { button, status } = await mountPage("en", fetchMock);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toContain("An earlier attempt may have completed");
    expect(status.textContent).toContain("check again with the same link or confirm by email");
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a malformed JSON body is uncertain and releases the request resources", async () => {
    vi.useFakeTimers();
    const response = { status: 200, json: async () => { throw new SyntaxError("synthetic malformed JSON"); } } as unknown as Response;
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(response);
    const { button, status } = await mountPage("tr", fetchMock);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toContain("Doğrulama yanıtı alınamadı");
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["tr", "en"] as const)("%s offline rejection keeps an explicit retry and email exit", async (locale) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>().mockRejectedValue(new TypeError("synthetic offline"));
    const { dom, button, status } = await mountPage(locale, fetchMock);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toContain(locale === "tr" ? "Önceki deneme tamamlanmış olabilir" : "An earlier attempt may have completed");
    expect(status.textContent).not.toContain(locale === "tr" ? "Bağlantı geçersiz" : "It may be invalid");
    expect(button.textContent).toBe(locale === "tr" ? "Aynı bağlantıyla yeniden kontrol et" : "Check again with the same link");
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(dom.window.document.querySelector('a[href="mailto:support@yulalab.com"]')?.textContent)
      .toBe(locale === "tr" ? "Talebin durumunu e-posta ile teyit et" : "Confirm the request status by email");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a never-resolving fetch ends at 15 seconds, aborts and does not retry automatically", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>(() => new Promise(() => {}));
    const { button, status } = await mountPage("en", fetchMock);
    button.click();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(button.disabled).toBe(true);
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(button.disabled).toBe(false);
    expect(button.hidden).toBe(false);
    expect(status.textContent).toContain("An earlier attempt may have completed");
    expect(status.hasAttribute("aria-busy")).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("slow headers and a never-resolving body share one 15 second deadline", async () => {
    vi.useFakeTimers();
    let resolveHeaders!: (response: Response) => void;
    const json = vi.fn(() => new Promise(() => {}));
    const fetchMock = vi.fn<PageFetch>(() => new Promise((resolve) => { resolveHeaders = resolve; }));
    const { button, status } = await mountPage("en", fetchMock);
    button.click();
    await vi.advanceTimersByTimeAsync(14_000);
    resolveHeaders({ status: 200, json } as unknown as Response);
    await settleMicrotasks();
    expect(json).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(button.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(button.disabled).toBe(false);
    expect(status.textContent).toContain("The verification response was not received");
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("an explicit retry retains the token; an abandoned late result cannot replace its result", async () => {
    vi.useFakeTimers();
    let resolveBody!: (body: unknown) => void;
    const stalled = { status: 200, json: () => new Promise((resolve) => { resolveBody = resolve; }) } as unknown as Response;
    const fetchMock = vi.fn<PageFetch>()
      .mockResolvedValueOnce(stalled)
      .mockResolvedValueOnce(reply(200, { verified: false }).response);
    const { dom, button, status } = await mountPage("en", fetchMock);
    button.click();
    await settleMicrotasks();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    button.click();
    await settleMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => call[1]?.body)).toEqual([JSON.stringify({ token }), JSON.stringify({ token })]);
    expect(fetchMock.mock.calls[0][1]?.signal).not.toBe(fetchMock.mock.calls[1][1]?.signal);
    const retryResult = status.textContent;
    expect(retryResult).toContain("already used");
    resolveBody({ verified: true });
    await settleMicrotasks();
    expect(status.textContent).toBe(retryResult);
    expect(status.textContent).not.toContain("The email address was verified");
    expect(dom.window.location.hash).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("guards repeated clicks while one request is active", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>(() => new Promise(() => {}));
    const { dom, button } = await mountPage("en", fetchMock);
    button.click();
    button.dispatchEvent(new dom.window.MouseEvent("click"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(button.disabled).toBe(false);
  });

  it("invalid local token input is scrubbed without sending a request", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>();
    const { dom, button, status } = await mountPage("en", fetchMock, "invalid");
    expect(dom.window.location.hash).toBe("");
    expect(button.hidden).toBe(true);
    expect(status.textContent).toContain("It may be invalid, expired, or already used");
    button.dispatchEvent(new dom.window.MouseEvent("click"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
