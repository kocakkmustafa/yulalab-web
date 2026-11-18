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

async function blockWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, id: string, ...args: unknown[]) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(id)) return null;
      return original.call(this, id as never, ...(args as []));
    } as typeof original;
  });
}

// W1D K8: phones open the 3D journey by default (MOBILE_STATIC_DEFAULT = false). The linear document is
// only the fallback when WebGL is unavailable, so the phone path is checked in both directions.
test.describe("phone opens 3D by default", () => {
  test.use({ viewport: PHONE });

  test("server HTML carries no static-default flag and no opt-in button", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toContain('data-mobile-static-default="true"');
    expect(html).not.toContain("data-open-3d");
  });

  test("native: a phone mounts the 3D scene without any tap", { tag: "@hardware-webgl" }, async ({ page }) => {
    const root = await openHome(page);
    await expect(page.locator(OPEN)).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
  });

  test.describe("without WebGL the linear document is the fallback", () => {
    test.beforeEach(async ({ page }) => {
      await blockWebGL(page);
    });

    test("static content, no canvas, no opt-in button", async ({ page }) => {
      await openHome(page);
      await expect(page.locator('[data-experience-static="true"]')).toBeAttached({ timeout: 45_000 });
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.locator(OPEN)).toHaveCount(0);
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
