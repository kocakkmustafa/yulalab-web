import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P2-01d: keyboard, screen-reader-surface and reduced-motion acceptance of
 * /lab and its three demos. Flags are read at `next build`, so this spec
 * follows the build it runs against (same convention as lab-demos.spec.ts):
 * all three flags "1" in the test process means an open-mode build.
 */
const ON =
  process.env.LIFEOS_DEMO_ENABLED === "1" &&
  process.env.OSTINATO_DEMO_ENABLED === "1" &&
  process.env.BRAAVOLABS_DEMO_ENABLED === "1";

const PAGES = [
  ["tr", "/lab"],
  ["en", "/en/lab"],
  ["ar", "/ar/lab"],
  ["de", "/de/lab"],
] as const;

const OPEN = (page: Page, id: string) => page.getByTestId(`lab-demo-open-${id}`);

/** Move focus with Tab only, until `target` has it. Fails if it never gets there. */
async function tabTo(page: Page, target: Locator, max = 160) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("keyboard Tab never reached the target");
}

/** The focused element draws a visible indicator (an outline), as keyboard focus. */
async function expectFocusRing(page: Page) {
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), focusVisible: el.matches(":focus-visible") };
  });
  expect(ring, "an element has focus").not.toBeNull();
  expect(ring!.focusVisible).toBe(true);
  expect(ring!.style).not.toBe("none");
  expect(ring!.width).toBeGreaterThan(0);
}

async function runningAnimations(page: Page) {
  return page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => {
    const name = (a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty || "waapi";
    const el = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
    return name + " on " + (el?.tagName.toLowerCase() ?? "?") + " " + (el?.getAttribute("data-testid") ?? el?.id ?? "") + " " + (el?.className?.toString() ?? "").slice(0, 80);
  }));
}

