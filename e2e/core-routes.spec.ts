import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SUPPORTED_LOCALES } from "../src/i18n/locales";

const e2ePort = Number(process.env.YULA_E2E_PORT ?? "4173");

test("explicit Turkish URLs override English browser and cookie preferences", async ({ browser }) => {
  const origin = `http://127.0.0.1:${e2ePort}`;
  const context = await browser.newContext({ locale: "en-US" });
  try {
    const page = await context.newPage();
    for (const [entry, canonical] of [
      ["/tr/contact", "/contact"],
      ["/%74r/data-request/verify", "/data-request/verify"],
    ]) {
      await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: origin }]);
      await page.goto(`${origin}${entry}`);
      await expect(page).toHaveURL(`${origin}${canonical}`);
      await expect(page.locator("html")).toHaveAttribute("lang", "tr");
      expect((await context.cookies()).find((cookie) => cookie.name === "NEXT_LOCALE")?.value).toBe("tr");
    }
  } finally {
    await context.close();
  }
});

// TR is the root locale (no prefix), EN is served under /en — see
// src/i18n/routing.ts ("as-needed" localePrefix). Every route here must
// resolve for both locales with no error boundary and no forbidden
// leftover copy (see scripts/verify-claims-local.mjs for the static,
// non-rendered equivalent of the last two checks).
const STATIC_ROUTES = [
  "/",
  "/manifesto",
  "/transparency",
  "/projects",
  "/contact",
  "/support",
  "/privacy",
  "/privacy/lifeos",
  "/delete-account/lifeos",
  "/delete-account/motion",
  "/privacy/motion",
  "/terms",
  "/notes",
];

const PRODUCT_SLUGS = [
  "braavolabs",
  "burunfarki",
  "lifeos",
  "gravita",
  "lissom",
  "jablab",
  "ostinato",
  "choreia",
];

const PRODUCT_ROUTES = PRODUCT_SLUGS.map((slug) => `/projects/${slug}`);

const ALL_ROUTES = [...STATIC_ROUTES, ...PRODUCT_ROUTES];

for (const route of ALL_ROUTES) {
  for (const locale of ["tr", "en"] as const) {
    const path = locale === "tr" ? route : `/en${route}`;

    test(`${path} loads with no error boundary`, async ({ page }) => {
      const isHomepage = path === "/" || path === "/en/";
      if (isHomepage) test.setTimeout(60_000);
      const response = await page.goto(path, {
        waitUntil: isHomepage ? "domcontentloaded" : "load",
      });
      expect(response?.status()).toBeLessThan(400);

      // Next.js's default error boundary and not-found page both render an
      // <h1>; a broken route often still 200s (client-side render) so the
      // status check alone isn't enough — assert real content landed.
      // Privacy copy may legitimately discuss "application errors". Match
      // the error boundary's heading rather than every word in the page.
      await expect(page.getByRole("heading", {
        name: /^(application error|something went wrong)/i,
      })).toHaveCount(0);
      await expect(page).not.toHaveTitle(/404/i);
    });
  }
}

