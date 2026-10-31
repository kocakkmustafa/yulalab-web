import { chromium, expect, test, type Page } from "@playwright/test";
import { LOCAL_ONLY_BROWSER_ARGS } from "../.github/ci/browser-options";

import { scrollProgressForTimeline } from "../src/components/experience/storyboard";

const e2ePort = Number(process.env.YULA_E2E_PORT ?? "4173");

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
  const browser = await chromium.launch({ args: LOCAL_ONLY_BROWSER_ARGS });
  try {
    const context = await browser.newContext({
      baseURL: `http://127.0.0.1:${e2ePort}`,
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

for (const viewport of [
  { width: 320, height: 700 },
  { width: 390, height: 667 },
] as const) {
  for (const [index, slug] of [
    [1, "burunfarki"],
    [7, "choreia"],
  ] as const) {
    const progress = 0.085 + ((index + 0.5) / PRODUCT_ORDER.length) * (0.505 - 0.085);
    test(`${slug} CTA stays inside its ${viewport.width}x${viewport.height} product card`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openCapture(page, progress);
      const panel = page.locator(`[data-product="${slug}"]`);
      await expect(panel).toHaveAttribute("data-active", "true");
      const bounds = await panel.evaluate((element) => {
        const panelRect = element.getBoundingClientRect();
        const linkRect = element.querySelector("a")?.getBoundingClientRect();
        return {
          panelBottom: panelRect.bottom,
          panelTop: panelRect.top,
          linkBottom: linkRect?.bottom ?? Number.POSITIVE_INFINITY,
          linkTop: linkRect?.top ?? Number.NEGATIVE_INFINITY,
          viewportHeight: window.innerHeight,
        };
      });
      expect(bounds.panelTop).toBeGreaterThanOrEqual(0);
      expect(bounds.panelBottom).toBeLessThanOrEqual(bounds.viewportHeight);
      expect(bounds.linkTop).toBeGreaterThanOrEqual(bounds.panelTop);
      expect(bounds.linkBottom).toBeLessThanOrEqual(bounds.panelBottom);
    });
  }
}

test("hero keeps one semantic product-lab H1", async ({ page }) => {
  await openCapture(page, 0);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("body")).toContainText(/product lab|ürün laboratuvarı/i);
  await expect(page.locator('[data-site-header="true"]')).toBeHidden();
  await expect(page.locator('[data-site-footer="true"]')).toBeHidden();
});

test("hero status panel leaves the centered glass-Y zone clear", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openCapture(page, 0);
  const panel = page.locator('[class*="heroCopy"]');
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(1280 * 0.7);
  expect(bounds!.x).toBeGreaterThan(1280 * 0.65);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1280);
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
    const browser = await chromium.launch({ args: LOCAL_ONLY_BROWSER_ARGS });

    try {
    for (const loaderProgress of [0.15, 0.65, 0.92]) {
        const context = await browser.newContext({
          baseURL: `http://127.0.0.1:${e2ePort}`,
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
            viewportOpacity: Number(getComputedStyle(viewportLayer).opacity),
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
        // The ready scene stays painted behind the opaque loader (no sequential
        // fade, which produced a black gap); it is hidden from AT and inert instead.
        expect(metrics!.viewportOpacity).toBe(1);
        expect(metrics!.tabbableCount).toBe(0);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  });
}

test("adjacent semantic stages hand off through one neutral boundary frame", async ({ page }) => {
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

  expect(crossfade).toHaveLength(0);

  const firstProduct = page.locator('[class*="productPanel"]').first();
  await expect(firstProduct).toHaveCSS("visibility", "visible");
  expect(Number(await firstProduct.evaluate((element) => getComputedStyle(element).opacity))).toBe(0);
});

const SEMANTIC_STAGE_BOUNDARIES = [
  ["proof", "incoming", 0.505],
  ["proof", "outgoing", 0.575],
  ["mission", "incoming", 0.69],
  ["mission", "outgoing", 0.765],
  ["vision", "incoming", 0.765],
  ["vision", "outgoing", 0.835],
  ["values", "incoming", 0.835],
  ["values", "outgoing", 0.955],
] as const;

for (const [stageName, edge, progress] of SEMANTIC_STAGE_BOUNDARIES) {
  test(`${stageName} ${edge} boundary is visually and semantically neutral`, async ({ page }) => {
    await openCapture(page, progress);
    const stage = page.locator(`[data-experience-stage="${stageName}"]`);
    await expect(stage).toHaveAttribute("data-active", "false");
    await expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(await stage.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
    expect(
      await stage.evaluate((element) => Number(getComputedStyle(element).opacity)),
    ).toBeLessThanOrEqual(0.01);
    expect(await stage.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    await expect(stage.getByRole("heading")).toHaveCount(0);

    const effectiveTabStops = await stage
      .locator('a[href], button, input, select, textarea, [tabindex]')
      .evaluateAll((elements) => elements.filter((element) => {
        const control = element as HTMLElement;
        return control.tabIndex >= 0 && !control.closest("[inert]");
      }).length);
    expect(effectiveTabStops).toBe(0);
  });
}

test("product descriptions have one exclusive owner at focus-slot boundaries", async ({ page }) => {
  const productBoundary = 0.085 + (1 / 8) * (0.505 - 0.085);
  await openCapture(page, productBoundary);
  const panels = page.locator('[class*="productPanel"]');
  const productOpacities = await panels.evaluateAll((elements) =>
    elements.map((panel) => Number(getComputedStyle(panel).opacity)).filter((opacity) => opacity > 0.01),
  );
  expect(productOpacities).toHaveLength(0);
  await expect(page.locator('[class*="productPanel"][data-active="true"]')).toHaveCount(0);

  const boundaryPanel = panels.nth(1);
  await expect(boundaryPanel).toHaveAttribute("aria-hidden", "true");
  expect(await boundaryPanel.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
  await expect(boundaryPanel.locator("a")).toHaveAttribute("tabindex", "-1");
});

test("service descriptions have one exclusive owner at focus-slot boundaries", async ({ page }) => {
  const valueBoundary = 0.835 + (1 / 4) * (0.955 - 0.835);
  await openCapture(page, valueBoundary);
  const panels = page.locator('article[class*="valuePanel"]');
  const valueOpacities = await panels.evaluateAll((elements) =>
    elements.map((panel) => Number(getComputedStyle(panel).opacity)).filter((opacity) => opacity > 0.01),
  );
  expect(valueOpacities).toHaveLength(0);
  await expect(page.locator('article[class*="valuePanel"][data-active="true"]')).toHaveCount(0);

  const boundaryPanel = panels.nth(1);
  await expect(boundaryPanel).toHaveAttribute("aria-hidden", "true");
  expect(await boundaryPanel.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
});

test("proof descriptions are semantically neutral at focus-slot boundaries", async ({ page }) => {
  const proofCount = await openCapture(page, 0.54).then(async () =>
    page.locator('article[class*="proofProduct"]').count(),
  );
  expect(proofCount).toBeGreaterThan(1);

  const proofBoundary = 0.505 + (1 / proofCount) * (0.575 - 0.505);
  await openCapture(page, proofBoundary);
  const panels = page.locator('article[class*="proofProduct"]');
  const proofOpacities = await panels.evaluateAll((elements) =>
    elements.map((panel) => Number(getComputedStyle(panel).opacity)).filter((opacity) => opacity > 0.01),
  );
  expect(proofOpacities).toHaveLength(0);
  await expect(page.locator('article[class*="proofProduct"][data-active="true"]')).toHaveCount(0);

  const boundaryPanel = panels.nth(1);
  await expect(boundaryPanel).toHaveAttribute("aria-hidden", "true");
  expect(await boundaryPanel.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
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
  await expect(body).toContainText(/SCROLL\s*\/\s*018%/i);
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

test("no-JS response is the complete linear document and labels publication history honestly", async ({ browser }) => {
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
  await expect(lifeOS).toContainText(/publication on record/i);
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

test("proof ledger leaves wheel ownership with the document", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const root = await openCapture(page, 0.54);
  // Mounting precedes WebGL warm-up. Begin input only after the existing
  // readiness signal, so renderer startup cannot consume the scroll deadline.
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
  const ledger = page.locator('[class*="proofGrid"]');
  const dimensions = await ledger.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);
  const before = await page.evaluate(() => window.scrollY);
  const bounds = await ledger.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.wheel(0, 640);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  expect(await ledger.evaluate((element) => element.scrollTop)).toBe(0);
});

for (const viewport of [
  { width: 1280, height: 560 },
  { width: 1366, height: 600 },
  { width: 1366, height: 601 },
] as const) {
  test(`short desktop ${viewport.width}x${viewport.height} retains the immersive journey`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);

    for (const [progress, stageName, contentSelector] of [
      [0.49, "portfolio", '[data-active="true"][data-product]'],
      [0.54, "proof", '[class*="proofGrid"]'],
      [0.9, "values", 'article[class*="valuePanel"][data-active="true"]'],
    ] as const) {
      const stageRoot = await openCapture(page, progress);
      await expect(stageRoot).toHaveAttribute("data-stage", stageName);
      const stage = page.locator(`[data-experience-stage="${stageName}"]`);
      const content = stage.locator(contentSelector);
      await expect(stage).toHaveAttribute("data-active", "true");
      await expect(content).toBeVisible();

      const fit = await stage.evaluate((element, selector) => {
        const contentElement = element.querySelector<HTMLElement>(selector);
        if (!contentElement) return null;
        const stageElement = element as HTMLElement;
        const rect = contentElement.getBoundingClientRect();
        return {
          contentBottom: rect.bottom,
          contentLeft: rect.left,
          contentRight: rect.right,
          contentTop: rect.top,
          contentNoClip: contentElement.scrollHeight <= contentElement.clientHeight + 1,
          stageNoClip: stageElement.scrollHeight <= stageElement.clientHeight + 1,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      }, contentSelector);

      expect(fit).not.toBeNull();
      expect(fit!.contentLeft).toBeGreaterThanOrEqual(-1);
      expect(fit!.contentRight).toBeLessThanOrEqual(fit!.viewportWidth + 1);
      expect(fit!.contentTop).toBeGreaterThanOrEqual(-1);
      expect(fit!.contentBottom).toBeLessThanOrEqual(fit!.viewportHeight + 1);
      expect(fit!.contentNoClip).toBe(true);
      if (stageName === "proof") expect(fit!.stageNoClip).toBe(true);
    }

    const root = await openCapture(page, 0.98);
    await expect(root.locator('[data-experience-static="true"]')).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 45_000 });
    await expect(root).toHaveAttribute("data-experience-ready", "true", {
      timeout: 45_000,
    });
    await expect(root).toHaveAttribute("data-stage", "closing");

    const closing = page.locator('[data-experience-stage="closing"]');
    const content = closing.locator('[class*="closingContent"]');
    const wordmark = closing.locator('[class*="closingWordmark"]');
    const email = closing.locator('a[href^="mailto:"]');
    const trustLinks = closing.locator('[class*="trustLinks"] a');
    await expect(closing).toHaveAttribute("data-active", "true");
    await expect(content).toBeVisible();
    await expect(wordmark).toBeVisible();
    await expect(email).toBeVisible();
    expect(await trustLinks.count()).toBeGreaterThanOrEqual(5);
    for (const link of await trustLinks.all()) await expect(link).toBeVisible();

    const closingFit = await closing.evaluate((element) => {
      const stage = element as HTMLElement;
      const contentElement = stage.querySelector<HTMLElement>('[class*="closingContent"]');
      const wordmarkElement = stage.querySelector<HTMLElement>('[class*="closingWordmark"]');
      const emailElement = stage.querySelector<HTMLElement>('a[href^="mailto:"]');
      const trustElement = stage.querySelector<HTMLElement>('[class*="trustLinks"]');
      if (!contentElement || !wordmarkElement || !emailElement || !trustElement) return null;
      const rects = [contentElement, wordmarkElement, emailElement, trustElement]
        .map((item) => item.getBoundingClientRect());
      return {
        allInsideViewport: rects.every((rect) =>
          rect.left >= -1 &&
          rect.right <= window.innerWidth + 1 &&
          rect.top >= -1 &&
          rect.bottom <= window.innerHeight + 1
        ),
        contentNoClip: contentElement.scrollHeight <= contentElement.clientHeight + 1,
        stageNoClip: stage.scrollHeight <= stage.clientHeight + 1,
        wordmarkBottom: rects[1].bottom,
        contentTop: rects[0].top,
      };
    });

    expect(closingFit).not.toBeNull();
    expect(closingFit!.allInsideViewport).toBe(true);
    expect(closingFit!.contentNoClip).toBe(true);
    expect(closingFit!.stageNoClip).toBe(true);
    expect(closingFit!.wordmarkBottom).toBeLessThanOrEqual(closingFit!.contentTop - 6);
  });
}

test("native journey anchors retain their target after resizing", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(120_000);
  // CI uses software WebGL. Control only the renderer label so this test
  // exercises real native scroll geometry outside capture mode. This does
  // not establish hardware or performance acceptance.
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
      return parameter === 37446
        ? "local anchor geometry test renderer"
        : original.call(this, parameter);
    };
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?tier=low");
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 75_000 });
  await expect(root).toHaveAttribute("data-loader-visible", "false");
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [anchor, stage] of [["portfolio", "portfolio"], ["proof", "proof"], ["manifesto", "mission"]]) {
      await page.locator(`header a[href="#experience-${anchor}"]`).first().click();
      await expect(root).toHaveAttribute("data-stage", stage);
      await expect.poll(() => page.locator(`#experience-${anchor}`).evaluate(
        (element) => Math.abs(element.getBoundingClientRect().top),
      )).toBeLessThan(2);
      if (anchor === "proof") {
        await expect(page.locator('[data-experience-stage="proof"] article').first())
          .toHaveAttribute("data-active", "true");
      }
    }
  }
});

