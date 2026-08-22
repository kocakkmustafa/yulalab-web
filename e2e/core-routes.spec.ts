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