for (const localeCase of [
  {
    path: "/delete-account/lifeos",
    canonical: "https://yulalab.com/delete-account/lifeos",
    account: "Silme talebi gönder",
    data: "Veri silme talebi gönder",
  },
  {
    path: "/en/delete-account/lifeos",
    canonical: "https://yulalab.com/en/delete-account/lifeos",
    account: "Email a deletion request",
    data: "Email a data deletion request",
  },
] as const) {
  test(`${localeCase.path} offers account and partial data deletion without the app`, async ({ page }) => {
    const response = await page.goto(localeCase.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/LifeOS/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", localeCase.canonical);
    await expect(page.getByRole("link", { name: new RegExp(localeCase.account) })).toHaveAttribute(
      "href", "mailto:support@yulalab.com?subject=LifeOS%20account%20deletion",
    );
    await expect(page.getByRole("link", { name: new RegExp(localeCase.data) })).toHaveAttribute(
      "href", "mailto:support@yulalab.com?subject=LifeOS%20data%20deletion",
    );
  });
}

// Shared account deletion URL of the five Motion store listings (Play: request without the app).
for (const localeCase of [
  {
    path: "/delete-account/motion",
    canonical: "https://yulalab.com/delete-account/motion",
    account: "E-postayla silme talebi gönder",
  },
  {
    path: "/en/delete-account/motion",
    canonical: "https://yulalab.com/en/delete-account/motion",
    account: "Email an account deletion request",
  },
] as const) {
  test(`${localeCase.path} offers Motion account deletion without the app`, async ({ page }) => {
    const response = await page.goto(localeCase.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Motion/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", localeCase.canonical);
    await expect(page.getByRole("link", { name: new RegExp(localeCase.account) })).toHaveAttribute(
      "href", "mailto:support@yulalab.com?subject=Motion%20account%20deletion",
    );
    await expect(page.locator("[data-motion-deletion-steps] > li")).toHaveCount(3);
  });
}

test("homepage renders the product-lab identity, not the retired venture-studio framing", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/ürün laboratuvarı/i);
  await expect(page.locator("body")).not.toContainText(/girişim stüdyosu/i);
});

test("homepage EN renders the product-lab identity", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/product lab/i);
  await expect(page.locator("body")).not.toContainText(/venture studio/i);
});

const MISSING_ROUTE_CASES = [
  {
    locale: "tr",
    path: "/__yula_missing_route__",
    lang: "tr",
    title: "Sayfa bulunamadı.",
    home: "Ana sayfa",
    canonical: "https://yulalab.com",
    ogLocale: "tr_TR",
  },
  {
    locale: "en",
    path: "/en/__yula_missing_route__",
    lang: "en",
    title: "Page not found.",
    home: "Home",
    canonical: "https://yulalab.com/en",
    ogLocale: "en_US",
  },
] as const;

const MISSING_ROUTE_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 720 },
] as const;

for (const localeCase of MISSING_ROUTE_CASES) {
  for (const viewport of MISSING_ROUTE_VIEWPORTS) {
    test(`locale-aware 404 ${localeCase.locale} ${viewport.label}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.route("**/_vercel/insights/script.js", async (route) => {
        const requestUrl = new URL(route.request().url());
        if (!["127.0.0.1", "localhost"].includes(requestUrl.hostname)) {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/javascript; charset=utf-8",
          body: "globalThis.va = globalThis.va || function () {};",
        });
      });

      const expectedTopLevel404Console: string[] = [];
      const unexpectedConsoleErrors: string[] = [];
      const expectedTopLevel404Responses: string[] = [];
      const unexpectedHttpResponses: string[] = [];
      const failedRequests: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const locationUrl = message.location().url;
        const locationPath = locationUrl ? new URL(locationUrl).pathname : "";
        if (
          message.text() ===
            "Failed to load resource: the server responded with a status of 404 (Not Found)" &&
          locationPath === localeCase.path
        ) {
          expectedTopLevel404Console.push(message.text());
          return;
        }
        unexpectedConsoleErrors.push(`${locationUrl || "unknown"} ${message.text()}`);
      });
      page.on("response", (httpResponse) => {
        if (httpResponse.status() < 400) return;
        const request = httpResponse.request();
        const responseUrl = new URL(httpResponse.url());
        const summary = `${httpResponse.status()} ${request.method()} ${request.resourceType()} ${responseUrl.pathname}`;
        if (
          httpResponse.status() === 404 &&
          request.method() === "GET" &&
          request.isNavigationRequest() &&
          request.resourceType() === "document" &&
          responseUrl.pathname === localeCase.path
        ) {
          expectedTopLevel404Responses.push(summary);
          return;
        }
        unexpectedHttpResponses.push(summary);
      });
      page.on("requestfailed", (request) => {
        failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`);
      });

      const response = await page.goto(localeCase.path, { waitUntil: "load" });
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", localeCase.lang);
      await expect(page.getByRole("heading", { name: localeCase.title })).toBeVisible();
      await expect(
        page.getByRole("main").getByRole("link", { name: localeCase.home, exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('meta[name="robots"][content*="noindex"][content*="nofollow"]'),
      ).toHaveAttribute(
        "content",
        /(?=.*noindex)(?=.*nofollow)/i,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        localeCase.canonical,
      );
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        "content",
        localeCase.ogLocale,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        new RegExp(localeCase.title.replace(".", "\\."), "i"),
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        localeCase.canonical,
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /^https:\/\/yulalab\.com\/opengraph-image/,
      );

      const fit = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(fit.scrollWidth).toBeLessThanOrEqual(fit.innerWidth + 1);

      const pageEntrance = page.locator(".page-enter").first();
      await pageEntrance.evaluate(async (element) => {
        await Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
      });
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        accessibility.violations.filter((violation) =>
          ["serious", "critical"].includes(violation.impact ?? ""),
        ),
      ).toEqual([]);
      expect(expectedTopLevel404Console).toHaveLength(1);
      expect(expectedTopLevel404Responses).toEqual([
        `404 GET document ${localeCase.path}`,
      ]);
      expect(unexpectedConsoleErrors).toEqual([]);
      expect(unexpectedHttpResponses).toEqual([]);
      expect(failedRequests).toEqual([]);

      await page.screenshot({
        path: testInfo.outputPath(`${localeCase.locale}-${viewport.label}.png`),
        fullPage: true,
      });
    });
  }
}

