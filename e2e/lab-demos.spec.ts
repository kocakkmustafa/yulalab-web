import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P2-01a: the demo grid on /lab. Flags are read at `next build`, so this
 * spec follows the build it runs against (same convention as the LifeOS and
 * Ostinato demo specs): both flags "1" in the test process means an open-mode
 * build (CI job `leads-open-e2e`), otherwise the default closed build.
 */
const ON = process.env.LIFEOS_DEMO_ENABLED === "1" && process.env.OSTINATO_DEMO_ENABLED === "1";
const PAGES = [
  ["tr", "/lab", "Aç: LifeOS", "Aç: Ostinato", "Kapat: LifeOS", "Kapat: Ostinato"],
  ["en", "/en/lab", "Open: LifeOS", "Open: Ostinato", "Close: LifeOS", "Close: Ostinato"],
  ["ar", "/ar/lab", "افتح: LifeOS", "افتح: Ostinato", "أغلق: LifeOS", "أغلق: Ostinato"],
] as const;

/** JS bodies fetched so far, to prove which code arrived. */
function trackScripts(page: Page, skip?: RegExp) {
  const bodies: Promise<string>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script" && !(skip && skip.test(r.url()))) bodies.push(r.text().catch(() => ""));
  });
  return async () => (await Promise.all(bodies)).join("\n");
}

if (!ON) {
  test("flags closed: /lab has no demo cards, no demo section and no demo code", async ({ page }) => {
    // Every page's header and footer link to product pages, so Next prefetches
    // the product route chunk (which carries the product demos) on any page. That
    // is site-wide and not the Lab's doing; the Lab's own scripts are checked.
    const scripts = trackScripts(page, /%5Bslug%5D|\[slug\]/);
    await page.goto("/lab");
    await page.waitForLoadState("networkidle");
    const js = await scripts();
    for (const needle of ["lifeos-set", "rhythm-start", "lifeos-decision-demo", "LIFEOS_DEMO_ENABLED", "OSTINATO_DEMO_ENABLED"]) {
      expect(js).not.toContain(needle);
    }
    await expect(page.getByTestId("lab-demos")).toHaveCount(0);
    await expect(page.getByTestId("lab-demo-card-lifeos-decision")).toHaveCount(0);
    await expect(page.getByTestId("lab-demo-card-ostinato-rhythm")).toHaveCount(0);
    await expect(page.getByTestId("lab-notes")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("lab-demo-card");
    expect(html).not.toContain("lifeos-decision-demo");
  });
} else {
  for (const [locale, url, openLife, openOst, closeLife, closeOst] of PAGES) {
    test.describe(`lab demos (${locale})`, () => {
      test("two cards as a list; demo code is absent on first load and arrives only on Open", async ({ page }) => {
        const scripts = trackScripts(page);
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        const list = page.getByTestId("lab-demos").getByRole("list");
        await expect(list.getByRole("listitem")).toHaveCount(2);
        await expect(page.getByRole("button", { name: openLife })).toBeVisible();
        await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
        const before = await scripts();
        expect(before).not.toContain("lifeos-set");
        expect(before).not.toContain("rhythm-start");
        expect(before).not.toContain("lifeos-decision-demo");
        expect(before).not.toContain("LIFEOS_DEMO_ENABLED");
        expect(before).not.toContain("OSTINATO_DEMO_ENABLED");

        await page.getByRole("button", { name: openLife }).click();
        await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
        await expect(page.getByTestId("lifeos-set")).toBeVisible();
        const afterLife = await scripts();
        expect(afterLife).toContain("lifeos-set");
        expect(afterLife).not.toContain("rhythm-start");
        expect(errors).toEqual([]);
      });

      test("keyboard: Open with Enter focuses the demo, Close returns focus; Ostinato starts", async ({ page }) => {
        await page.goto(url);
        const open = page.getByRole("button", { name: openOst });
        await open.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("ostinato-rhythm-demo")).toBeVisible();
        await expect(page.getByTestId("lab-demo-panel")).toBeFocused();
        await expect(page.getByTestId("rhythm-start")).toBeVisible();
        await page.getByTestId("rhythm-start").focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("rhythm-start")).toHaveCount(0);
        await page.getByRole("button", { name: closeOst }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
        await expect(open).toBeFocused();
      });

      test("LifeOS demo works end to end after Open", async ({ page }) => {
        await page.goto(url);
        await page.getByRole("button", { name: openLife }).click();
        const demo = page.getByTestId("lifeos-decision-demo");
        await expect(demo).toBeVisible();
        await demo.getByTestId("lifeos-set").focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("lifeos-done-body")).toBeVisible();
        await page.getByRole("button", { name: closeLife }).click();
        await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
      });

      test("axe: no serious violations with a demo open", async ({ page }) => {
        await page.goto(url);
        await page.getByRole("button", { name: openLife }).click();
        await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      });
    });
  }

  test("reduced motion: opening a demo still works", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/lab");
    await page.getByRole("button", { name: "Aç: Ostinato" }).click();
    await expect(page.getByTestId("rhythm-start")).toBeVisible();
    await context.close();
  });

  test("mobile 390x844: cards stack, no horizontal scroll, demo opens", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/lab");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("lab-demo-card-lifeos-decision")).toBeVisible();
    await page.getByRole("button", { name: "Aç: LifeOS" }).tap();
    await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test("a failed demo chunk shows an error and Try again recovers", async ({ page }) => {
    let blocked = false;
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => (blocked ? route.abort() : route.continue()));
    await page.goto("/en/lab");
    await page.waitForLoadState("networkidle");
    blocked = true; // from now on, only the demo chunk can be requested
    await page.getByRole("button", { name: "Open: LifeOS" }).click();
    await expect(page.getByTestId("lab-demo-error")).toBeVisible();
    await expect(page.getByTestId("lab-demo-live")).toHaveText(/could not be loaded/);
    await expect(page.getByTestId("lab-demo-retry")).toBeFocused();
    blocked = false;
    await page.getByTestId("lab-demo-retry").click();
    await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
  });

  test("no-JS: no Open button, honest links to the product pages", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/lab");
    await expect(page.getByTestId("lab-demo-card-lifeos-decision")).toBeVisible();
    await expect(page.getByTestId("lab-demo-open-lifeos-decision")).toHaveCount(0);
    await expect(page.getByTestId("lab-demo-card-lifeos-decision").getByRole("link")).toHaveAttribute("href", "/projects/lifeos#dene");
    await context.close();
  });
}
