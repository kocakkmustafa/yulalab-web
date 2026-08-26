import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
      await expect(page.locator("body")).not.toContainText(
        /application error|something went wrong/i,
      );
      await expect(page).not.toHaveTitle(/404/i);
    });
  }
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

test("unsupported locale fails closed before locale rendering", async ({ request }) => {
  const response = await request.get("/fr/__yula_missing_route__", { maxRedirects: 0 });
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

test("language switcher moves between TR and EN on the same page", async ({
  page,
}) => {
  // LocaleSwitcher is a <button> that navigates client-side via next-intl's
  // router (not a plain <a href>) — see src/components/layout/LocaleSwitcher.tsx.
  await page.goto("/manifesto");
  const switchToEn = page.getByRole("button", { name: /switch to en/i });
  await switchToEn.click();
  await expect(page).toHaveURL(/\/en\/manifesto$/);
});
