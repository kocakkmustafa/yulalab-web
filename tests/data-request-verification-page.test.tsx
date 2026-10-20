import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error The existing jsdom runtime has no installed declarations; keep this Node-only harness without adding a dependency.
import { JSDOM } from "jsdom";
import { SUPPORTED_LOCALES, localePath, type Locale } from "@/i18n/locales";
import { THEME_BOOTSTRAP, THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/theme";
import { themeCopy } from "@/components/theme/theme-copy";

const windows: JSDOM[] = [];
const token = "b".repeat(64);
type PageLocale = Locale;
type PageFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const canonicalLocales = ["tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar", "it", "ko", "id", "pl", "hi", "zh-Hans"] as const;

afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.doUnmock("@/data/verification-copy");
  vi.doUnmock("@/components/theme/theme-copy");
  vi.resetModules();
});

async function copyFor(locale: PageLocale) {
  const { VERIFICATION_COPY } = await import("@/data/verification-copy");
  return VERIFICATION_COPY[locale];
}

async function verificationPage(locale: string) {
  const { GET } = await import("@/app/[locale]/data-request/verify/route");
  return GET(
    new Request(`https://verification.example.invalid${localePath(locale, "/data-request/verify")}`),
    { params: Promise.resolve({ locale }) },
  );
}

type ThemeOptions = {
  stored?: string;
  systemDark?: boolean;
  blockedStorage?: boolean;
  writeFails?: boolean;
  noMedia?: boolean;
  legacyMedia?: boolean;
  bootOnly?: boolean;
};