const DYNAMIC_MISSING_ROUTE_CASES = [
  {
    label: "project tr",
    path: "/projects/__missing_product__",
    lang: "tr",
    heading: "Sayfa bulunamadı.",
    pageTitle: "Sayfa bulunamadı. · YULA Lab",
    canonical: "https://yulalab.com",
    ogLocale: "tr_TR",
  },
  {
    label: "project en",
    path: "/en/projects/__missing_product__",
    lang: "en",
    heading: "Page not found.",
    pageTitle: "Page not found. · YULA Lab",
    canonical: "https://yulalab.com/en",
    ogLocale: "en_US",
  },
  {
    label: "case study tr",
    path: "/case-studies/__missing_case__",
    lang: "tr",
    heading: "Sayfa bulunamadı.",
    pageTitle: "Sayfa bulunamadı. · YULA Lab",
    canonical: "https://yulalab.com",
    ogLocale: "tr_TR",
  },
  {
    label: "case study en",
    path: "/en/case-studies/__missing_case__",
    lang: "en",
    heading: "Page not found.",
    pageTitle: "Page not found. · YULA Lab",
    canonical: "https://yulalab.com/en",
    ogLocale: "en_US",
  },
] as const;

for (const routeCase of DYNAMIC_MISSING_ROUTE_CASES) {
  test(`locale-aware dynamic 404 ${routeCase.label}`, async ({ page }) => {
    const response = await page.goto(routeCase.path, { waitUntil: "load" });

    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", routeCase.lang);
    await expect(page.getByRole("heading", { name: routeCase.heading })).toBeVisible();
    await expect(page).toHaveTitle(routeCase.pageTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      routeCase.canonical,
    );
    await expect(
      page.locator('meta[name="robots"][content*="noindex"][content*="nofollow"]'),
    ).toHaveAttribute("content", /(?=.*noindex)(?=.*nofollow)/i);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      routeCase.heading,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      routeCase.ogLocale,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      routeCase.canonical,
    );
  });
}

test("unsupported locale fails closed before locale rendering", async ({ request }) => {
  // "sv" is outside the fourteen supported locales (fr became supported).
  const response = await request.get("/sv/__yula_missing_route__", { maxRedirects: 0 });
  expect(response.status()).toBe(404);
  expect(response.headers().location).toBeUndefined();
  expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
  expect(await response.text()).toBe("");
});

test("404 social image is a real canonical PNG", async ({ request }) => {
  const socialImage = await request.get("/opengraph-image");
  expect(socialImage.ok()).toBe(true);
  expect(socialImage.headers()["content-type"]).toContain("image/png");
});

