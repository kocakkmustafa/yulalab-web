import { expect, test, type Page } from "@playwright/test";

// Founder decision 2026-11-04: the 3D scene lives on every page. One WebGL
// renderer is created per visit (SceneHost in the locale layout) and must
// survive client-side route changes instead of being rebuilt.

const ROOT = '[data-yula-experience="true"]';
const HOST = "[data-scene-host]";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
});

async function rememberCanvas(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __sceneCanvas?: Element | null }).__sceneCanvas = document.querySelector("[data-scene-host] canvas");
  });
}

async function sameCanvas(page: Page) {
  return page.evaluate(() => {
    const kept = (window as Window & { __sceneCanvas?: Element | null }).__sceneCanvas;
    return Boolean(kept) && document.querySelector("[data-scene-host] canvas") === kept && document.querySelectorAll("canvas").length === 1;
  });
}

test("one renderer survives journey → product → legal → history", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/en");
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  test.skip(await root.getAttribute("data-experience-fallback") === "true", "Persistent scene requires hardware WebGL.");
  await expect(page.locator("html")).toHaveAttribute("data-scene", "live");
  await expect(page.locator(HOST)).toHaveAttribute("data-scene-tone", "journey");
  await rememberCanvas(page);
  const origin = await page.evaluate(() => performance.timeOrigin);

  // Settle on one product before following its link (Lenis eases scrolling).
  await expect.poll(() => page.evaluate(async () => {
    const top = (document.documentElement.scrollHeight - innerHeight) * 0.2;
    scrollTo({ top, behavior: "instant" });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return Math.abs(scrollY - top) <= 2;
  })).toBe(true);
  await page.waitForTimeout(1_000);
  const slug = await root.getAttribute("data-active-product");
  const action = page.locator(`article[data-product="${slug}"][data-active="true"] a`).first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(new RegExp(`/en/projects/${slug}$`));
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(HOST)).toHaveAttribute("data-scene-tone", "page");
  // The camera travels back to the backdrop pose instead of cutting.
  await expect(page.locator(HOST)).toHaveAttribute("data-scene-progress", "0.000", { timeout: 5_000 });
  expect(await sameCanvas(page)).toBe(true);

  await page.locator('[data-site-footer="true"] a[href="/en/privacy"]').first().click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(page.locator(HOST)).toHaveAttribute("data-scene-tone", "quiet");
  expect(await sameCanvas(page)).toBe(true);

  await page.goBack();
  await page.goBack();
  await expect(root).toHaveAttribute("data-active-product", slug!);
  await expect(page.locator(HOST)).toHaveAttribute("data-scene-tone", "journey");
  expect(await sameCanvas(page)).toBe(true);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(errors).toEqual([]);
});

test("a visit that starts on a legal page never loads the renderer", async ({ page }) => {
  await page.goto("/en/privacy");
  await page.waitForLoadState("load");
  await page.waitForTimeout(2_500);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1_500);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-scene", "live");
  await expect(page.locator("main h1")).toBeVisible();
});

test("a phone starting on a content page waits for the first gesture", { tag: "@hardware-webgl" }, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "tr-TR" });
  const page = await context.newPage();
  try {
    await page.goto("/en/projects/lifeos");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2_500);
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.evaluate(() => scrollBy(0, 300));
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator("html")).toHaveAttribute("data-scene", "live", { timeout: 30_000 });
    await expect(page.locator(HOST)).toHaveAttribute("data-scene-tone", "page");
  } finally {
    await context.close();
  }
});

test("reduced motion keeps every page on the painted ground", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
  const page = await context.newPage();
  try {
    await page.goto("/en/projects/lifeos");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2_500);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1_500);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("main h1")).toBeVisible();
  } finally {
    await context.close();
  }
});
