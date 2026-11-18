import { test, expect } from "@playwright/test";

/**
 * Founder decision 2026-11-18: the Burun Farkı product page and every site
 * link to it are removed. /privacy/burunfarki stays reachable (store listing)
 * but is not listed in menus or lists.
 */
for (const [locale, prefix] of [["tr", ""], ["en", "/en"], ["ar", "/ar"]] as const) {
  test.describe(`Burun Farkı removed (${locale})`, () => {
    test("/projects/burunfarki redirects permanently to /projects", async ({ request, page }) => {
      const response = await request.get(`${prefix}/projects/burunfarki`, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers()["location"]).toMatch(new RegExp(`${prefix}/projects$`));
      await page.goto(`${prefix}/projects/burunfarki`);
      await expect(page).toHaveURL(new RegExp(`${prefix}/projects$`));
    });

    test("the products list, home page and footer carry no Burun Farkı link", async ({ page }) => {
      for (const path of [`${prefix}/projects`, prefix || "/"]) {
        await page.goto(path);
        await expect(page.locator('a[href$="/projects/burunfarki"]')).toHaveCount(0);
        await expect(page.locator('a[href*="burunfark.com"]')).toHaveCount(0);
        await expect(page.locator('footer a[href$="/privacy/burunfarki"]')).toHaveCount(0);
      }
    });

    test("/privacy/burunfarki still answers 200 and the privacy index does not list it", async ({ page }) => {
      const response = await page.goto(`${prefix}/privacy/burunfarki`);
      expect(response?.status()).toBe(200);
      await page.goto(`${prefix}/privacy`);
      await expect(page.locator('main a[href$="/privacy/burunfarki"]')).toHaveCount(0);
    });
  });
}

test("sitemap lists no Burun Farkı URL", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(await response.text()).not.toContain("burunfarki");
});