test("missing top-level assets return 404 without a locale server error", async ({ request }) => {
  for (const path of ["/favicon.ico", "/missing.svg", "/asset.example.js"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(response.headers().location).toBeUndefined();
  }
  const icon = await request.get("/icon.svg");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
});

test("products index links to every product detail page", async ({
  page,
}) => {
  await page.goto("/projects");
  for (const slug of PRODUCT_SLUGS) {
    await expect(
      page.locator(`a[href="/projects/${slug}"], a[href$="/projects/${slug}"]`).first(),
    ).toBeAttached();
  }
});

test("client navigation plays one route veil that never blocks the next page", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".route-veil")).toHaveCount(0);
  await page.locator('main a[href$="/projects/lifeos"]').first().click();
  await expect(page).toHaveURL(/\/projects\/lifeos$/);
  const veil = page.locator(".route-veil");
  await expect(veil).toHaveCount(1);
  await expect(veil).toHaveAttribute("aria-hidden", "true");
  expect(await veil.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("route veil stays off under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${e2ePort}/projects`);
    await page.locator('main a[href$="/projects/lifeos"]').first().click();
    await expect(page).toHaveURL(/\/projects\/lifeos$/);
    await expect(page.locator(".route-veil")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("language switcher moves between TR and EN on the same page", async ({
  page,
}) => {
  // LocaleSwitcher is a labelled native <select> of the fourteen locales that
  // navigates client-side via next-intl's router — see
  // src/components/layout/LocaleSwitcher.tsx.
  await page.goto("/manifesto");
  await page.locator("header").getByRole("combobox", { name: "Dil", exact: true }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/manifesto$/);
});

test("production locale routing has bounded canonical redirects", async ({ request }) => {
  for (const host of [`127.0.0.1:${e2ePort}`, `localhost:${e2ePort}`]) {
    const origin = `http://${host}`;

    const contact = await request.get(`${origin}/contact`, { maxRedirects: 0 });
    expect(contact.status(), `${host}/contact redirected to itself`).toBe(200);

    const studio = await request.get(
      `${origin}/studio?returnTo=%2F%2Fevil.example%2Fstudio`,
      { maxRedirects: 0 },
    );
    expect(studio.status()).toBe(307);
    expect(studio.headers().location).toBe("/contact");
    const studioLocation = new URL(studio.headers().location!, origin);
    expect(studioLocation.origin).toBe(origin);
    expect(studioLocation.pathname).toBe("/contact");
    expect(studioLocation.hostname).not.toBe("evil.example");

    const englishContact = await request.get(`${origin}/en/contact`, { maxRedirects: 0 });
    expect(englishContact.status()).toBe(200);

    const englishStudio = await request.get(`${origin}/en/studio`, { maxRedirects: 0 });
    expect(englishStudio.status()).toBe(307);
    expect(englishStudio.headers().location).toBe("/en/contact");
    const englishLocation = new URL(englishStudio.headers().location!, origin);
    expect(englishLocation.origin).toBe(origin);
    expect(englishLocation.pathname).toBe("/en/contact");

    for (const [prefixed, canonical] of [
      ["/tr/contact", "/contact"],
      ["/tr/studio", "/studio"],
    ] as const) {
      const response = await request.get(`${origin}${prefixed}`, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location!, origin).href).toBe(`${origin}${canonical}`);
      const location = new URL(response.headers().location!, origin);
      expect(location.origin).toBe(origin);
      expect(location.pathname).toBe(canonical);
      expect(location.search).toBe("");
    }

    for (const [prefixed, canonical] of [
      ["/tr/contact?proof=1", "/contact"],
      ["/tr/studio?proof=1", "/studio"],
    ] as const) {
      const response = await request.get(`${origin}${prefixed}`, {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location!, origin).href).toBe(`${origin}${canonical}?proof=1`);
      const location = new URL(response.headers().location!, origin);
      expect(location.origin).toBe(origin);
      expect(location.pathname).toBe(canonical);
      expect(location.search).toBe("?proof=1");
    }

    for (const [prefixed, canonical] of [
      ["/tr/contact?proof=spoof", "/contact"],
      ["/tr/studio?proof=spoof", "/studio"],
    ] as const) {
      const response = await request.get(`${origin}${prefixed}`, {
        headers: { "x-next-intl-locale": "tr" },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location!, origin).href).toBe(`${origin}${canonical}?proof=spoof`);
      const location = new URL(response.headers().location!, origin);
      expect(location.origin).toBe(origin);
      expect(location.pathname).toBe(canonical);
      expect(location.search).toBe("?proof=spoof");
    }

    for (const edgePath of [
      "/tr/%2F%2Fevil-host",
      "/tr/%252F%252Fevil-host",
      "/tr/%5Cevil-host",
      "/tr//evil-host",
      "/tr/%2F%2Fevil.example",
      "/tr/%252F%252Fevil.example",
      "/tr/%5Cevil.example",
      "/tr//evil.example",
    ]) {
      const response = await request.get(`${origin}${edgePath}`, {
        maxRedirects: 0,
      });
      expect([307, 308, 400, 404]).toContain(response.status());

      const rawLocation = response.headers().location;
      if (response.status() === 400 || response.status() === 404) {
        expect(rawLocation).toBeUndefined();
      } else {
        expect(rawLocation).toBeDefined();
        expect(rawLocation!.startsWith("//")).toBe(false);
        expect(new URL(rawLocation!, origin).origin).toBe(origin);
      }
    }
  }

  for (const bypassPath of [
    "/api/leads",
    "/robots.txt",
    "/sitemap.xml",
    "/opengraph-image",
    "/asset.example.js",
  ]) {
    const response = await request.get(`http://127.0.0.1:${e2ePort}${bypassPath}`, {
      maxRedirects: 0,
    });
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
    expect(response.headers().location).toBeUndefined();
  }

  const invalidLocale = await request.get(`http://127.0.0.1:${e2ePort}/sv/contact`, {
    maxRedirects: 0,
  });
  expect(invalidLocale.status()).toBe(404);
  expect(invalidLocale.headers().location).toBeUndefined();
});

test("sitemap pages advertise reciprocal language alternates in their HTML", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/support");
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const entries = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(document.getElementsByTagNameNS("http://www.sitemaps.org/schemas/sitemap/0.9", "url")).map((entry) => ({
      url: entry.getElementsByTagNameNS("http://www.sitemaps.org/schemas/sitemap/0.9", "loc")[0].textContent!,
      languages: Object.fromEntries(Array.from(entry.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link")).map((link) => [link.getAttribute("hreflang")!, link.getAttribute("href")!])),
    }));
  }, await sitemap.text());
  expect(entries.length).toBeGreaterThan(0);
  const knownUrls = new Set(entries.map((entry) => entry.url.replace(/\/$/, "")));
  for (const entry of entries) {
    const url = new URL(entry.url);
    expect(url.origin).toBe("https://yulalab.com");
    expect(Object.keys(entry.languages).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    for (const alternate of Object.values(entry.languages)) {
      expect(knownUrls.has(alternate.replace(/\/$/, ""))).toBe(true);
    }
    const response = await page.request.get(url.pathname || "/");
    expect(response.status(), entry.url).toBe(200);
    const metadata = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, "text/html");
      return {
        canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
        languages: Object.fromEntries(Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')).map((link) => [link.hreflang, link.href])),
      };
    }, await response.text());
    const normalize = (languages: Record<string, string>) => Object.fromEntries(Object.entries(languages).map(([language, href]) => [language, href.replace(/\/$/, "")]));
    expect(metadata.canonical?.replace(/\/$/, ""), entry.url).toBe(entry.url.replace(/\/$/, ""));
    expect(normalize(metadata.languages), entry.url).toEqual(normalize(entry.languages));
  }
});
