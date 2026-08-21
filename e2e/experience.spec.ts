import { expect, test, type Page } from "@playwright/test";

const ROOT = '[data-yula-experience="true"]';

// Headless Chromium shares a finite GPU context pool. These tests exercise
// full WebGL scenes, so serial execution removes context starvation without
// changing the application's runtime or lowering its capture tier.
test.describe.configure({ mode: "serial", timeout: 60_000 });

async function openCapture(
  page: Page,
  progress: number,
  tier: "high" | "medium" | "low" = "low",
) {
  // Exercise the public default-locale entry point. Playwright starts Next
  // without an explicit 127.0.0.1 host binding, so next-intl's internal /tr
  // rewrite remains internal instead of hitting the Next 15 loopback bug.
  await page.goto(`/?capture=1&progress=${progress}&tier=${tier}`);
  const root = page.locator(ROOT);
  await expect(root).toBeAttached();
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 30_000 });
  return root;
}

const STAGE_CHECKPOINTS = [
  [0, "hero"],
  [0.24, "portfolio"],
  [0.54, "proof"],
  [0.63, "crossing"],
  [0.72, "mission"],
  [0.8, "vision"],
  [0.9, "values"],
  [0.98, "closing"],
] as const;

for (const [progress, stage] of STAGE_CHECKPOINTS) {
  test(`capture checkpoint ${progress} resolves to ${stage}`, async ({ page }) => {
    const root = await openCapture(page, progress, "high");
    await expect(root).toHaveAttribute("data-stage", stage);
    await expect(root).toHaveAttribute("data-tier", "high");
  });
}

const PRODUCT_ORDER = [
  "braavolabs",
  "burunfarki",
  "lifeos",
  "gravita",
  "lissom",
  "jablab",
  "ostinato",
  "choreia",
] as const;

for (const [index, slug] of PRODUCT_ORDER.entries()) {
  const progress = 0.085 + ((index + 0.5) / PRODUCT_ORDER.length) * (0.505 - 0.085);
  test(`portfolio slot ${index + 1} focuses ${slug}`, async ({ page }) => {
    const root = await openCapture(page, progress);
    await expect(root).toHaveAttribute("data-active-product", slug);
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeAttached();
  });
}

test("hero keeps one semantic product-lab H1", async ({ page }) => {
  await openCapture(page, 0);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("body")).toContainText(/product lab|ürün laboratuvarı/i);
  await expect(page.locator('[data-site-header="true"]')).toBeHidden();
  await expect(page.locator('[data-site-footer="true"]')).toBeHidden();
});

test("English hero keeps the product-lab identity", async ({ page }) => {
  await page.goto("/en?capture=1&progress=0&tier=low");
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 30_000 });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("body")).toContainText(/product lab/i);
});

test("research is written as research and never as a shipped build", async ({ page }) => {
  const gravitaCenter = 0.085 + ((3 + 0.5) / PRODUCT_ORDER.length) * (0.505 - 0.085);
  const root = await openCapture(page, gravitaCenter);
  await expect(root).toHaveAttribute("data-active-product", "gravita");
  await expect(page.locator("body")).toContainText(/NO PUBLIC BUILD|PUBLIC BUILD YOK/i);
  await expect(page.locator("body")).toContainText(/Read research (brief|note)|Araştırma notunu oku/i);
});

test("proof exposes provenance and freshness fields", async ({ page }) => {
  await openCapture(page, 0.54);
  const body = page.locator("body");
  await expect(body).toContainText(/source|kaynak/i);
  await expect(body).toContainText(/scope|kapsam/i);
  await expect(body).toContainText(/verified|doğrulandı/i);
  await expect(body).toContainText(/2026-/);
});

test("white crossing is a continuous timeline value", async ({ page }) => {
  const root = await openCapture(page, 0.63);
  const value = Number(await root.getAttribute("data-white-mix"));
  expect(value).toBeGreaterThan(0.05);
  expect(value).toBeLessThan(0.95);
});

test("HUD contains only derived renderer and journey data", async ({ page }) => {
  await openCapture(page, 0.24, "medium");
  const body = page.locator("body");
  await expect(body).toContainText(/RENDER\s*\/\s*MEDIUM/i);
  await expect(body).toContainText(/SCROLL\s*\/\s*024%/i);
  await expect(body).not.toContainText(/HIGH\s*\/\s*60/i);
  await expect(body).not.toContainText(/\bDRAG\b/i);
  await expect(body).not.toContainText(/SIN\s*X|SIN\s*Q/i);
});

test("reduced motion renders the complete static journey without Canvas", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const slug of PRODUCT_ORDER) {
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeVisible();
  }
  await expect(page.locator("body")).toContainText(/mission|misyon/i);
  await expect(page.locator("body")).toContainText(/vision|vizyon/i);
  await context.close();
});

test("WebGL failure falls back to the complete static journey", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(contextId)) return null;
      return original.call(this, contextId as never, ...(args as []));
    } as typeof original;
  });
  await page.goto("/?capture=1&progress=0.3&tier=high");
  await expect(page.locator('[data-experience-fallback="true"]')).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const slug of PRODUCT_ORDER) {
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeVisible();
  }
});

test("closing provides trust and legal navigation", async ({ page }) => {
  await openCapture(page, 0.98);
  await expect(page.locator('a[href="/transparency"], a[href$="/transparency"]').first()).toBeAttached();
  await expect(page.locator('a[href="/privacy"], a[href$="/privacy"]').first()).toBeAttached();
  await expect(page.locator('a[href^="mailto:"]').first()).toBeAttached();
});

test("linear-view control exposes the complete document on demand", async ({ page }) => {
  await openCapture(page, 0);
  await page.getByRole("button", { name: /linear experience|doğrusal deneyim/i }).click();
  await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const slug of PRODUCT_ORDER) {
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeVisible();
  }
});

test("no-JS response is the complete linear document and labels live products honestly", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: "en-US" });
  const page = await context.newPage();
  await page.goto("/en");
  await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
  for (const slug of PRODUCT_ORDER) {
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeVisible();
  }
  const lifeOS = page.locator("article").filter({
    has: page.getByRole("heading", { name: "LifeOS", level: 3 }),
  });
  await expect(lifeOS).not.toContainText(/no public build/i);
  await expect(lifeOS).toContainText(/live/i);
  const unknownFreshness = page.locator('[data-freshness="unknown"]');
  await expect(unknownFreshness.first()).toContainText(/freshness check pending/i);
  await expect(page.locator('[data-freshness="current"]')).toHaveCount(0);
  await context.close();
});

test("mobile header keeps the journey navigation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCapture(page, 0);
  const menu = page.locator('summary[aria-label="Projeler"], summary[aria-label="Projects"]');
  await menu.click();
  await expect(page.getByRole("link", { name: "Manifesto", exact: true })).toBeVisible();
  await expect(page.locator('[data-site-mobile-drawer="true"]')).toBeHidden();
});

test("proof ledger accepts keyboard focus and scroll input", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCapture(page, 0.54);
  const ledger = page.locator('[role="region"][tabindex="0"]');
  await ledger.focus();
  await expect(ledger).toBeFocused();
  const dimensions = await ledger.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await page.keyboard.press("PageDown");
  await expect.poll(() => ledger.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("short viewports use the complete linear layout instead of clipping stages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  const root = await openCapture(page, 0.98);
  await expect(root.locator('[data-experience-static="true"]')).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
});
