import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

// Same targets as HOME_DOORS (src/components/landing/home-doors.ts), in order.
const HREFS = ["/projects", "/consulting", "/contact#yollar", "/lab", "/transparency"];

for (const l of [{ name: "tr", prefix: "" }, { name: "en", prefix: "/en" }]) {
  test.describe(`/start ${l.name} desktop`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("one h1, four doors, hrefs equal HOME_DOORS, one glass surface", async ({ page }) => {
      await page.goto(`${l.prefix}/start`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("[data-gate]")).toHaveCount(4);
      const hrefs = await page.locator("[data-gates-page] [data-gate] a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
      expect(hrefs).toEqual(HREFS.map((h) => `${l.prefix}${h}`));
      expect(hrefs.join(" ")).not.toMatch(/mailto|studio/);
      const glass = await page.locator("[data-gates-page] .glass").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
      expect(glass).toBeLessThanOrEqual(1);
      const tooSmall = await page.locator("[data-gate] a").evaluateAll((els) =>
        els.filter((n) => n.getBoundingClientRect().height < 43.5).map((n) => n.textContent));
      expect(tooSmall).toEqual([]);
    });

    test("keyboard Tab walks the door links in order", async ({ page }) => {
      await page.goto(`${l.prefix}/start`);
      const links = page.locator("[data-gate] a");
      await links.first().focus();
      for (let i = 1; i < HREFS.length; i++) {
        await page.keyboard.press("Tab");
        await expect(links.nth(i)).toBeFocused();
      }
    });

    test("no serious or critical axe violations on the page body", async ({ page }) => {
      await page.goto(`${l.prefix}/start`);
      await page.waitForTimeout(1000); // let .page-enter settle before contrast sampling
      const serious = (await new AxeBuilder({ page }).include("[data-gates-page]").analyze()).violations
        .filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(serious).toEqual([]);
    });
  });

  test.describe(`/start ${l.name} mobile`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("four flat rows, no glass, no horizontal scroll", async ({ page }) => {
      await page.goto(`${l.prefix}/start`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("[data-gate]")).toHaveCount(4);
      const glass = await page.locator("[data-gates-page] .glass").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
      expect(glass).toBe(0);
      const filters = await page.locator("[data-gate]").evaluateAll((els) =>
        els.map((e) => getComputedStyle(e).backdropFilter + "|" + getComputedStyle(e).borderRadius));
      for (const f of filters) expect(f).toBe("none|0px");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    });
  });
}
