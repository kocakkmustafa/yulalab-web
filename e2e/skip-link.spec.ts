import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.4.1 Bypass Blocks: the first tab stop is a skip link that moves
// focus to <main id="main-content">, skipping the header navigation.
const cases = [
  { path: "/tr/projects", name: "tr projects", label: "İçeriğe geç", viewport: { width: 1440, height: 900 } },
  { path: "/tr", name: "tr home", label: "İçeriğe geç", viewport: { width: 1440, height: 900 } },
  { path: "/ar", name: "ar home (rtl)", label: "انتقل إلى المحتوى", viewport: { width: 1440, height: 900 } },
  { path: "/tr/projects", name: "tr projects mobile 390", label: "İçeriğe geç", viewport: { width: 390, height: 844 } },
  { path: "/tr", name: "tr home mobile 390", label: "İçeriğe geç", viewport: { width: 390, height: 844 } },
];

for (const c of cases) {
  test.describe(`skip link: ${c.name}`, () => {
    test.use({ viewport: c.viewport, locale: "tr-TR" });

    test.beforeEach(async ({ page }) => {
      await page.route("**/*", (route) => {
        const host = new URL(route.request().url()).hostname;
        return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
      });
    });

    test("first Tab is a visible skip link that moves focus into main", async ({ page }) => {
      await page.goto(c.path);
      await expect(page.locator("main#main-content")).toHaveAttribute("tabindex", "-1");
      await page.keyboard.press("Tab");

      const skip = page.locator("a.skip-link");
      await expect(skip).toBeFocused();
      await expect(skip).toHaveText(c.label);
      await expect(skip).toHaveAttribute("href", "#main-content");

      const box = await skip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(c.viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(c.viewport.height);

      // Logical start: left edge in LTR, right edge in RTL.
      const dir = await page.evaluate(() => document.documentElement.dir || "ltr");
      if (dir === "rtl") expect(box!.x + box!.width).toBeGreaterThan(c.viewport.width / 2);
      else expect(box!.x).toBeLessThan(c.viewport.width / 2);

      const blocking = (
        await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
      ).violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => v.id)).toEqual([]);

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main-content$/);
      const where = await page.evaluate(() => {
        const active = document.activeElement;
        const main = document.getElementById("main-content");
        return { inMain: !!main && (active === main || main.contains(active)), header: !!active?.closest("header") };
      });
      expect(where.inMain).toBe(true);
      expect(where.header).toBe(false);

      // The home journey is inert behind its opening loader; wait until it settles.
      await expect(page.locator('[data-loader-visible="true"]')).toHaveCount(0, { timeout: 30_000 });
      // Next Tab lands on the first interactive element inside main, not the site header (the home journey has its own header inside main).
      await page.keyboard.press("Tab");
      const next = await page.evaluate(() => {
        const active = document.activeElement;
        const main = document.getElementById("main-content");
        return { inMain: !!main && main.contains(active) && active !== main };
      });
      expect(next.inMain).toBe(true);
    });
  });
}

// Fixed header (120px desktop, 72px mobile): a #hash jump must land the target
// below it, not underneath (globals.css html scroll-padding-top).
for (const vp of [{ width: 1440, height: 900, header: 120 }, { width: 390, height: 844, header: 72 }]) {
  test(`#hash jump lands below the fixed header at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/en/contact");
    await page.evaluate(() => { window.location.hash = "yollar"; });
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(0);
    await page.waitForTimeout(1200); // smooth scroll settles
    const top = await page.locator("#yollar").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(vp.header);
  });
}
