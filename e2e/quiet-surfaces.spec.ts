import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      if (/^(experimental-)?webgl2?$/.test(id)) return null;
      return (original as (...a: unknown[]) => unknown).call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
});

// WEB-UX-05g, design E9 (legal / account deletion): one h1, plain text, no glass.
// /support is checked too: the design lists it in E9; its quiet scene tone is a
// separate open decision (see e9-envanter), so only the flat-surface rule is asserted here.
const SURFACES = ["/privacy", "/privacy/lifeos", "/terms", "/support", "/delete-account/lifeos"];

for (const width of [1280, 320]) {
  test.describe(`quiet surfaces at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, locale: "tr-TR" });

    for (const route of SURFACES) {
      test(`${route}: one h1, no glass, no sideways scroll`, async ({ page }) => {
        await page.goto(route);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main .glass")).toHaveCount(0);
        const { client, scroll } = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(scroll).toBeLessThanOrEqual(client);
      });

      test(`${route}: no serious or critical axe violations`, async ({ page }) => {
        await page.goto(route);
        await page.waitForTimeout(1000); // let .page-enter settle before contrast sampling
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      });
    }
  });
}

test.describe("quiet surfaces: focus is visible", () => {
  test.use({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" });
  for (const route of ["/privacy", "/support"]) {
    test(`${route}: a focused card link shows an outline`, async ({ page }) => {
      await page.goto(route);
      const link = page.locator("main a.focusable").first();
      await link.focus();
      const outline = await link.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
      });
      expect(outline.style).not.toBe("none");
      expect(outline.width).toBeGreaterThan(0);
    });
  }
});