// Evaluate both shipped scripts in document order. No resource loader or real
// fetch is installed. This is a correctness simulation, not a real browser,
// token replay, provider, SQL, or security-boundary acceptance.
async function mountPage(locale: PageLocale, fetchImpl: PageFetch, fragmentToken = token, options: ThemeOptions = {}) {
  const html = await (await verificationPage(locale)).text();
  const dom = new JSDOM(html, {
    url: `https://verification.example.invalid${localePath(locale, "/data-request/verify")}#token=${fragmentToken}`,
    runScripts: "outside-only",
  });
  windows.push(dom);
  dom.window.setTimeout = globalThis.setTimeout as unknown as typeof dom.window.setTimeout;
  dom.window.clearTimeout = globalThis.clearTimeout as unknown as typeof dom.window.clearTimeout;
  Object.defineProperty(dom.window, "fetch", { value: fetchImpl, configurable: true });
  const values = new Map<string, string>();
  if (options.stored !== undefined) values.set(THEME_STORAGE_KEY, options.stored);
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (options.writeFails) throw new Error("synthetic storage write failure");
      values.set(key, value);
    }),
  };
  Object.defineProperty(dom.window, "localStorage", options.blockedStorage
    ? { configurable: true, get() { throw new Error("synthetic blocked storage"); } }
    : { configurable: true, value: storage });
  let systemDark = options.systemDark ?? true;
  const listeners = new Set<() => void>();
  const media = {
    get matches() { return systemDark; },
    addEventListener: options.legacyMedia ? undefined : vi.fn((_type: string, listener: () => void) => { listeners.add(listener); }),
    addListener: vi.fn((listener: () => void) => { listeners.add(listener); }),
  };
  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    value: options.noMedia ? undefined : vi.fn(() => media),
  });
  const inline = [...dom.window.document.querySelectorAll("script")];
  expect(inline).toHaveLength(2);
  expect(inline[0].textContent).toBe(THEME_BOOTSTRAP);
  dom.window.eval(inline[0].textContent!);
  if (!options.bootOnly) dom.window.eval(inline[1].textContent!);
  return {
    dom,
    button: dom.window.document.getElementById("verify") as HTMLButtonElement,
    status: dom.window.document.getElementById("status")!,
    appearance: dom.window.document.getElementById("appearance") as HTMLSelectElement,
    sessionNotice: dom.window.document.getElementById("appearance-session")!,
    storage,
    runApplication() { dom.window.eval(inline[1].textContent!); },
    setSystemDark(value: boolean) { systemDark = value; for (const listener of listeners) listener(); },
    storageEvent(key: string | null, newValue: string | null, storageArea: unknown = storage) {
      const event = new dom.window.Event("storage");
      Object.defineProperties(event, { key: { value: key }, newValue: { value: newValue }, storageArea: { value: storageArea } });
      dom.window.dispatchEvent(event);
    },
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
  it.each(canonicalLocales)(
    "%s has the correct independent document, copy, nonce pair, no-script and native appearance control",
    async (locale) => {
      expect([...SUPPORTED_LOCALES].sort()).toEqual([...canonicalLocales].sort());
      const copy = await copyFor(locale);
      const response = await verificationPage(locale);
      const html = await response.text();
      const dom = new JSDOM(html);
      windows.push(dom);
      const document = dom.window.document;
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toMatch(/no-store/i);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("x-robots-tag")).toMatch(/noindex.*noarchive/i);
      const csp = response.headers.get("content-security-policy")!;
      expect(csp).toMatch(/default-src 'none'/i);
      expect(csp).toMatch(/connect-src 'self'/i);
      expect(csp).not.toMatch(/https?:\/\//i);
      expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/i);
      expect(html).not.toMatch(/vercel|analytics|google|<link\b|<iframe\b|<img\b|@import|@font-face|url\(/i);
      expect(html).not.toContain("__next");
      expect(document.documentElement.lang).toBe(locale);
      expect(document.documentElement.dir).toBe(locale === "ar" ? "rtl" : "ltr");
      expect(document.title).toBe(copy.title);
      expect(document.querySelector("h1")?.textContent).toBe(copy.heading);
      expect(document.querySelector("h1 + p")?.textContent).toBe(copy.intro);
      expect(document.querySelector("#verify")?.textContent).toBe(copy.button);
      expect(document.querySelector("#verify")?.hasAttribute("hidden")).toBe(true);
      expect(document.querySelector("noscript p")?.textContent).toBe(copy.noScript);
      expect(document.querySelector(`a[href="${localePath(locale, "/contact")}"]`)?.textContent).toBe(copy.contact);
      expect(document.querySelector('a[href="mailto:support@yulalab.com"]')?.textContent).toBe(copy.email);
      if (locale !== "en") expect(copy.heading).not.toBe((await copyFor("en")).heading);
      const scripts = [...document.querySelectorAll("script")];
      expect(scripts).toHaveLength(2);
      const nonce = scripts[0].getAttribute("nonce");
      expect(nonce).toBeTruthy();
      expect(scripts.map((script) => script.getAttribute("nonce"))).toEqual([nonce, nonce]);
      expect(scripts.every((script) => !script.hasAttribute("src"))).toBe(true);
      expect(document.head.contains(scripts[0])).toBe(true);
      expect(document.body.contains(scripts[1])).toBe(true);
      expect(scripts[0].textContent).toBe(THEME_BOOTSTRAP);
      expect(document.querySelector("style")?.getAttribute("nonce")).toBe(nonce);
      expect(csp).toContain(`script-src 'nonce-${nonce}'`);
      expect(csp).toContain(`style-src 'nonce-${nonce}'`);
      const appearance = document.querySelector("select")!;
      const theme = themeCopy(locale);
      expect(appearance.id).toBe("appearance");
      expect(appearance.hasAttribute("disabled")).toBe(true);
      expect(appearance.closest("label")?.textContent).toContain(theme.label);
      expect([...appearance.options].map((option) => [option.value, option.textContent])).toEqual([
        ["light", theme.light], ["dark", theme.dark], ["system", theme.system],
      ]);
      expect(document.querySelector("#appearance-session")?.textContent).toBe(theme.sessionOnly);
      expect(document.querySelector("#appearance-session")?.hasAttribute("hidden")).toBe(true);
    },
  );

  it("uses a new shared nonce for each independent response", async () => {
    const first = await verificationPage("ar");
    const second = await verificationPage("ar");
    expect(first.headers.get("content-security-policy")).not.toBe(second.headers.get("content-security-policy"));
  });

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

  it("a scanner GET performs no server-side POST or external request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await verificationPage("en");
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects noncanonical params, unsupported Chinese tags and dotted/path-like values without fallback", async () => {
    // Middleware alias redirects are a separate routing contract; the raw
    // handler must accept only canonical params, even when called directly.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const locale of ["zh", "zh-TW", "zh-Hant", "zh-HK", "zh-MO", "zh-Hant-TW", "zh-CN", "zh-SG", "zh-hans", "EN", "pt-br", "es", "tr.json", "fr.test", "en/../tr", "en%2Ftr", "unknown"]) {
      const response = await verificationPage(locale);
      expect(response.status, locale).toBe(404);
      expect(await response.text(), locale).toBe("");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("verification inline script product correctness simulation", () => {
  it.each(canonicalLocales)("%s executes its failed, uncertain and verified copy with explicit retries and cleared resources", async (locale) => {
    vi.useFakeTimers();
    const copy = await copyFor(locale);
    const fetchMock = vi.fn<PageFetch>()
      .mockResolvedValueOnce(reply(200, { verified: false }).response)
      .mockRejectedValueOnce(new TypeError("synthetic offline"))
      .mockResolvedValueOnce(reply(200, { verified: true }).response);
    const { dom, button, status } = await mountPage(locale, fetchMock);
    expect(dom.window.location.hash).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toBe(copy.failed);
    expect(status.getAttribute("role")).toBe("alert");
    expect(button.textContent).toBe(copy.retry);
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    button.click();
    await settleMicrotasks();
    expect(status.textContent).toBe(copy.uncertain);
    expect(button.textContent).toBe(copy.retry);
    expect(button.hidden).toBe(false);
    expect(button.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    button.click();
    await settleMicrotasks();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/data-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      signal: expect.anything(),
    });
    expect(status.textContent).toBe(copy.verified);
    expect(status.textContent).not.toMatch(/hesabınız silindi|account.*deleted|deletion.*complete/i);
    expect(status.getAttribute("role")).toBe("status");
    expect(status.hasAttribute("aria-busy")).toBe(false);
    expect(button.hidden).toBe(true);
    expect(button.disabled).toBe(false);
    expect(fetchMock.mock.calls.every((call) => call[1]?.signal?.aborted)).toBe(true);
    expect(fetchMock.mock.calls.map((call) => call[1]?.body)).toEqual(Array(3).fill(JSON.stringify({ token })));
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


describe("standalone verification appearance correctness simulation", () => {
  function choose(page: Awaited<ReturnType<typeof mountPage>>, value: string) {
    page.appearance.value = value;
    page.appearance.dispatchEvent(new page.dom.window.Event("change", { bubbles: true }));
  }

  it("applies a saved light preference in head before enabling controls or consuming the fragment", async () => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("ko", fetchMock, token, { stored: "light", systemDark: true, bootOnly: true });
    const root = page.dom.window.document.documentElement;
    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.themePreference).toBe("light");
    expect(root.style.colorScheme).toBe("light");
    expect(root.classList.contains("dark")).toBe(false);
    expect(page.dom.window.document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(THEME_COLORS.light);
    expect(page.appearance.disabled).toBe(true);
    expect(page.button.hidden).toBe(true);
    expect(page.dom.window.location.hash).toContain(token);
    expect(fetchMock).not.toHaveBeenCalled();
    page.runApplication();
    expect(page.dom.window.location.hash).toBe("");
    expect(page.appearance.disabled).toBe(false);
    expect(page.appearance.value).toBe("light");
    expect(page.button.hidden).toBe(false);
    expect(page.status.textContent).toBe("");
    expect(page.storage.getItem).toHaveBeenCalledExactlyOnceWith(THEME_STORAGE_KEY);
    expect(page.storage.setItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([true, false])("an invalid stored value follows the system (dark=%s)", async (systemDark) => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("hi", fetchMock, token, { stored: "unsupported", systemDark });
    const root = page.dom.window.document.documentElement;
    expect(root.dataset.themePreference).toBe("system");
    expect(root.dataset.theme).toBe(systemDark ? "dark" : "light");
    expect(root.style.colorScheme).toBe(systemDark ? "dark" : "light");
    expect(page.appearance.value).toBe("system");
    expect(page.storage.setItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([false, true])("OS changes follow only system mode, including legacy media=%s", async (legacyMedia) => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("pl", fetchMock, token, { systemDark: true, legacyMedia });
    const root = page.dom.window.document.documentElement;
    page.setSystemDark(false);
    expect(root.dataset.theme).toBe("light");
    choose(page, "dark");
    expect(root.dataset.themePreference).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(page.storage.setItem).toHaveBeenLastCalledWith(THEME_STORAGE_KEY, "dark");
    page.setSystemDark(false);
    expect(root.dataset.theme).toBe("dark");
    choose(page, "system");
    expect(root.dataset.theme).toBe("light");
    page.setSystemDark(true);
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(root.classList.contains("dark")).toBe(true);
    expect(page.appearance.value).toBe("system");
    expect(page.storage.setItem.mock.calls).toEqual([[THEME_STORAGE_KEY, "dark"], [THEME_STORAGE_KEY, "system"]]);
    expect(page.status.textContent).toBe("");
    expect(page.button.hidden).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a failed storage write applies the current-tab choice and announces that limit", async () => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("ar", fetchMock, token, { writeFails: true });
    choose(page, "light");
    expect(page.dom.window.document.documentElement.dir).toBe("rtl");
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("light");
    expect(page.appearance.value).toBe("light");
    expect(page.sessionNotice.hidden).toBe(false);
    expect(page.sessionNotice.getAttribute("role")).toBe("status");
    expect(page.sessionNotice.textContent).toBe(themeCopy("ar").sessionOnly);
    expect(page.status.textContent).toBe("");
    expect(page.button.hidden).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.storage.setItem).toHaveBeenCalledExactlyOnceWith(THEME_STORAGE_KEY, "light");
  });

  it("a blocked storage accessor still permits OS and current-tab appearance without affecting verification", async () => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("ja", fetchMock, token, { blockedStorage: true, systemDark: false });
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("light");
    choose(page, "dark");
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("dark");
    expect(page.sessionNotice.hidden).toBe(false);
    page.storageEvent(THEME_STORAGE_KEY, "light");
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("dark");
    expect(page.appearance.value).toBe("dark");
    expect(page.sessionNotice.hidden).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing matchMedia has a deterministic default and still accepts an explicit choice", async () => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("zh-Hans", fetchMock, token, { noMedia: true });
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("dark");
    expect(page.appearance.value).toBe("system");
    choose(page, "light");
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("light");
    expect(page.dom.window.document.documentElement.style.colorScheme).toBe("light");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("synchronizes only the public localStorage key, with invalid values or clearing returning to system", async () => {
    const fetchMock = vi.fn<PageFetch>();
    const page = await mountPage("en", fetchMock, token, { systemDark: false, stored: "dark" });
    const root = page.dom.window.document.documentElement;
    page.storageEvent("unrelated.preference", "light");
    expect(root.dataset.theme).toBe("dark");
    page.storageEvent(THEME_STORAGE_KEY, "light", page.dom.window.sessionStorage);
    expect(root.dataset.theme).toBe("dark");
    page.storageEvent(THEME_STORAGE_KEY, "light");
    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.themePreference).toBe("light");
    expect(page.appearance.value).toBe("light");
    expect(page.sessionNotice.hidden).toBe(true);
    page.storageEvent(THEME_STORAGE_KEY, "unsupported");
    expect(root.dataset.themePreference).toBe("system");
    expect(root.dataset.theme).toBe("light");
    page.storageEvent(THEME_STORAGE_KEY, "dark");
    expect(root.dataset.theme).toBe("dark");
    page.storageEvent(null, null);
    expect(root.dataset.themePreference).toBe("system");
    expect(root.dataset.theme).toBe("light");
    expect(page.appearance.value).toBe("system");
    expect(page.storage.setItem).not.toHaveBeenCalled();
    expect(page.status.textContent).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("changing appearance during a request neither restarts verification nor extends its deadline", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<PageFetch>(() => new Promise(() => {}));
    const page = await mountPage("en", fetchMock);
    page.button.click();
    await vi.advanceTimersByTimeAsync(10_000);
    const sending = page.status.textContent;
    choose(page, "light");
    expect(page.status.textContent).toBe(sending);
    expect(page.status.getAttribute("aria-busy")).toBe("true");
    expect(page.button.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ token }));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(page.status.textContent).toBe((await copyFor("en")).uncertain);
    expect(page.button.disabled).toBe(false);
    expect(page.dom.window.document.documentElement.dataset.theme).toBe("light");
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(page.storage.setItem.mock.calls).toEqual([[THEME_STORAGE_KEY, "light"]]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("translation text delimiter correctness", () => {
  it("keeps HTML delimiters and JS separators as text in the document and result without changing the two-script structure", async () => {
    const literal = 'Text <sample> & "quoted" </script> \u2028 \u2029';
    const { VERIFICATION_COPY } = await import("@/data/verification-copy");
    const fakeCopy = Object.fromEntries(Object.keys(VERIFICATION_COPY.en).map((key) => [key, `${key}: ${literal}`]));
    const fakeTheme = Object.fromEntries(Object.keys(themeCopy("en")).map((key) => [key, `${key}: ${literal}`]));
    vi.doMock("@/data/verification-copy", () => ({ VERIFICATION_COPY: { ...VERIFICATION_COPY, en: fakeCopy } }));
    vi.doMock("@/components/theme/theme-copy", () => ({ themeCopy: () => fakeTheme }));
    const fetchMock = vi.fn<PageFetch>().mockResolvedValue(reply(200, { verified: true }).response);
    const page = await mountPage("en", fetchMock);
    const document = page.dom.window.document;
    expect(document.title).toBe(fakeCopy.title);
    expect(document.querySelector("h1")?.textContent).toBe(fakeCopy.heading);
    expect(document.querySelector("h1 + p")?.textContent).toBe(fakeCopy.intro);
    expect(page.button.textContent).toBe(fakeCopy.button);
    expect(page.appearance.closest("label")?.textContent).toContain(fakeTheme.label);
    expect([...page.appearance.options].map((option) => option.textContent)).toEqual([fakeTheme.light, fakeTheme.dark, fakeTheme.system]);
    expect(page.sessionNotice.textContent).toBe(fakeTheme.sessionOnly);
    expect(document.querySelector('a[href="/en/contact"]')?.textContent).toBe(fakeCopy.contact);
    expect(document.querySelector('a[href="mailto:support@yulalab.com"]')?.textContent).toBe(fakeCopy.email);
    expect(document.querySelector("sample")).toBeNull();
    expect(document.querySelectorAll("script")).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
    page.button.click();
    await settleMicrotasks();
    expect(page.status.textContent).toBe(fakeCopy.verified);
    expect(page.button.textContent).toBe(fakeCopy.retry);
    expect(page.button.hidden).toBe(true);
  });
});
