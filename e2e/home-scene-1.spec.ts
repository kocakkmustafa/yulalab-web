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

async function infiniteAnimations(page: Page) {
  return page.locator("#scene-1-identity [data-scene1-signals]").evaluate(
    (root) =>
      root.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations === Infinity)
        .length,
  );
}

for (const view of VIEWS) {
  test.describe(`scene 1 identity (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("two CTAs point at real anchors and move there", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-1-identity");
      const products = scene.locator('[data-scene1-cta="products"]');
      const how = scene.locator('[data-scene1-cta="how"]');
      await expect(products).toHaveAttribute("href", "#scene-3-products");
      await expect(how).toHaveAttribute("href", "#scene-4-engineering");
      await expect(products).toHaveText("Ürünleri keşfet");
      await expect(how).toHaveText("Nasıl çalıştığımızı gör");

      for (const [cta, target] of [
        [products, "#scene-3-products"],
        [how, "#scene-4-engineering"],
      ] as const) {
        await cta.scrollIntoViewIfNeeded();
        await cta.focus();
        await expect(cta).toBeFocused();
        const box = await cta.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(new RegExp(`${target}$`));
        await expect
          .poll(() => page.locator(target).evaluate((el) => Math.round(el.getBoundingClientRect().top)))
          .toBeLessThan(view.viewport.height / 2);
        await page.evaluate(() => history.replaceState(null, "", location.pathname));
      }
    });

    test("three example signals are visible, labelled as examples, without overflow", async ({ page }) => {
      await page.goto("/");
      const signals = page.locator("#scene-1-identity [data-scene1-signal]");
      await expect(signals).toHaveCount(3);
      await signals.first().scrollIntoViewIfNeeded();
      for (let i = 0; i < 3; i++) {
        await expect(signals.nth(i)).toBeVisible();
        await expect(signals.nth(i)).toContainText("Örnek");
      }
      await expect(page.locator("#scene-1-identity [data-scene1-signals]")).toContainText(
        "gerçek ürün çıktısı ya da ölçüm değildir",
      );
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  });
}

test.describe("scene 1 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-1-identity").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 1 motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  test("reduced motion: the three signals are static, no infinite animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator("#scene-1-identity [data-scene1-signals]").scrollIntoViewIfNeeded();
    await expect(page.locator("#scene-1-identity [data-scene1-signal]")).toHaveCount(3);
    expect(await infiniteAnimations(page)).toBe(0);
  });

  test("motion allowed: the arrow pulse exists (guards the check above)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.locator("#scene-1-identity [data-scene1-signals]").scrollIntoViewIfNeeded();
    expect(await infiniteAnimations(page)).toBe(3);
  });
});

test.describe("scene 1 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, both CTAs and signals, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator("#scene-1-identity");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator('[data-scene1-cta="products"]')).toHaveText("Explore the products");
    await expect(scene.locator('[data-scene1-cta="how"]')).toHaveText("See how we work");
    await expect(scene.locator("[data-scene1-signal]")).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 1 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 1 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator("#scene-1-identity").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#scene-1-identity")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
