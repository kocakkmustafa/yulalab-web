import { test, expect } from "@playwright/test";

/**
 * Page-level proof that the dated claims are actually rendered.
 *
 * Founder decision 2026-10-31: product pages introduce the finished product,
 * and the claims with their provenance and freshness moved to /transparency.
 * This guards both halves: the evidence is on the transparency page (never
 * "computed, rendered nowhere"), and the product pages no longer carry it.
 */
for (const [locale, path, heading] of [
  ["tr", "/transparency", "İddialar ve kaynakları"],
  ["en", "/en/transparency", "Claims and sources"],
] as const) {
  test.describe(`product records on the transparency page (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("renders under a real heading, not a styled paragraph", async ({ page }) => {
      await expect(page.getByRole("heading", { name: heading, level: 2 })).toBeVisible();
    });

    test("shows each claim with its provenance", async ({ page }) => {
      const section = page.locator("section", { has: page.getByRole("heading", { name: heading }) });
      await expect(section.getByRole("heading", { name: "Burun Farkı", level: 3 })).toBeVisible();
      const items = section.getByRole("listitem");
      await expect(items.first()).toBeVisible();
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        await expect(items.nth(i)).toContainText(/\d{4}-\d{2}-\d{2}/);
      }
    });

    test("makes the public source a followable link and never links an internal path", async ({ page }) => {
      const section = page.locator("section", { has: page.getByRole("heading", { name: heading }) });
      await expect(section.getByRole("link", { name: /^(source|kaynak)$/i }).first()).toHaveAttribute("href", /^https:\/\//);
      const hrefs = await section.getByRole("link").evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
      for (const href of hrefs) {
        expect(href, `"${href}" is presented as a link but is not a URL`).toMatch(/^https?:\/\//);
      }
    });
  });
}

for (const slug of ["burunfarki", "lifeos", "braavolabs", "choreia"]) {
  test(`the ${slug} product page carries no dated claims or publication status`, async ({ page }) => {
    await page.goto(`/en/projects/${slug}`);
    await expect(page.getByRole("heading", { name: "Claims and sources" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/needs re-verification|verified \d{4}-\d{2}-\d{2}|Live on iOS|public preview/i);
  });
}
