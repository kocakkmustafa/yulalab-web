import { expect, test, type Page } from "@playwright/test";

// WEB-P0-03a2 (ADR-003 option c): <= 767 px opens the linear document and
// loads the 3D journey only after "Open the 3D experience" is activated.
const ROOT = '[data-yula-experience="true"]';
const OPEN = "[data-open-3d]";
const PHONE = { width: 390, height: 844 };

async function openHome(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
  return root;
}

test.describe("mobile static default", () => {
  test.use({ viewport: PHONE });

  test("server HTML carries the flag so first paint is the linear document", async ({ request, page }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain('data-mobile-static-default="true"');
    // No-JS phone: the 2520vh journey must not reserve space.
    const context = await page.context().browser()!.newContext({ javaScriptEnabled: false, viewport: PHONE });
    const noJs = await context.newPage();
    await noJs.goto("/");
    const minHeight = await noJs.locator(ROOT).evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    expect(minHeight).toBeLessThanOrEqual(PHONE.height + 1);
    await context.close();
  });

  test("first load shows static content, no canvas, no opening card, no layout shift", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat/i.test(message.text())) errors.push(message.text());
    });
    const root = await openHome(page);
    await expect(page.locator('[data-experience-static="true"]')).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator('[data-yula-loader="true"]')).toHaveCount(0);
    await expect(root).not.toHaveAttribute("data-mobile-3d", "true");
    // The 3D journey would be 2520vh (21 269 px here); the linear page is not.
    const heights = await root.evaluate((el) => ({ box: el.getBoundingClientRect().height, min: parseFloat(getComputedStyle(el).minHeight) }));
    expect(heights.min).toBeLessThanOrEqual(PHONE.height + 1);
    expect(heights.box).toBeLessThan(PHONE.height * 25.2);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
    expect(errors.filter((line) => /hydrat|did not match/i.test(line))).toEqual([]);
  });

  test("the 3D button is accessible, 44px+, keyboard operable and shows a focus ring", async ({ page }) => {
    await openHome(page);
    const button = page.getByRole("button", { name: /3D deneyimi aç/i });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Tab");
    await button.focus();
    const ring = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return { match: el.matches(":focus-visible"), style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(ring.match).toBe(true);
    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("Enter");
    await expect(page.locator(ROOT)).toHaveAttribute("data-mobile-3d", "true");
  });

  test("activating the button requests the 3D path; guards still decide the outcome", async ({ page }) => {
    const root = await openHome(page);
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.locator(OPEN).click();
    await expect(root).toHaveAttribute("data-mobile-3d", "true");
    // Either the journey runs (WebGL2, hardware renderer) or the honest linear
    // fallback stays: never a blank page.
    await expect(async () => {
      const canvas = await page.locator("canvas").count();
      const fallback = await page.locator('[data-experience-fallback="true"]').count();
      expect(canvas + fallback).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });
    await expect(page.locator(OPEN)).toHaveCount(0);
  });

  test("English catalogue shows the English label", async ({ page }) => {
    await openHome(page, "/en");
    await expect(page.getByRole("button", { name: "Open the 3D experience" })).toBeVisible();
  });

  test("a non-English locale without a translation labels the fallback honestly", async ({ page }) => {
    await openHome(page, "/fr");
    const button = page.locator(OPEN);
    await expect(button).toHaveText("Open the 3D experience");
    await expect(button).toHaveAttribute("lang", "en");
  });

  test("native: the button starts the journey and the linear view returns", { tag: "@hardware-webgl" }, async ({ page }) => {
    const root = await openHome(page);
    await page.locator(OPEN).click();
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
    await page.getByRole("button", { name: /linear experience|doğrusal deneyim/i }).click();
    await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});

test.describe("desktop keeps 3D as the default", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("no 3D button and no opt-in flag", async ({ page }) => {
    const root = await openHome(page);
    await expect(page.locator(OPEN)).toBeHidden();
    await expect(root).not.toHaveAttribute("data-mobile-3d", "true");
  });

  test("native: WebGL desktop still opens the journey without a tap", { tag: "@hardware-webgl" }, async ({ page }) => {
    const root = await openHome(page);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
  });
});