test("all mobile product actions remain reachable with enlarged text", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 667 });
  for (let index = 0; index < 8; index++) {
    await openCapture(page, 0.085 + ((index + 0.5) / 8) * (0.505 - 0.085));
    const panel = page.locator('[data-experience-stage="portfolio"] article[data-active="true"]');
    await panel.evaluate((element) => {
      // Snapshot first so nested inline labels receive exactly 200%, too.
      const styles = Array.from(element.querySelectorAll<HTMLElement>("h2,p,a,span,strong"))
        .map((node) => ({ node, font: parseFloat(getComputedStyle(node).fontSize), line: getComputedStyle(node).lineHeight }));
      for (const { node, font, line } of styles) {
        node.style.fontSize = `${font * 2}px`;
        if (line !== "normal") node.style.lineHeight = `${parseFloat(line) * 2}px`;
      }
    });
    const action = panel.locator("a");
    await action.scrollIntoViewIfNeeded();
    await action.focus();
    await expect(action).toBeFocused();
    const fit = await action.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const parent = element.closest("article")!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, parentTop: parent.top, parentBottom: parent.bottom, viewport: innerHeight };
    });
    expect(fit.top).toBeGreaterThanOrEqual(fit.parentTop);
    expect(fit.bottom).toBeLessThanOrEqual(Math.min(fit.parentBottom, fit.viewport) + 1);
    expect(await panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  }
});

