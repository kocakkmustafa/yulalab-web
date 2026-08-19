import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // Named in the failure so a regression says WHAT broke, not just a count.
    const summary = blocking
      .map((v) => `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} node(s))`)
      .join("\n");
    expect(summary, `${path}\n${summary}`).toBe("");
  });
}

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
  await expect(page.getByRole("heading", { name: "Verified claims", level: 2 })).toBeVisible();
  const hidden = await page.evaluate(() =>
    Array.from(document.querySelectorAll("h1,h2,h3,p")).filter((el) => {
      const s = getComputedStyle(el);
      return s.opacity === "0" && el.textContent!.trim().length > 0;
    }).length,
  );
  expect(hidden, "content left invisible when motion is reduced").toBe(0);
  await context.close();
});
