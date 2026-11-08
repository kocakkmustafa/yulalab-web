import { expect, test, type Page } from "@playwright/test";

// WEB-P0-03a2 (ADR-003 option c): <= 767 px opens the linear document and
// loads the 3D journey only after "Open the 3D experience" is activated.
const ROOT = '[data-yula-experience="true"]';
const OPEN = "[data-open-3d]";
const PHONE = { width: 390, height: 844 };
const FAILED_TR = "3D açılamadı, doğrusal görünüm gösteriliyor.";

async function openHome(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
  return root;
}

async function blockWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, id: string, ...args: unknown[]) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(id)) return null;
      return original.call(this, id as never, ...(args as []));
    } as typeof original;
  });
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

  test("first load shows static content, no canvas, no opening card, no layout shift, no React errors", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    // Production React reports hydration problems as minified errors (#418,
    // #423, #425), so listen for every page error and console error, not only
    // for the development wording.
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat|did not match|#4(18|23|25)/i.test(message.text())) {
        problems.push(`console.${message.type()}: ${message.text()}`);
      }
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
    expect(problems).toEqual([]);
  });

  test("the 3D button is reached with Tab, is accessible, 44px+, and shows a focus ring", async ({ page }) => {
    await openHome(page);
    const button = page.getByRole("button", { name: /3D deneyimi aç/i });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    // Reach the button the way a keyboard user does: repeated Tab, bounded.
    let reached = false;
    for (let presses = 0; presses < 60 && !reached; presses += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.hasAttribute("data-open-3d") === true);
    }
    expect(reached).toBe(true);
    const ring = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return { match: el.matches(":focus-visible"), style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(ring.match).toBe(true);
    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("Enter");
    await expect(page.locator(ROOT)).toHaveAttribute("data-mobile-3d", "true");
    // Focus must not fall to <body> when the button's tree is replaced.
    await expect(async () => {
      const landed = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.id === "open3d-failed" || active?.getAttribute("data-yula-experience") === "true";
      });
      expect(landed).toBe(true);
    }).toPass({ timeout: 10_000 });
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

  test("failure stays visible, focused and announced when 3D cannot start", async ({ page }) => {
    await blockWebGL(page);
    await openHome(page);
    await page.locator(OPEN).click();
    const failed = page.locator("[data-open-3d-failed]");
    await expect(failed).toBeVisible();
    await expect(failed).toHaveText(FAILED_TR);
    await expect(failed).toBeFocused();
    await expect(page.locator("[data-open3d-status]")).toHaveText(FAILED_TR);
    await expect(page.locator('[data-experience-static="true"]')).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("the choice is latched at mount: widening the window never loads 3D by itself", async ({ page }) => {
    const root = await openHome(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(root).not.toHaveAttribute("data-mobile-3d", "true");
    await expect(page.locator('[data-yula-loader="true"]')).toHaveCount(0);
    await expect(page.locator(OPEN)).toBeVisible();
    await page.setViewportSize(PHONE);
    await page.waitForTimeout(500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("the journey's own WebGL probe waits for the button (the layout's SceneHost probes once)", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __probes: number };
      w.__probes = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, id: string, ...args: unknown[]) {
        if (["webgl", "webgl2", "experimental-webgl"].includes(id)) w.__probes += 1;
        return original.call(this, id as never, ...(args as []));
      } as typeof original;
    });
    await openHome(page);
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => (window as unknown as { __probes: number }).__probes);
    // SceneHost (site layout, shared by every route) probes once; the journey adds none.
    expect(before).toBeLessThanOrEqual(1);
    await page.locator(OPEN).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __probes: number }).__probes)).toBeGreaterThan(before);
  });

  test("English catalogue shows the English label", async ({ page }) => {
    await openHome(page, "/en");
    await expect(page.getByRole("button", { name: "Open the 3D experience" })).toBeVisible();
  });

  test("a non-English locale without a translation labels the fallback honestly", async ({ page }) => {
    await blockWebGL(page);
    await openHome(page, "/fr");
    const button = page.locator(OPEN);
    await expect(button).toHaveText("Open the 3D experience");
    await expect(button).toHaveAttribute("lang", "en");
    await button.click();
    const failed = page.locator("[data-open-3d-failed]");
    await expect(failed).toHaveText("Could not open 3D; showing the linear view.");
    await expect(failed).toHaveAttribute("lang", "en");
  });

  test("hash deep link lands on its scene on the static phone path", async ({ page }) => {
    await page.goto("/#scene-3-products", { waitUntil: "domcontentloaded" });
    await expect(page.locator(ROOT)).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
    // Native anchor scrolling is smooth on this site; wait for it to settle.
    await expect.poll(() => page.locator("#scene-3-products").evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { timeout: 15_000 }).toBeLessThan(120);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
  });

  test("experience hash deep link lands on its section on the static phone path", async ({ page }) => {
    await page.goto("/#experience-portfolio", { waitUntil: "domcontentloaded" });
    await expect(page.locator(ROOT)).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
    await expect.poll(() => page.locator("#experience-portfolio").evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { timeout: 15_000 }).toBeLessThan(120);
  });

  test("Back from a product page keeps the scroll position on the static phone path", async ({ page }) => {
    await openHome(page);
    const link = page.locator('[data-experience-static="true"] a[href$="/projects/lifeos"]').first();
    await link.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(400);
    await link.click();
    await expect(page).toHaveURL(/\/projects\/lifeos$/);
    await page.goBack();
    await expect(page.locator(ROOT)).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(before - 200);
  });

  test("native: the button starts the journey, announces it, and the linear view returns", { tag: "@hardware-webgl" }, async ({ page }) => {
    const root = await openHome(page);
    await page.locator(OPEN).click();
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
    await expect(page.locator("[data-open3d-status]")).toHaveText("3D deneyim açıldı");
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
    await expect(root).not.toHaveAttribute("data-mobile-latched", "true");
  });

  test("narrowing a desktop session does not switch it to the static default", async ({ page }) => {
    const root = await openHome(page);
    await page.setViewportSize(PHONE);
    await page.waitForTimeout(800);
    await expect(root).not.toHaveAttribute("data-mobile-latched", "true");
    await expect(page.locator(OPEN)).toHaveCount(0);
  });

  test("native: WebGL desktop still opens the journey without a tap", { tag: "@hardware-webgl" }, async ({ page }) => {
    const root = await openHome(page);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
  });
});