for (const [locale, liveLabel, betaLabel] of [
  ["tr", "Yayın kaydı var", "Beta kaydı var"],
  ["en", "Publication on record", "Beta on record"],
] as const) {
  test(`homepage publication badges describe records rather than current access (${locale})`, async ({ page }) => {
    const prefix = locale === "en" ? "/en" : "";
    for (const [progress, slug, lifecycle, label] of [
      [0.21625, "lifeos", "live", liveLabel],
      [0.11125, "braavolabs", "beta", betaLabel],
    ] as const) {
      await page.goto(`${prefix}/?capture=1&progress=${progress}&tier=low`);
      await expect(page.locator(`[data-product="${slug}"][data-active="true"] [data-lifecycle="${lifecycle}"]`)).toHaveText(label);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(prefix || "/");
    const linear = page.locator('[data-experience-static="true"]');
    await expect(linear.locator('[data-lifecycle="live"]').first()).toHaveText(liveLabel);
    await expect(linear.locator('[data-lifecycle="beta"]').first()).toHaveText(betaLabel);
  });
}

// Normal URLs exercise native history and GPU interaction; no capture override.
async function openNativeJourney(page: Page, pathname = "/") {
  await page.goto(pathname);
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-experience-mounted", "true");
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  test.skip(await root.getAttribute("data-experience-fallback") === "true",
    "Normal WebGL interaction requires a hardware renderer; software fallback is covered separately.");
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  return root;
}

test("native opening keeps the ready hero painted through the loader exit", { tag: "@hardware-webgl" }, async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const samples: { ms: number; loader: boolean; ready: boolean; progress: number; combinedAlpha: number }[] = [];
    (window as Window & { openingPaintSamples?: typeof samples }).openingPaintSamples = samples;
    const sample = () => {
      const root = document.querySelector<HTMLElement>("[data-yula-experience]");
      const loader = document.querySelector<HTMLElement>("[data-yula-loader]");
      const viewport = root?.querySelector<HTMLElement>('[class*="viewport"]');
      if (root && viewport) {
        const loaderAlpha = loader ? Number(getComputedStyle(loader).opacity) : 0;
        const viewportAlpha = Number(getComputedStyle(viewport).opacity);
        samples.push({ ms: performance.now(), loader: Boolean(loader), ready: root.dataset.experienceReady === "true", progress: Number(loader?.dataset.loaderProgress ?? 1), combinedAlpha: 1 - (1 - loaderAlpha) * (1 - viewportAlpha) });
      }
      if (performance.now() < 12_000 && (!samples.length || samples.at(-1)?.loader)) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openNativeJourney(page);
  const handoff = await page.evaluate(() => ((window as Window & { openingPaintSamples?: { ms: number; loader: boolean; ready: boolean; progress: number; combinedAlpha: number }[] }).openingPaintSamples ?? []).filter((sample) => sample.ready && sample.progress >= 0.9));
  expect(handoff.length).toBeGreaterThan(5);
  expect(Math.min(...handoff.map((sample) => sample.combinedAlpha))).toBeGreaterThanOrEqual(0.95);
  await testInfo.attach("opening-paint-handoff", { body: JSON.stringify(handoff), contentType: "application/json" });
});

// The home journey no longer opens dated development captures (founder
// decision 2026-10-31: products are introduced by their app icons), so the
// native development-reader history test left with that reader.

test("native history returns to each product without replaying the opening", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const root = await openNativeJourney(page);
  const documentStartedAt = await page.evaluate(() => performance.timeOrigin);
  const openingEntry = await page.evaluate(() => window.history.state?.__yulaJourneyV1?.entryId);
  for (const [slug, progress] of [["braavolabs", 0.11125], ["lifeos", 0.21625]] as const) {
    if (slug === "braavolabs") {
      await page.locator('header > nav a[href="#experience-portfolio"]').click();
    } else {
      await page.evaluate((value) => window.scrollTo({
        top: (document.documentElement.scrollHeight - innerHeight) * value,
        behavior: "instant",
      }), scrollProgressForTimeline(progress));
    }
    await page.waitForFunction((value) => Math.abs(scrollY -
      (document.documentElement.scrollHeight - innerHeight) * value) < 3, scrollProgressForTimeline(progress));
    await expect(root).toHaveAttribute("data-active-product", slug);
    const before = await page.evaluate(() => scrollY);
    await expect.poll(() => page.evaluate(() => Boolean(history.state?.__NA && history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE))).toBe(true);
    if (slug === "braavolabs") {
      await expect.poll(() => page.evaluate(() => history.state?.__yulaJourneyV1?.entryId)).not.toBe(openingEntry);
    }
    await page.locator(`[data-experience-stage="portfolio"] article[data-active="true"] a[href$="/projects/${slug}"]`).click();
    await page.waitForURL(`**/projects/${slug}`);
    for (let traversal = 0; traversal < 2; traversal++) {
      await page.goBack();
      await expect(root).toHaveAttribute("data-experience-mounted", "true");
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
      await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 1_000 });
      await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(3);
      await expect(root).toHaveAttribute("data-active-product", slug);
      if (traversal === 0) {
        await page.goForward();
        await page.waitForURL(`**/projects/${slug}`);
      }
    }
  }
  await page.locator('[data-experience-stage="portfolio"] article[data-active="true"] a[href$="/projects/lifeos"]').click();
  await page.waitForURL("**/projects/lifeos");
  await page.locator("header").getByRole("link", { name: /YULA/i }).first().click();
  await expect(root).toHaveAttribute("data-loader-visible", "true");
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-stage", "hero");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.reload();
  await expect(root).toHaveAttribute("data-loader-visible", "true");
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-stage", "hero");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("native emblem responds to drag and keyboard while wheel keeps document ownership", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNativeJourney(page);
  const control = page.locator('[data-yula-glyph-control="true"]');
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  const canvas = page.locator("canvas");
  const before = await canvas.screenshot();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await control.getAttribute("data-glyph-yaw"))).toBeGreaterThan(0.3);
  expect(await canvas.screenshot()).not.toEqual(before);
  await control.focus();
  await page.keyboard.press("Home");
  await expect(control).toHaveAttribute("data-glyph-yaw", "0.000");
  await expect(control).toHaveAttribute("data-glyph-pitch", "0.000");
  await page.keyboard.press("ArrowRight");
  await expect(control).toHaveAttribute("data-glyph-yaw", "0.120");
  await page.keyboard.press("Escape");
  await expect(control).toHaveAttribute("data-glyph-yaw", "0.000");
  await page.keyboard.press("Enter");
  await expect(control).toHaveAttribute("data-glyph-yaw", "0.120");
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
});


