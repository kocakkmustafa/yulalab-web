import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P1-02: Ostinato rhythm feel try-out behind OSTINATO_DEMO_ENABLED.
 * The flag is read at `next build`, so this spec follows the build it runs
 * against: OSTINATO_DEMO_ENABLED=1 in the test process means an open-mode
 * build (CI job `leads-open-e2e`), otherwise the default closed-mode build.
 */
const ON = process.env.OSTINATO_DEMO_ENABLED === "1";
const PAGES = [
  ["tr", "/projects/ostinato", "Vuruşu başlat", /Tur sonucu/, /Zamanlama doğruluğu: %\d+/] as const,
  ["en", "/en/projects/ostinato", "Start the beat", /Round result/, /Timing accuracy: \d+%/] as const,
];
const demo = (page: import("@playwright/test").Page) => page.getByTestId("ostinato-rhythm-demo");

if (!ON) {
  test("flag off: the Ostinato page has no rhythm demo ", async ({ page }) => {
    await page.goto("/projects/ostinato");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("pd-ekran")).toBeVisible();
    await expect(demo(page)).toHaveCount(0);
    // The message catalogue is serialised into every page, so check the DOM, not the bytes.
    await expect(page.getByRole("heading", { name: "Vuruşla birlikte dokun." })).toHaveCount(0);
    expect(await page.content()).not.toContain("ostinato-rhythm-demo");
  });
} else {
  for (const [locale, url, startLabel, resultHeading, accuracy] of PAGES) {
    test.describe("ostinato rhythm demo (" + locale + ")", () => {
      test("Space taps give a timing result, an announced total, and no network", async ({ page }) => {
        const problems: string[] = [];
        page.on("pageerror", (e) => problems.push(e.message));
        await page.goto(url + "#dene");
        await expect(demo(page)).toBeVisible();
        await page.waitForLoadState("networkidle");
        const requests: string[] = [];
        page.on("request", (r) => requests.push(r.method() + " " + r.url()));

        // Nothing plays or scores before the visitor starts it.
        await expect(page.getByTestId("rhythm-tap")).toHaveCount(0);
        await demo(page).getByRole("button", { name: startLabel }).click();
        const tap = page.getByTestId("rhythm-tap");
        await expect(tap).toBeFocused();

        const deadline = Date.now() + 14_000;
        let rated = false;
        while (Date.now() < deadline && (await page.getByTestId("rhythm-result").count()) === 0) {
          await page.keyboard.press("Space");
          if (!rated && /(Perfect|Good|Missed|Mükemmel|İyi|Kaçtı)/.test((await page.getByTestId("rhythm-last").textContent()) ?? "")) rated = true;
          await page.waitForTimeout(330);
        }
        expect(rated).toBe(true);
        await expect(page.getByRole("heading", { name: resultHeading })).toBeFocused();
        await expect(page.getByTestId("rhythm-accuracy")).toHaveText(accuracy);
        await expect(page.getByTestId("rhythm-announce")).toHaveAttribute("aria-live", "polite");
        expect((await page.getByTestId("rhythm-announce").textContent()) ?? "").toMatch(/\d+/);
        expect(problems, problems.join("\n")).toEqual([]);
        expect(requests, requests.join("\n")).toEqual([]);
      });

      test("no horizontal overflow at 320 and 390", async ({ page }) => {
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto(url + "#dene");
          await expect(demo(page)).toBeVisible();
          await demo(page).getByRole("button").first().click();
          await expect(page.getByTestId("rhythm-tap")).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), "w" + width).toBe(false);
        }
      });

      for (const scheme of ["dark", "light"] as const) {
        test("axe (" + scheme + ") finds no serious or critical violation in the demo", async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme });
          await page.goto(url + "#dene");
          await expect(demo(page)).toBeVisible();
          await page.locator(".page-enter").first().evaluate((el) => Promise.allSettled(el.getAnimations().map((a) => a.finished)));
          const run = async () => {
            const results = await new AxeBuilder({ page })
              .include('[data-testid="ostinato-rhythm-demo"]')
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();
            return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).join(", "));
          };
          expect(await run()).toEqual([]);
          await demo(page).getByRole("button").first().click();
          await expect(page.getByTestId("rhythm-tap")).toBeVisible();
          expect(await run()).toEqual([]);
        });
      }
    });
  }

  test("reduced motion: the beat indicator does not scale", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/projects/ostinato#dene");
    await demo(page).getByRole("button").first().click();
    const pulse = page.getByTestId("rhythm-pulse");
    await expect(pulse).toHaveAttribute("data-on", "1", { timeout: 4000 });
    expect(await pulse.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await context.close();
  });
}
