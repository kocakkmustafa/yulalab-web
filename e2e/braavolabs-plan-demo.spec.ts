import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P0-05: deterministic Braavolabs plan card on /projects/braavolabs.
 * Network scope: after the page has loaded and settled, selecting intents
 * must issue ZERO requests of any kind (documents, scripts, fetch, images).
 */
const PAGES = [
  ["tr", "/projects/braavolabs", /Bu bir interaktif ürün konsepti\/plan örneğidir, gerçek iş yürütülmüyor\./, "Plan kartı gösteriliyor: İçerik", "Örnek / konsept: gerçek iş yürütülmüyor."],
  ["en", "/en/projects/braavolabs", /This is an interactive product concept \/ plan example; no real job is executed\./, "Plan card shown: Content", "Example / concept: no real job is executed."],
] as const;
const EXECUTION_WORDS = /çalışıyor|tamamlandı|running|completed|in progress|ilerleme/i;
const INTENTS = ["content", "report", "software"] as const;

const demo = (page: Page) => page.getByTestId("braavolabs-plan-demo");
async function ready(page: Page) {
  await expect(demo(page).getByRole("radiogroup")).toBeVisible();
}

for (const [locale, url, disclaimer, announceAfterContent, note] of PAGES) {
  test.describe("braavolabs plan demo (" + locale + ")", () => {
    test("three intents are selected by keyboard, card and disclaimer visible, zero network requests", async ({ page }) => {
      const problems: string[] = [];
      page.on("console", (m) => m.type() === "error" && problems.push("console: " + m.text()));
      page.on("pageerror", (err) => problems.push("pageerror: " + err.message));
      await page.goto(url);
      await ready(page);
      await page.waitForLoadState("networkidle");
      const requests: string[] = [];
      page.on("request", (r) => requests.push(r.method() + " " + r.url()));

      await expect(demo(page).getByTestId("plan-disclaimer")).toHaveText(disclaimer);
      const radios = demo(page).getByRole("radio");
      await expect(radios).toHaveCount(3);
      await radios.first().focus();
      await expect(radios.first()).toBeFocused();
      const seen: string[] = [];
      for (let i = 0; i < 3; i++) {
        const intent = INTENTS[i];
        await expect(radios.nth(i)).toHaveAttribute("aria-checked", "true");
        await expect(demo(page).getByTestId("plan-card")).toHaveAttribute("data-intent", intent);
        await expect(demo(page).getByTestId("plan-card")).toBeVisible();
        await expect(demo(page).getByTestId("plan-disclaimer")).toBeVisible();
        seen.push((await demo(page).getByTestId("plan-card").innerText()).trim());
        if (i < 2) await page.keyboard.press("ArrowRight");
      }
      expect(new Set(seen).size).toBe(3);
      // Space/Enter on a focused radio also selects it.
      await radios.first().focus();
      await page.keyboard.press("Enter");
      await expect(demo(page).getByTestId("plan-card")).toHaveAttribute("data-intent", "content");
      await expect(page.getByTestId("plan-announce")).toHaveText(announceAfterContent);
      // Space selects too.
      await radios.nth(1).focus();
      await page.keyboard.press(" ");
      await expect(demo(page).getByTestId("plan-card")).toHaveAttribute("data-intent", "report");
      await expect(page.getByTestId("plan-announce")).toHaveText(announceAfterContent.replace(/: .*/, "") + ": " + (locale === "tr" ? "Rapor" : "Report"));
      // The selected radio is marked beyond colour: semibold + underline.
      await expect(radios.nth(1)).toHaveCSS("text-decoration-line", "underline");
      await expect(radios.nth(0)).toHaveCSS("text-decoration-line", "none");
      await expect(demo(page).getByTestId("plan-card-note")).toHaveText(note);
      expect(await demo(page).innerText()).not.toContain("braavolabsDemo");
      expect(problems, problems.join("\n")).toEqual([]);
      expect(requests, requests.join("\n")).toEqual([]);
    });

    test("no digits and no execution wording inside the demo, for every intent", async ({ page }) => {
      await page.goto(url);
      await ready(page);
      for (let i = 0; i < 3; i++) {
        await demo(page).getByRole("radio").nth(i).click();
        const text = await demo(page).innerText();
        expect(text).not.toMatch(/\d/);
        expect(text).not.toMatch(EXECUTION_WORDS);
        await expect(demo(page).locator("[role=progressbar], progress, [aria-busy=true]")).toHaveCount(0);
      }
    });

    test("no horizontal overflow at 320px and targets are at least 48px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(url);
      await ready(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      for (const box of await demo(page).getByRole("radio").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
        expect(box).toBeGreaterThanOrEqual(48);
      }
    });

    // The demo declares no animation or transition at all, so the result is the
    // same under both preferences; both are asserted (there is no animated
    // control to compare against inside the demo).
    for (const reducedMotion of ["reduce", "no-preference"] as const) {
      test("motion " + reducedMotion + ": demo has no animations or transitions", async ({ browser }) => {
        const context = await browser.newContext({ reducedMotion, locale: "tr-TR" });
        const page = await context.newPage();
        await page.goto(url);
        await ready(page);
        await demo(page).getByRole("radio").nth(1).click();
        const motion = await demo(page).evaluate((el) => {
          const all = [el, ...Array.from(el.querySelectorAll("*"))];
          return {
            animations: el.getAnimations({ subtree: true }).length,
            transitions: all.filter((n) => parseFloat(getComputedStyle(n).transitionDuration) > 0).length,
          };
        });
        expect(motion).toEqual({ animations: 0, transitions: 0 });
        await context.close();
      });
    }

    test("hydration layout shift of the demo is measured and recorded", async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(url);
      await ready(page);
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      testInfo.annotations.push({ type: "cls-" + locale, description: String(cls) });
      console.log("CLS " + locale + " = " + cls);
      expect(cls).toBeLessThan(0.25);
    });

    for (const scheme of ["dark", "light"] as const) {
      test("axe (" + scheme + ") finds no serious or critical violation in the demo", async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(url);
        await ready(page);
        await page.locator(".page-enter").first().evaluate((el) => Promise.allSettled(el.getAnimations().map((a) => a.finished)));
        for (let i = 0; i < 3; i++) {
          await demo(page).getByRole("radio").nth(i).click();
          const results = await new AxeBuilder({ page })
            .include('[data-testid="braavolabs-plan-demo"]')
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
          const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
          expect(blocking.map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).join(", "))).toEqual([]);
        }
      });
    }
  });
}

test("/ar shows the English fallback marked lang=en dir=ltr, with no Arabic letters in the block", async ({ page }) => {
  await page.goto("/ar/projects/braavolabs");
  await ready(page);
  const section = demo(page);
  await expect(section).toHaveAttribute("lang", "en");
  await expect(section).toHaveAttribute("dir", "ltr");
  expect(await section.innerText()).not.toMatch(/[؀-ۿ]/);
  await expect(section.getByTestId("plan-disclaimer")).toContainText("no real job is executed");
});

test.describe("JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });
  test("disclaimer and the static summary of all three intents are readable", async ({ page }) => {
    for (const [, url, disclaimer] of PAGES) {
      await page.goto(url);
      await expect(demo(page).getByTestId("plan-disclaimer")).toHaveText(disclaimer);
      await expect(demo(page).getByTestId("plan-disclaimer")).toBeVisible();
      const cards = demo(page).getByTestId("plan-static").getByTestId("plan-card");
      await expect(cards).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await expect(cards.nth(i)).toBeVisible();
        await expect(cards.nth(i).getByTestId("plan-card-note")).toBeVisible();
      }
      await expect(demo(page).getByRole("radiogroup")).toHaveCount(0);
    }
  });
});
