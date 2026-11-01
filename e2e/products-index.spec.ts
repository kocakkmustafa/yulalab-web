import { test, expect } from "@playwright/test";

/**
 * Founder decision 2026-10-31: the products index introduces finished
 * products in one grid. It states no publication status; an app that is not
 * in a store yet carries only its "Coming soon" pill. Publication evidence
 * lives on /transparency.
 */
const STORE_LESS = ["gravita", "lissom", "jablab", "ostinato", "choreia"];

for (const [locale, path, comingSoon, statusWords] of [
  ["tr", "/projects", "Yakında", /Yayın kaydı|Yayında|Araştırma aşamasında|Henüz yayınlanmadılar|yeniden doğrulanmalı/],
  ["en", "/en/projects", "Coming soon", /Publication record|Live|In research|Not released yet|needs re-verification/],
] as const) {
  test.describe(`products index (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("shows all eight products in one grid without publication grouping", async ({ page }) => {
      await expect(page.locator("details")).toHaveCount(0);
      const headings = page.getByRole("heading", { level: 3 });
      await expect(headings).toHaveCount(8);
      await expect(page.locator("main")).not.toContainText(statusWords);
    });

    test("labels only the apps that are not in a store yet", async ({ page }) => {
      await expect(page.getByText(comingSoon, { exact: true })).toHaveCount(STORE_LESS.length);
    });

    test("does not overflow horizontally at 320px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, "page scrolls sideways at 320px").toBe(false);
    });
  });
}

// Founder direction 2026-11-02: each product page opens with a short pitch
// right under the hero, ahead of the feature cards.
test.describe("product pitch", () => {
  for (const [path, title] of [
    ["/projects/ostinato", "Çaldığın her notayı duyan bir pratik koçu."],
    ["/en/projects/lifeos", "The scattered records of your life, in one calm place."],
    ["/ja/projects/braavolabs", null],
  ] as const) {
    test(`opens ${path} with the pitch before the features`, async ({ page }) => {
      await page.goto(path);
      const pitch = page.getByTestId("product-pitch");
      await expect(pitch).toBeVisible();
      if (title) await expect(pitch.getByRole("heading", { level: 2 })).toHaveText(title);
      await expect(pitch.getByRole("heading", { level: 3 })).toHaveCount(3);
      const pitchTop = (await pitch.boundingBox())!.y;
      const featuresTop = (await page.locator("#product-features-heading").boundingBox())!.y;
      expect(pitchTop).toBeLessThan(featuresTop);
    });
  }

  test("leaves Burun Farkı without a pitch", async ({ page }) => {
    await page.goto("/projects/burunfarki");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("product-pitch")).toHaveCount(0);
  });
});