test("native immediate Back then Forward keeps the last scroll before persistence", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/lifeos");
  await page.locator("header").getByRole("link", { name: /YULA/i }).first().click();
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  test.skip(await root.getAttribute("data-experience-fallback") === "true", "Hardware WebGL required for native journey history.");
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  const target = await page.evaluate((documentProgress) => {
    const y = Math.round((document.documentElement.scrollHeight - innerHeight) * documentProgress);
    window.scrollTo({ top: y, behavior: "instant" });
    window.history.back();
    return y;
  }, scrollProgressForTimeline(0.21625));
  await page.waitForURL("**/projects/lifeos");
  await page.goForward();
  await expect(root).toHaveAttribute("data-experience-mounted", "true");
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 1_000 });
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - target)).toBeLessThan(3);
  await expect(root).toHaveAttribute("data-active-product", "lifeos");
});


test("English native gallery CTA keeps one locale prefix and returns in the same document", { tag: "@hardware-webgl" }, async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  test.skip(await root.getAttribute("data-experience-fallback") === "true", "Hardware WebGL required for native journey history.");
  await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  const documentStartedAt = await page.evaluate(() => performance.timeOrigin);
  await page.locator('header > nav a[href="#experience-portfolio"]').click();
  await page.waitForFunction((documentProgress) => Math.abs(scrollY -
    (document.documentElement.scrollHeight - innerHeight) * documentProgress) < 3, scrollProgressForTimeline(0.11125));
  const link = page.locator('[data-experience-stage="portfolio"] article[data-active="true"] a');
  await expect(link).toHaveAttribute("href", "/en/projects/braavolabs");
  const before = await page.evaluate(() => scrollY);
  await link.click();
  await page.waitForURL("**/en/projects/braavolabs");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
  await page.goBack();
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 1_000 });
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(3);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStartedAt);
});

