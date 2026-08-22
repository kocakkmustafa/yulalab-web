import { chromium, expect, test, type Page } from "@playwright/test";

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
  await page.goto(`/?capture=1&progress=${progress}&tier=${tier}`, {
    waitUntil: "domcontentloaded",
  });
  const root = page.locator(ROOT);
  await expect(root).toBeAttached({ timeout: 15_000 });
  await expect(root).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
  return root;
}

async function readCompositedCanvasStats(page: Page) {
  const canvas = page.locator("canvas");
  const bufferScale = await canvas.evaluate((source) => {
    const htmlCanvas = source as HTMLCanvasElement;
    const rect = source.getBoundingClientRect();
    return htmlCanvas.width / Math.max(1, rect.width);
  });

  // A WebGL context may discard its drawing buffer after presenting a frame.
  // Element screenshots sample Chromium's composited output instead, which is
  // the same image a visitor sees and remains valid with preserveDrawingBuffer=false.
  const screenshot = await canvas.screenshot({ type: "png" });
  const pixelStats = await page.evaluate(async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 64;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D sampling context unavailable");
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const colorBuckets = new Set<number>();
    let luminanceTotal = 0;
    let luminanceSquaredTotal = 0;
    let nonDarkPixels = 0;

    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      luminanceTotal += luminance;
      luminanceSquaredTotal += luminance * luminance;
      if (luminance > 18) nonDarkPixels += 1;
      colorBuckets.add((red >> 4) * 256 + (green >> 4) * 16 + (blue >> 4));
    }

    const pixelCount = pixels.length / 4;
    const mean = luminanceTotal / pixelCount;
    const variance = Math.max(0, luminanceSquaredTotal / pixelCount - mean * mean);
    return {
      colorBuckets: colorBuckets.size,
      nonDarkRatio: nonDarkPixels / pixelCount,
      standardDeviation: Math.sqrt(variance),
    };
  }, `data:image/png;base64,${screenshot.toString("base64")}`);

  return {
    bufferScale,
    ...pixelStats,
  };
}

test("focused product media settles before visual capture is ready", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 960, height: 640 });
  const firstProductCenter = 0.085 + (0.5 / 8) * (0.505 - 0.085);
  const root = await openCapture(page, firstProductCenter);
  await expect(root).toHaveAttribute("data-active-product", "braavolabs");
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 60_000 });
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 105_000 });
});

test("high-tier glass shader produces real canvas pixels", async () => {
  test.setTimeout(210_000);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      deviceScaleFactor: 1.75,
      locale: "tr-TR",
      viewport: { width: 960, height: 640 },
    });
    const page = await context.newPage();
    await page.goto("/?capture=1&progress=0&tier=high");
    const root = page.locator(ROOT);
    await expect(root).toHaveAttribute("data-experience-ready", "true", {
      timeout: 180_000,
    });
    await expect(root).toHaveAttribute("data-tier", "high");
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(1);
    const stats = await readCompositedCanvasStats(page);
    expect(stats.bufferScale).toBeGreaterThanOrEqual(1.5);
    expect(stats.colorBuckets).toBeGreaterThan(24);
    expect(stats.nonDarkRatio).toBeGreaterThan(0.02);
    expect(stats.standardDeviation).toBeGreaterThan(8);
    await context.close();
  } finally {
    await browser.close();
  }
});

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
    const root = await openCapture(page, progress, "low");
    await expect(root).toHaveAttribute("data-stage", stage);
    await expect(root).toHaveAttribute("data-tier", "low");
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

test("hero defers portfolio screenshot requests until a card approaches focus", async ({ page }) => {
  const portfolioRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/projects\/.*\.(?:avif|jpe?g|png|webp)(?:\?|$)/i.test(request.url())) {
      portfolioRequests.push(request.url());
    }
  });

  await openCapture(page, 0);
  await page.waitForTimeout(1_000);
  expect(portfolioRequests).toEqual([]);
});

test("server response contains the opening loader before hydration", async ({ request }) => {
  const response = await request.get("/en");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('data-yula-loader="true"');
  expect(html).toContain('role="status"');
});

test("English hero keeps the product-lab identity", async ({ page }) => {
  await page.goto("/en?capture=1&progress=0&tier=low");
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-mounted", "true", { timeout: 15_000 });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("body")).toContainText(/product lab/i);
});

const LOADER_VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "square", width: 927, height: 983 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "phone", width: 390, height: 844 },
] as const;

