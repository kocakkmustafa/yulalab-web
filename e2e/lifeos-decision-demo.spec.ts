import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P1-01: LifeOS synthetic decision and reminder try-out behind
 * LIFEOS_DEMO_ENABLED. The flag is read at `next build`, so this spec follows
 * the build it runs against: LIFEOS_DEMO_ENABLED=1 in the test process means
 * an open-mode build (CI job `leads-open-e2e`), otherwise the default closed
 * build.
 */
const ON = process.env.LIFEOS_DEMO_ENABLED === "1";
const PAGES = [
  ["tr", "/projects/lifeos", "Hatırlatıcıyı kur (simülasyon)", "Hatırlatıcı kuruldu (simülasyon)", "Dolap rengi seçimi", "Bir hafta sonra, sabah"] as const,
  ["en", "/en/projects/lifeos", "Set the reminder (simulation)", "Reminder set (simulation)", "Wardrobe colour choice", "One week from now, in the morning"] as const,
];
const demo = (page: import("@playwright/test").Page) => page.getByTestId("lifeos-decision-demo");

if (!ON) {
  test("flag off: the LifeOS page has no decision demo", async ({ page }) => {
    await page.goto("/projects/lifeos");
    await page.waitForLoadState("networkidle");
    await expect(demo(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Bir karar seç, hatırlatmasını önizle." })).toHaveCount(0);
    expect(await page.content()).not.toContain("lifeos-decision-demo");
  });
} else {
  for (const [locale, url, setLabel, doneHeading, card, whenWeek] of PAGES) {
    test.describe("lifeos decision demo (" + locale + ")", () => {
      test("keyboard flow completes, is announced, and makes no network or storage use", async ({ page }) => {
        const problems: string[] = [];
        page.on("pageerror", (e) => problems.push(e.message));
        await page.goto(url + "#dene");
        await expect(demo(page)).toBeVisible();
        await page.waitForLoadState("networkidle");
        const requests: string[] = [];
        page.on("request", (r) => requests.push(r.method() + " " + r.url()));

        await expect(page.getByTestId("lifeos-demo-badge")).toBeVisible();
        await demo(page).getByRole("radio", { name: card }).focus();
        await page.keyboard.press("Space");
        await expect(demo(page).getByRole("radio", { name: card })).toBeChecked();
        await demo(page).getByRole("radio", { name: whenWeek }).focus();
        await page.keyboard.press("Space");
        await expect(page.getByTestId("lifeos-preview")).not.toHaveText("");
        await demo(page).getByRole("button", { name: setLabel }).focus();
        await page.keyboard.press("Enter");

        await expect(page.getByRole("heading", { name: doneHeading })).toBeFocused();
        await expect(page.getByTestId("lifeos-done-body")).toContainText(card);
        await expect(page.getByTestId("lifeos-announce")).toHaveAttribute("aria-live", "polite");
        expect(((await page.getByTestId("lifeos-announce").textContent()) ?? "").length).toBeGreaterThan(0);

        const stored = await page.evaluate(async () => ({
          local: localStorage.length,
          session: sessionStorage.length,
          cookie: document.cookie.includes("lifeos"),
          idb: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : 0,
          notif: typeof Notification === "undefined" ? "none" : Notification.permission,
        }));
        expect(stored.local).toBe(0);
        expect(stored.session).toBe(0);
        expect(stored.cookie).toBe(false);
        expect(stored.idb).toBe(0);
        expect(["none", "default"]).toContain(stored.notif);
        expect(problems, problems.join("\n")).toEqual([]);
        expect(requests, requests.join("\n")).toEqual([]);
      });

      test("no horizontal overflow at 320 and 390", async ({ page }) => {
        for (const width of [320, 390]) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto(url + "#dene");
          await expect(demo(page)).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), "w" + width).toBe(false);
          await demo(page).getByRole("button", { name: setLabel }).click();
          await expect(page.getByTestId("lifeos-done")).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), "done w" + width).toBe(false);
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
              .include('[data-testid="lifeos-decision-demo"]')
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();
            return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).join(", "));
          };
          expect(await run()).toEqual([]);
          await demo(page).getByRole("button", { name: setLabel }).click();
          await expect(page.getByTestId("lifeos-done")).toBeVisible();
          expect(await run()).toEqual([]);
        });
      }
    });
  }

  test("reduced motion: the demo has no running animation or transition", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/projects/lifeos#dene");
    await expect(demo(page)).toBeVisible();
    await demo(page).getByTestId("lifeos-set").click();
    await expect(page.getByTestId("lifeos-done")).toBeVisible();
    expect(await demo(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await context.close();
  });

  test("other product pages do not show the LifeOS demo", async ({ page }) => {
    await page.goto("/projects/ostinato");
    await expect(page.getByTestId("lifeos-decision-demo")).toHaveCount(0);
  });
}