// Coordinate taps intentionally bypass locator actionability: a visible row's
// actual center must receive the touch instead of an invisible sibling layer.
for (const height of [667, 844]) {
  for (const locale of ["tr", "en"] as const) {
    test.describe(`native mobile menu ${locale} 390x${height}`, () => {
      test.use({ hasTouch: true });
      test("owns center taps and excludes emblem focus until dismissed", { tag: "@hardware-webgl" }, async ({ page }, testInfo) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width: 390, height });
        const root = await openNativeJourney(page, locale === "en" ? "/en" : "/");
        const control = page.locator('[data-yula-glyph-control="true"]');
        const menu = page.locator("header details");
        const summary = menu.locator("summary");
        const taps: { target: string; x: number; y: number; hit: string | null }[] = [];
        const center = async (locator: ReturnType<Page["locator"]>) => {
          const box = await locator.boundingBox();
          expect(box).not.toBeNull();
          return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
        };
        for (const [target, stage] of [
          ["experience-portfolio", "portfolio"],
          ["experience-manifesto", "mission"],
          ["experience-proof", "proof"],
        ]) {
          const opener = await center(summary);
          await page.touchscreen.tap(opener.x, opener.y);
          await expect(menu).toHaveAttribute("open", "");
          await expect(control).toBeHidden();
          await control.focus();
          await expect(control).not.toBeFocused();
          await summary.focus();
          for (let index = 0; index < 16; index++) {
            await page.keyboard.press(index < 8 ? "Tab" : "Shift+Tab");
            await expect(control).not.toBeFocused();
          }
          const link = menu.locator(`a[href="#${target}"]`);
          const point = await center(link);
          const hit = await page.evaluate(({ x, y }) =>
            document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ?? null, point);
          taps.push({ target, ...point, hit });
          expect(hit).toBe(`#${target}`);
          if (target === "experience-portfolio") {
            await testInfo.attach("open-menu", { body: await page.screenshot(), contentType: "image/png" });
          }
          await page.touchscreen.tap(point.x, point.y);
          await expect(page).toHaveURL(new RegExp(`${locale === "en" ? "/en" : "/"}#${target}$`));
          await expect(menu).not.toHaveAttribute("open", "");
          await expect(root).toHaveAttribute("data-stage", stage);
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
          await expect(root).toHaveAttribute("data-stage", "hero");
          await expect(control).toBeVisible();
          await expect(control).toHaveAttribute("data-glyph-yaw", "0.000");
        }
        // Dismissal restores normal touch/keyboard behavior; raising the menu
        // must not turn the whole semantic overlay into a pointer interceptor.
        const point = await center(control);
        await page.touchscreen.tap(point.x, point.y);
        await expect(control).toHaveAttribute("data-glyph-yaw", "0.120");
        await control.focus();
        await page.keyboard.press("ArrowRight");
        await expect(control).toHaveAttribute("data-glyph-yaw", "0.240");
        await page.keyboard.press("Home");
        const session = await page.context().newCDPSession(page);
        const swipe = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
          await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
          for (let step = 1; step <= 8; step++) {
            await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
              x: from.x + (to.x - from.x) * step / 8,
              y: from.y + (to.y - from.y) * step / 8,
            }] });
            await page.waitForTimeout(24);
          }
          await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        };
        // Measure the swipe's own effect: returning from an anchor jump can leave
        // a few pixels of residual smooth scroll that the gesture did not cause.
        const scrollBeforeSwipe = await page.evaluate(() => scrollY);
        await swipe({ x: point.x - 45, y: point.y }, { x: point.x + 45, y: point.y });
        await expect.poll(async () => Number(await control.getAttribute("data-glyph-yaw"))).toBeGreaterThan(0.2);
        const horizontalYaw = await control.getAttribute("data-glyph-yaw");
        expect(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeSwipe)).toBeLessThan(3);
        await control.focus();
        await page.keyboard.press("Home");
        await swipe({ x: point.x, y: point.y + 30 }, { x: point.x, y: point.y - 100 });
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30);
        await expect(control).toHaveAttribute("data-glyph-yaw", "0.000");
        await expect(control).toHaveAttribute("data-glyph-pitch", "0.000");
        await session.detach();
        await testInfo.attach("native-menu-evidence", {
          body: JSON.stringify({ locale, viewport: { width: 390, height }, taps, horizontalYaw,
            verticalScrollY: await page.evaluate(() => scrollY) }), contentType: "application/json",
        });
      });
    });
  }
}