for (const viewport of LOADER_VIEWPORTS) {
  test(`opening blueprint stays contained on ${viewport.label}`, async () => {
    test.setTimeout(210_000);
    const browser = await chromium.launch();

    try {
    for (const loaderProgress of [0.15, 0.65, 0.92]) {
        const context = await browser.newContext({
          baseURL: "http://127.0.0.1:4173",
          locale: "en-US",
          viewport: { width: viewport.width, height: viewport.height },
        });
        const page = await context.newPage();
        await page.goto(
          `/en?capture=1&progress=0&tier=low&loader=1&loaderProgress=${loaderProgress}`,
          { waitUntil: "domcontentloaded" },
        );

        const root = page.locator(ROOT);
        await expect(root).toHaveAttribute("data-loader-visible", "true", { timeout: 45_000 });
        await expect(root).toHaveAttribute("data-experience-mounted", "true", {
          timeout: 45_000,
        });
        await expect(page.getByRole("status")).toBeVisible();
        await expect(page.locator('svg[class*="loaderBlueprint"]')).toBeVisible();
        await expect(page.locator('[class*="loaderField"]')).toBeAttached();
        await expect(page.locator('[class*="viewport"]')).toBeAttached();

        const metrics = await page.evaluate(() => {
          const blueprint = document.querySelector<SVGElement>('svg[class*="loaderBlueprint"]');
          const field = document.querySelector<HTMLElement>('[class*="loaderField"]');
          const viewportLayer = document.querySelector<HTMLElement>('[class*="viewport"]');
          if (!blueprint || !field || !viewportLayer) return null;

          const blueprintRect = blueprint.getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          const tabbableCount = document.querySelectorAll(
            '[class*="loader"] a, [class*="loader"] button, [class*="loader"] input, [class*="loader"] [tabindex]:not([tabindex="-1"])',
          ).length;

          return {
            blueprintLeft: blueprintRect.left,
            blueprintRight: blueprintRect.right,
            blueprintCenter: blueprintRect.left + blueprintRect.width / 2,
            blueprintHeight: blueprintRect.height,
            fieldLeft: fieldRect.left,
            fieldRight: fieldRect.right,
            fieldCenter: fieldRect.left + fieldRect.width / 2,
            horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
            viewportAriaHidden: viewportLayer.getAttribute("aria-hidden"),
            viewportInert: viewportLayer.hasAttribute("inert"),
            tabbableCount,
          };
        });

        expect(metrics).not.toBeNull();
        expect(metrics!.horizontalOverflow).toBeLessThanOrEqual(0);
        expect(metrics!.blueprintLeft).toBeGreaterThanOrEqual(metrics!.fieldLeft - 1);
        expect(metrics!.blueprintRight).toBeLessThanOrEqual(metrics!.fieldRight + 1);
        expect(Math.abs(metrics!.blueprintCenter - metrics!.fieldCenter)).toBeLessThanOrEqual(2);
        expect(metrics!.blueprintHeight).toBeLessThanOrEqual(viewport.height * 0.73);
        expect(metrics!.viewportAriaHidden).toBe("true");
        expect(metrics!.viewportInert).toBe(true);
        expect(metrics!.tabbableCount).toBe(0);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  });
}

test("adjacent stages dissolve instead of hard-cutting at their boundary", async ({ page }) => {
  await openCapture(page, 0.085);
  const crossfade = await page.locator('section[class*="stage"]').evaluateAll((sections) =>
    sections
      .map((section) => {
        const style = getComputedStyle(section);
        return {
          opacity: Number(style.opacity),
          visibility: style.visibility,
        };
      })
      .filter((stage) => stage.opacity > 0.01),
  );

  expect(crossfade).toHaveLength(2);
  expect(crossfade.every((stage) => stage.visibility === "visible")).toBe(true);
  expect(crossfade.every((stage) => stage.opacity > 0.45 && stage.opacity < 0.55)).toBe(true);

  const firstProduct = page.locator('[class*="productPanel"]').first();
  await expect(firstProduct).toHaveCSS("visibility", "visible");
  expect(Number(await firstProduct.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.98);
});

test("product descriptions crossfade between focus slots", async ({ page }) => {
  const productBoundary = 0.085 + (1 / 8) * (0.505 - 0.085);
  await openCapture(page, productBoundary);
  const productOpacities = await page.locator('[class*="productPanel"]').evaluateAll((panels) =>
    panels.map((panel) => Number(getComputedStyle(panel).opacity)).filter((opacity) => opacity > 0.01),
  );
  expect(productOpacities).toHaveLength(2);
  expect(productOpacities.every((opacity) => opacity > 0.45 && opacity < 0.55)).toBe(true);
});

test("service descriptions crossfade between focus slots", async ({ page }) => {
  const valueBoundary = 0.835 + (1 / 4) * (0.955 - 0.835);
  await openCapture(page, valueBoundary);
  const valueOpacities = await page.locator('article[class*="valuePanel"]').evaluateAll((panels) =>
    panels.map((panel) => Number(getComputedStyle(panel).opacity)).filter((opacity) => opacity > 0.01),
  );
  expect(valueOpacities).toHaveLength(2);
  expect(valueOpacities.every((opacity) => opacity > 0.45 && opacity < 0.55)).toBe(true);
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
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
  ).toBe("auto");
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
  await openCapture(page, 0.96);
  const closing = page.locator('section[class*="closingStage"]');
  await expect(closing).toHaveAttribute("data-interactive", "false");
  expect(await closing.evaluate((element) => element.hasAttribute("inert"))).toBe(true);

  await openCapture(page, 0.98);
  await expect(closing).toHaveAttribute("data-interactive", "true");
  expect(await closing.evaluate((element) => element.hasAttribute("inert"))).toBe(false);
  await expect(page.locator('a[href="/transparency"], a[href$="/transparency"]').first()).toBeAttached();
  await expect(page.locator('a[href="/privacy"], a[href$="/privacy"]').first()).toBeAttached();
  await expect(page.locator('a[href^="mailto:"]').first()).toBeAttached();
});

test("tablet closing remains inside the viewport and below the wordmark", async ({ page }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 900, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await openCapture(page, 1);
    const closing = page.locator('section[class*="closingStage"]');
    const content = closing.locator('[class*="closingContent"]');
    const wordmark = closing.locator('[class*="closingWordmark"]');
    const kicker = closing.locator('[class*="closingPitch"] [class*="kicker"]');
    await expect(content).toBeVisible();
    const [contentBounds, wordmarkBounds, kickerBounds] = await Promise.all([
      content.boundingBox(),
      wordmark.boundingBox(),
      kicker.boundingBox(),
    ]);
    expect(contentBounds).not.toBeNull();
    expect(contentBounds!.x).toBeGreaterThanOrEqual(0);
    expect(contentBounds!.x + contentBounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(wordmarkBounds!.y + wordmarkBounds!.height).toBeLessThanOrEqual(
      kickerBounds!.y - 6,
    );
    expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  }
});

test("short desktop closing keeps the wordmark above the pitch", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await openCapture(page, 1);
    const closing = page.locator('section[class*="closingStage"]');
    const wordmarkBounds = await closing
      .locator('[class*="closingWordmark"]')
      .boundingBox();
    const kickerBounds = await closing
      .locator('[class*="closingPitch"] [class*="kicker"]')
      .boundingBox();
    expect(wordmarkBounds).not.toBeNull();
    expect(kickerBounds).not.toBeNull();
    expect(wordmarkBounds!.y + wordmarkBounds!.height).toBeLessThanOrEqual(
      kickerBounds!.y - 6,
    );
  }
});

