import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WEB-P2-01c: the Braavolabs agent run trace on /lab. The flag is read at
 * `next build`, so this spec follows the build it runs against (same
 * convention as lab-demos.spec.ts): BRAAVOLABS_DEMO_ENABLED "1" in the test
 * process means an open-mode build (CI job `leads-open-e2e`).
 */
const ON = process.env.BRAAVOLABS_DEMO_ENABLED === "1";
const PAGES = [
  ["tr", "/lab", "Aç: Braavolabs", "Onayla", "Reddet", "Sıfırla"],
  ["en", "/en/lab", "Open: Braavolabs", "Approve", "Reject", "Reset"],
  ["ar", "/ar/lab", "افتح: Braavolabs", "وافق", "ارفض", "إعادة ضبط"],
] as const;

/** JS bodies fetched so far, to prove which code arrived. */
function trackScripts(page: Page) {
  const bodies: Promise<string>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") bodies.push(r.text().catch(() => ""));
  });
  return async () => (await Promise.all(bodies)).join("\n");
}

/** Requests to our own API (the demo must make none). */
function trackApi(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api")) urls.push(r.url());
  });
  return urls;
}

if (!ON) {
  test("flag closed: no Braavolabs card and no demo code on /lab", async ({ page }) => {
    await page.goto("/lab");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("lab-demo-card-braavolabs-run")).toHaveCount(0);
    expect(await page.content()).not.toContain("lab-demo-card-braavolabs-run");
  });
} else {
  for (const [locale, url, open, approve, reject, reset] of PAGES) {
    test.describe(`braavolabs run trace (${locale})`, () => {
      test("card visible; demo chunk arrives only on Open; no /api request", async ({ page }) => {
        const scripts = trackScripts(page);
        const api = trackApi(page);
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await expect(page.getByTestId("lab-demo-card-braavolabs-run")).toBeVisible();
        expect(await scripts()).not.toContain("demo-run-0001");
        await page.getByRole("button", { name: open }).click();
        const demo = page.getByTestId("braavolabs-run-demo");
        await expect(demo).toBeVisible();
        await expect(page.getByTestId("run-timeline").getByRole("listitem")).toHaveCount(5);
        await expect(page.getByTestId("run-badge")).toBeVisible();
        expect(await scripts()).toContain("demo-run-0001");
        expect(api).toEqual([]);
      });

      test("open a step, approve, then reset", async ({ page }) => {
        await page.goto(url);
        await page.getByRole("button", { name: open }).click();
        const tool = page.getByTestId("run-toggle-tool");
        await tool.click();
        await expect(tool).toHaveAttribute("aria-expanded", "true");
        await expect(page.getByTestId("run-detail-tool")).toBeVisible();
        await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "awaiting");
        await page.getByRole("button", { name: approve, exact: true }).click();
        await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "completed");
        await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "completed");
        await expect(page.getByTestId("run-live")).not.toHaveText("");
        await expect(page.getByTestId("run-meta-steps")).toHaveText(/5/);
        await page.getByRole("button", { name: reset, exact: true }).click();
        await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "awaiting");
        await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "queued");
      });

      test("reject skips the last step; keyboard only", async ({ page }) => {
        await page.goto(url);
        const openBtn = page.getByRole("button", { name: open });
        await openBtn.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("braavolabs-run-demo")).toBeVisible();
        const toggle = page.getByTestId("run-toggle-draft");
        await toggle.focus();
        await page.keyboard.press("Enter");
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Enter");
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        const rejectBtn = page.getByRole("button", { name: reject, exact: true });
        await rejectBtn.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "blocked");
        await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "skipped");
        await expect(page.getByTestId("run-toggle-gate")).toBeFocused();
      });

      test("axe: no serious violations with the demo open, before and after approval", async ({ page }) => {
        await page.goto(url);
        await page.getByRole("button", { name: open }).click();
        await expect(page.getByTestId("braavolabs-run-demo")).toBeVisible();
        await page.getByTestId("run-toggle-gate").click();
        const bad = async () =>
          (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.filter(
            (v) => v.impact === "serious" || v.impact === "critical",
          );
        expect(await bad()).toEqual([]);
        await page.getByRole("button", { name: approve, exact: true }).click();
        await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "completed");
        expect(await bad()).toEqual([]);
      });
    });
  }

  test("reduced motion: approve completes at once", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/lab");
    await page.getByRole("button", { name: "Aç: Braavolabs" }).click();
    await page.getByRole("button", { name: "Onayla", exact: true }).click();
    await expect(page.getByTestId("run-step-done")).toHaveAttribute("data-status", "completed");
    await context.close();
  });

  test("mobile 390x844: stacks, no horizontal scroll, buttons usable", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto("/lab");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Aç: Braavolabs" }).tap();
    await expect(page.getByTestId("braavolabs-run-demo")).toBeVisible();
    await page.getByRole("button", { name: "Reddet", exact: true }).tap();
    await expect(page.getByTestId("run-step-gate")).toHaveAttribute("data-status", "blocked");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test("desktop 1440x900: timeline and metadata sit side by side", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
    const page = await context.newPage();
    await page.goto("/lab");
    await page.getByRole("button", { name: "Aç: Braavolabs" }).click();
    const a = await page.getByTestId("run-timeline").boundingBox();
    const b = await page.getByTestId("run-meta").boundingBox();
    expect(a && b && b.x > a.x + a.width - 1).toBeTruthy();
    await context.close();
  });
}
