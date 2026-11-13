import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

const VIEWS = [
  { name: "desktop 1440", viewport: { width: 1440, height: 900 } },
  { name: "mobile 390", viewport: { width: 390, height: 844 } },
] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const view of VIEWS) {
  test.describe(`scene 2 difference (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("three pairs, each approach tagged as capability or vision", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-2-difference");
      await scene.scrollIntoViewIfNeeded();
      const pairs = scene.locator("[data-scene2-pair]");
      await expect(pairs).toHaveCount(3);
      await expect(pairs.locator('[data-scene2-side="pattern"]')).toHaveCount(3);
      await expect(pairs.locator('[data-scene2-side="approach"]')).toHaveCount(3);
      await expect(pairs.nth(0).locator("[data-scene2-badge]")).toHaveText("Mevcut yetenek");
      await expect(pairs.nth(1).locator("[data-scene2-badge]")).toHaveText("Vizyonumuz");
      await expect(pairs.nth(2).locator("[data-scene2-badge]")).toHaveText("Vizyonumuz");
      await expect(pairs.nth(0)).toContainText("Daha fazla ekran, giriş ve model seçimi");
      await expect(pairs.nth(1)).toContainText("Hatalı kesinlik");
      await expect(pairs.nth(2)).toContainText("Sonsuz bildirim");
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("the capability row names its product record and its real status", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-2-difference");
      // Exactly one capability row, with exactly one source line; vision rows carry none.
      await expect(scene.locator('[data-scene2-badge="capability"]')).toHaveCount(1);
      const source = scene.locator("[data-scene2-source]");
      await expect(source).toHaveCount(1);
      await expect(source).toHaveAttribute("data-scene2-source", "projects/lifeos");
      await expect(source).toContainText("LifeOS ürün kaydı (Yayında)");
      await expect(scene.locator('[data-scene2-tag="vision"] [data-scene2-source]')).toHaveCount(0);
    });

    test("no invented number and no 'verified' wording", async ({ page }) => {
      await page.goto("/");
      const text = await page.locator("#scene-2-difference [data-scene2-compare]").innerText();
      expect(text).not.toMatch(/\d/);
      expect(text.toLocaleLowerCase("tr-TR")).not.toMatch(/doğrulan|onaylan|ölçüldü|verified|validated|confirmed|measured/);
      expect(text).toContain("bağımsız bir doğrulama ya da ölçüm değildir");
    });
  });
}

test.describe("scene 2 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-2-difference").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 2 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, three pairs", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator("#scene-2-difference");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene2-pair]")).toHaveCount(3);
    await expect(scene.locator("[data-scene2-badge]").first()).toHaveText("Current capability");
    await expect(scene.locator("[data-scene2-badge]").nth(1)).toHaveText("Our vision");
    await expect(scene.locator("[data-scene2-source]")).toContainText("LifeOS product record (Live)");
    const text = await scene.locator("[data-scene2-compare]").innerText();
    expect(text).not.toMatch(/\d/);
    expect(text.toLowerCase()).not.toMatch(/verified|validated|confirmed|measured/);
    await expect(scene.getByRole("list", { name: /three comparisons/i })).toBeVisible();
  });
});

test.describe("scene 2 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, three pairs, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator("#scene-2-difference");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene2-pair]")).toHaveCount(3);
    await expect(scene.locator("[data-scene2-badge]").first()).toHaveText("Current capability");
    // The status word inside the English sentence is English too (no mixed-script text).
    await expect(scene.locator("[data-scene2-source]")).toHaveText(/^Source: LifeOS product record \(Live\)$/i);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 2 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 2 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator("#scene-2-difference").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#scene-2-difference")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