if (!ON) {
  test("flags closed: lab accessibility checks need an open-mode build", async ({ page }) => {
    await page.goto("/en/lab");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByTestId("lab-demos")).toHaveCount(0);
  });
} else {
  for (const [locale, url] of PAGES) {
    test.describe(`lab a11y (${locale})`, () => {
      test("one h1, landmarks, labelled list, polite live region present before any change", async ({ page }) => {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main")).toHaveCount(1);
        await expect(page.locator("header").first()).toBeVisible();
        await expect(page.locator("footer").first()).toBeVisible();
        await expect(page.locator("nav").first()).toBeVisible();
        const list = page.getByTestId("lab-demos").getByRole("list");
        await expect(list.getByRole("listitem")).toHaveCount(3);
        const live = page.getByTestId("lab-demo-live");
        await expect(live).toHaveAttribute("role", "status");
        await expect(live).toHaveAttribute("aria-live", "polite");
        // the panel is a named region only while a demo is open
        await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
      });

      test("axe: no serious or critical violation with each demo open", async ({ page }) => {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        const serious = async () =>
          (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical",
          );
        expect(await serious(), "page, demos closed").toEqual([]);
        for (const [id, marker] of [
          ["lifeos-decision", "lifeos-decision-demo"],
          ["ostinato-rhythm", "ostinato-rhythm-demo"],
          ["braavolabs-run", "braavolabs-run-demo"],
        ] as const) {
          await OPEN(page, id).click();
          await expect(page.getByTestId(marker)).toBeVisible();
          expect(await serious(), `demo ${id}`).toEqual([]);
          await page.getByTestId("lab-demo-panel").getByRole("button").first().click(); // Close
          await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
        }
      });
    });
  }

  test.describe("keyboard-only tour (en)", () => {
    test("LifeOS: Tab to Open, Enter, pick with Space, set with Enter; announcement and focus return", async ({ page }) => {
      await page.goto("/en/lab");
      await page.waitForLoadState("networkidle");
      await tabTo(page, OPEN(page, "lifeos-decision"));
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
      await expect(page.getByTestId("lab-demo-panel")).toBeFocused();
      await expect(page.getByTestId("lab-demo-panel")).toHaveAttribute("role", "region");
      await expect(page.getByTestId("lab-demo-panel")).toHaveAttribute("aria-label", /LifeOS/);
      // Tab inside the panel: Close, then the form controls
      const radios = page.locator('[data-testid="lifeos-decision-demo"] input[name="lifeos-card"]');
      await tabTo(page, radios.first());
      await expectFocusRing(page);
      await page.keyboard.press("ArrowDown");
      await expect(radios.nth(1)).toBeChecked();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const set = page.getByTestId("lifeos-set");
      await tabTo(page, set);
      await expectFocusRing(page);
      await page.keyboard.press("Space");
      await expect(page.getByTestId("lifeos-done-body")).toBeVisible();
      const announce = page.getByTestId("lifeos-announce");
      await expect(announce).toHaveAttribute("role", "status");
      await expect(announce).not.toHaveText("");
      await tabTo(page, page.getByTestId("lifeos-restart"));
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("lifeos-set")).toBeVisible();
      // Close with the keyboard; focus returns to the opener
      await page.keyboard.press("Shift+Tab");
      await tabTo(page, page.getByTestId("lab-demo-panel").getByRole("button").first());
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("lab-demo-panel")).toBeHidden();
      await expect(OPEN(page, "lifeos-decision")).toBeFocused();
      await expectFocusRing(page);
    });

    test("Ostinato: Start with Enter, tap with Space, result is announced and focused", async ({ page }) => {
      await page.goto("/en/lab");
      await page.waitForLoadState("networkidle");
      await tabTo(page, OPEN(page, "ostinato-rhythm"));
      await page.keyboard.press("Space");
      await expect(page.getByTestId("ostinato-rhythm-demo")).toBeVisible();
      const start = page.getByTestId("rhythm-start");
      await tabTo(page, start);
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      const tap = page.getByTestId("rhythm-tap");
      await expect(tap).toBeFocused();
      await expectFocusRing(page);
      await expect(page.getByTestId("rhythm-pulse")).toHaveAttribute("aria-hidden", "true");
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(150);
      }
      await expect(page.getByTestId("rhythm-result")).toBeVisible({ timeout: 60_000 });
      const announce = page.getByTestId("rhythm-announce");
      await expect(announce).toHaveAttribute("role", "status");
      await expect(announce).not.toHaveText("");
    });

    test("Braavolabs: Tab to a step toggle, Enter expands, Space toggles back, approve gate with keyboard", async ({ page }) => {
      await page.goto("/en/lab");
      await page.waitForLoadState("networkidle");
      await tabTo(page, OPEN(page, "braavolabs-run"));
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("braavolabs-run-demo")).toBeVisible();
      const toggle = page.getByTestId("run-toggle-tool");
      await tabTo(page, toggle);
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByTestId("run-detail-tool")).toBeVisible();
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      const approve = page.getByTestId("run-approve");
      await tabTo(page, approve);
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "completed");
      const live = page.getByTestId("run-live");
      await expect(live).toHaveAttribute("role", "status");
      await expect(live).not.toHaveText("");
      await tabTo(page, page.getByTestId("run-reset"));
      await expectFocusRing(page);
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "awaiting");
    });
  });

  test.describe("prefers-reduced-motion: reduce", () => {
    test("no running CSS/WAAPI animation on /lab or in any open demo; demos still work", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/en/lab");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500); // entrance/stagger animations would be running by now
      expect(await runningAnimations(page), "lab page").toEqual([]);

      // LifeOS
      await OPEN(page, "lifeos-decision").click();
      await expect(page.getByTestId("lifeos-decision-demo")).toBeVisible();
      await page.waitForTimeout(400);
      expect(await runningAnimations(page), "lifeos demo").toEqual([]);
      await page.getByTestId("lifeos-set").click();
      await expect(page.getByTestId("lifeos-done-body")).toBeVisible();
      expect(await runningAnimations(page), "lifeos done").toEqual([]);

      // Ostinato (beat pulse must not scale/transition)
      await OPEN(page, "ostinato-rhythm").click();
      await expect(page.getByTestId("ostinato-rhythm-demo")).toBeVisible();
      await page.getByTestId("rhythm-start").click();
      await expect(page.getByTestId("rhythm-tap")).toBeVisible();
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(250);
        expect(await runningAnimations(page), "ostinato running").toEqual([]);
      }
      await page.getByTestId("rhythm-tap").press("Space");
      expect(await runningAnimations(page), "ostinato tap").toEqual([]);

      // Braavolabs (running badge must not pulse; approval finishes at once)
      await OPEN(page, "braavolabs-run").click();
      await expect(page.getByTestId("braavolabs-run-demo")).toBeVisible();
      await page.getByTestId("run-toggle-tool").click();
      await expect(page.getByTestId("run-detail-tool")).toBeVisible();
      expect(await runningAnimations(page), "braavolabs open").toEqual([]);
      await page.getByTestId("run-approve").click();
      await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "completed");
      expect(await runningAnimations(page), "braavolabs approved").toEqual([]);
      await expect(page.getByTestId("run-live")).not.toHaveText("");
    });
  });
}