test("mobile closing separates the wordmark from the call to action", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 667 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await openCapture(page, 1);

    const closing = page.locator('section[class*="closingStage"]');
    const content = closing.locator('[class*="closingContent"]');
    const wordmark = closing.locator('[class*="closingWordmark"]');
    const kicker = closing.locator('[class*="closingPitch"] [class*="kicker"]');
    await expect(content).toBeVisible();

    const [contentBounds, wordmarkBounds, kickerBounds] = await Promise.all([
      content.boundingBox(),
      wordmark.boundingBox(),
      kicker.boundingBox(),
    ]);
    expect(contentBounds).not.toBeNull();
    expect(wordmarkBounds).not.toBeNull();
    expect(kickerBounds).not.toBeNull();
    expect(wordmarkBounds!.y + wordmarkBounds!.height).toBeLessThanOrEqual(
      kickerBounds!.y - 6,
    );
    expect(contentBounds!.y + contentBounds!.height).toBeLessThanOrEqual(viewport.height);
  }
});

test("linear-view control exposes the complete document on demand", async ({ page }) => {
  await openCapture(page, 0);
  await page.getByRole("button", { name: /linear experience|doğrusal deneyim/i }).click();
  await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const slug of PRODUCT_ORDER) {
    await expect(page.locator(`a[href$="/projects/${slug}"]`).first()).toBeVisible();
  }
  const transparencyLink = page
    .locator('[data-experience-static="true"] a[href$="/transparency"]')
    .first();
  await transparencyLink.click();
  await expect(page).toHaveURL(/\/transparency$/);
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
  await expect(page.locator('[data-sound-control="true"]')).toBeHidden();
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
