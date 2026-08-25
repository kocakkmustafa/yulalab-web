import { test, expect } from "@playwright/test";

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

test("unknown routes are noindex and never publish localhost social metadata", async ({ page }) => {
  const response = await page.goto("/__yula_missing_route__", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^https:\/\/yulalab\.com\/opengraph-image/,
  );

  const socialImage = await page.request.get("/opengraph-image");
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

test("production locale routing has bounded canonical redirects", async ({ request }) => {
  for (const host of ["127.0.0.1:4173", "localhost:4173"]) {
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
      expect(response.headers().location).toBe(canonical);
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
      expect(response.headers().location).toBe(`${canonical}?proof=1`);
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
      expect(response.headers().location).toBe(`${canonical}?proof=spoof`);
      const location = new URL(response.headers().location!, origin);
      expect(location.origin).toBe(origin);
      expect(location.pathname).toBe(canonical);
      expect(location.search).toBe("?proof=spoof");
    }

    for (const edgePath of [
      "/tr/%2F%2Fevil.example",
      "/tr/%252F%252Fevil.example",
      "/tr/%5Cevil.example",
      "/tr//evil.example",
    ]) {
      const response = await request.get(`${origin}${edgePath}`, {
        maxRedirects: 0,
      });
      expect([307, 308, 400]).toContain(response.status());

      const rawLocation = response.headers().location;
      if (response.status() === 400) {
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
    const response = await request.get(`http://127.0.0.1:4173${bypassPath}`, {
      maxRedirects: 0,
    });
    expect(response.headers()["x-middleware-rewrite"]).toBeUndefined();
    expect(response.headers().location).toBeUndefined();
  }

  const invalidLocale = await request.get("http://127.0.0.1:4173/fr/contact", {
    maxRedirects: 0,
  });
  expect(invalidLocale.status()).toBe(404);
  expect(invalidLocale.headers().location).toBeUndefined();
});
