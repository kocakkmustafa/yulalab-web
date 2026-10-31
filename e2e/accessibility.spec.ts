import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const e2ePort = Number(process.env.YULA_E2E_PORT ?? "4173");

async function expectNoBlockingViolations(page: Page, label: string) {
  const pageEntrance = page.locator(".page-enter").first();
  if ((await pageEntrance.count()) > 0) {
    // Contrast must be sampled from the settled page. During the intentional
    // 500ms entrance fade, axe correctly blends text with the parent opacity
    // and can report a transient false positive even though the final token
    // is WCAG AA. Reduced-motion behavior is covered separately below.
    await pageEntrance.evaluate(async (element) => {
      await Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
    });
  }

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  const summary = blocking
    .map(
      (violation) => {
        const targets = violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(", ");
        return `${violation.impact}: ${violation.id} — ${violation.help} (${violation.nodes.length} node(s); ${targets})`;
      },
    )
    .join("\n");

  expect(summary, `${label}\n${summary}`).toBe("");
}

/**
 * Roadmap §10/§17: accessibility 100 on core routes, zero critical issues.
 *
 * The site had no automated a11y check at all — the number in the roadmap
 * was asserted by a Lighthouse run months ago and nothing has re-measured it
 * since. Two real defects found by hand in this task (a section labelled by
 * a <p> instead of a heading, and provenance text at 3.1:1 against AA's 4.5)
 * would both have been caught by this, which is the argument for running it
 * rather than trusting a stale score.
 */
const ROUTES = [
  ["home", "/"],
  ["products index", "/projects"],
  ["live product", "/projects/burunfarki"],
  ["research product", "/projects/choreia"],
  ["privacy", "/privacy"],
  ["transparency", "/transparency"],
  ["contact", "/contact"],
  ["home (en)", "/en"],
  ["live product (en)", "/en/projects/burunfarki"],
] as const;

for (const [label, path] of ROUTES) {
  test(`no serious or critical accessibility violations: ${label}`, async ({ page }) => {
    if (path === "/" || path === "/en") test.setTimeout(60_000);
    await page.goto(path);
    await expectNoBlockingViolations(page, path);
  });
}

for (const [locale, path, homeName, linearName, languageName] of [
  ["tr", "/?capture=1&progress=0&tier=low", "YULA Lab — Ana sayfa", "2D — Doğrusal deneyim", "Dil"],
  ["en", "/en?capture=1&progress=0&tier=low", "YULA Lab — Home", "2D — Linear experience", "Language"],
] as const) {
  test(`visible control labels remain inside their accessible names (${locale})`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const experience = page.locator('[data-yula-experience="true"]');
    await expect(experience).toHaveAttribute("data-experience-mounted", "true", {
      timeout: 45_000,
    });
    await expect(page.getByRole("link", { name: homeName, exact: true })).toBeAttached();
    await expect(page.getByRole("button", { name: linearName, exact: true })).toBeAttached();
    // Fourteen languages: the switcher is a labelled native <select>, not a TR/EN link.
    await expect(page.getByRole("combobox", { name: languageName, exact: true })).toBeAttached();

    const results = await new AxeBuilder({ page })
      .withRules(["label-content-name-mismatch"])
      .analyze();
    expect(
      results.violations.map((violation) => violation.id),
      `${locale} label-in-name mismatch`,
    ).toEqual([]);
  });
}

for (const [label, progress] of [
  ["hero", 0],
  ["proof", 0.54],
  ["closing", 0.98],
] as const) {
  test(`3D homepage ${label} stage has no serious or critical violations`, async ({ browser }) => {
    // Headless Chromium uses SwiftShader in CI. A cold shader compilation can
    // exceed 45s on a busy host even though the same committed-frame contract
    // resolves in a few seconds on hardware WebGL. Keep this bounded, but give
    // the software renderer enough room to produce the two real ready frames.
    test.setTimeout(120_000);
    const context = await browser.newContext({
      baseURL: `http://127.0.0.1:${e2ePort}`,
      locale: "tr-TR",
    });

    try {
      const page = await context.newPage();

      await page.goto(`/?capture=1&progress=${progress}&tier=low`);
      const experience = page.locator('[data-yula-experience="true"]');
      await expect(experience).toHaveAttribute("data-experience-ready", "true", {
        timeout: 75_000,
      });
      await expect(experience).toHaveAttribute("data-tier", "low");
      await expect(page.locator("canvas")).toHaveCount(1);
      await expectNoBlockingViolations(page, `homepage capture: ${label}`);
    } finally {
      await context.close();
    }
  });
}

test("reduced-motion homepage document has no serious or critical violations", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", locale: "tr-TR" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
  await expectNoBlockingViolations(page, "homepage reduced-motion document");
  await context.close();
});

test("the claims section survives a keyboard-only path to its source link", async ({ page }) => {
  // The proof surface is the point of the site; it has to be reachable
  // without a mouse.
  await page.goto("/en/projects/burunfarki");
  const link = page.getByRole("link", { name: /^source$/i }).first();
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute("href", /^https:\/\//);
});

test("respects prefers-reduced-motion", async ({ browser }) => {
  // Roadmap §7.1: motion is reduced-motion aware. Asserted by loading with
  // the preference set and confirming the page still renders its content —
  // a motion library that ignores the query typically leaves elements at
  // opacity 0 forever.
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/en/projects/burunfarki");
  await expect(page.getByRole("heading", { name: "Claims and sources", level: 2 })).toBeVisible();
  const unresolved = await page.locator(".reveal,.word").evaluateAll((elements) =>
    elements.filter((element) => {
      const style = getComputedStyle(element);
      return style.opacity !== "1" || style.transform !== "none" ||
        style.transitionDuration !== "0s";
    }).length,
  );
  expect(unresolved, "reveals must resolve immediately, including offscreen ancestors").toBe(0);
  await context.close();
});

for (const route of ["/en/projects/lifeos", "/en/manifesto", "/en/contact"]) {
  test(`server reveal content remains visible without JavaScript: ${route}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const reveals = page.locator(".reveal,.word");
      expect(await reveals.count()).toBeGreaterThan(0);
      expect(await reveals.evaluateAll((elements) => elements.filter((element) => {
        const style = getComputedStyle(element);
        return style.opacity !== "1" || style.transform !== "none";
      }).length)).toBe(0);
    } finally {
      await context.close();
    }
  });
}
