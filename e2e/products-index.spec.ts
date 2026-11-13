import { test, expect } from "@playwright/test";

/**
 * The products index introduces the products in one grid. Founder decision
 * 2026-11-09 ("Evet, rozet ekle"): every card carries the status pill of its
 * registry lifecycle (2 live, 1 beta, 5 coming soon). It still draws no
 * publication grouping or publication-record wording; that evidence lives on
 * /transparency.
 */
const STORE_LESS = ["gravita", "lissom", "jablab", "ostinato", "choreia"];

for (const [locale, path, comingSoon, live, beta, statusWords] of [
  ["tr", "/projects", "Yakında", "Yayında", "Beta", /Yayın kaydı|Araştırma aşamasında|Henüz yayınlanmadılar|yeniden doğrulanmalı/],
  ["en", "/en/projects", "Coming soon", "Live", "Beta", /Publication record|In research|Not released yet|needs re-verification/],
] as const) {
  test.describe(`products index (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("shows all eight products in one grid without publication grouping", async ({ page }) => {
      await expect(page.locator("details")).toHaveCount(0);
      const headings = page.getByRole("heading", { level: 2 });
      await expect(headings).toHaveCount(8);
      await expect(page.locator("main")).not.toContainText(statusWords);
    });

    test("labels every product with its registry status pill", async ({ page }) => {
      // scoped to the rows: the filter buttons repeat the same three words
      const rows = page.getByTestId("universe-row");
      await expect(rows.getByText(comingSoon, { exact: true })).toHaveCount(STORE_LESS.length);
      await expect(rows.getByText(live, { exact: true })).toHaveCount(2);
      await expect(rows.getByText(beta, { exact: true })).toHaveCount(1);
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

// WEB-UX-05b: the product universe (grouped list, status filter, desktop-only
// side panel, ?katman= deep link).
test.describe("product universe", () => {
  test("desktop: select opens a non-modal panel, Esc closes it and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/projects");
    const trigger = page.getByRole("button", { name: "Önizle: LifeOS" });
    await expect(trigger).toBeVisible();
    await expect(page.locator("main .glass")).toHaveCount(0);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("universe-panel-open")).toBeVisible();
    await expect(page).toHaveURL(/\?katman=lifeos$/);
    expect(await page.locator('[role="dialog"], [aria-modal="true"]').count()).toBe(0);
    // the rest of the page stays reachable: Tab moves on, nothing is trapped
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
    await trigger.focus();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("universe-panel-open")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("desktop: ?katman= deep link opens the panel; an unknown value opens nothing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/projects?katman=braavolabs");
    await expect(page.getByTestId("universe-panel-open")).toContainText("Braavolabs");
    await page.goto("/projects?katman=does-not-exist");
    await expect(page.getByTestId("universe-panel")).toBeVisible();
    await expect(page.getByTestId("universe-panel-open")).toHaveCount(0);
  });

  test("keyboard: the status filter is operable with Tab and Space and reports pressed state", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/projects");
    const beta = page.getByTestId("universe-filter").getByRole("button", { name: "Beta" });
    await beta.focus();
    await page.keyboard.press("Space");
    await expect(beta).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("universe-row")).toHaveCount(1);
    await expect(page.getByTestId("universe-count")).toHaveText(/1/);
  });

  test("mobile: no panel, rows are plain links to the product pages", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/projects?katman=lifeos");
    await expect(page.getByTestId("universe-row")).toHaveCount(8);
    await expect(page.getByTestId("universe-panel")).toHaveCount(0);
    await expect(page.getByTestId("universe-panel-open")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "LifeOS", exact: true }).first()).toHaveAttribute("href", /\/projects\/lifeos$/);
  });
});

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
