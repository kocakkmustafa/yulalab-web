import { expect, test, type Page } from "@playwright/test";

// W1 BK3: fare/kaydirma etkilesimleri, sayfa gecisi ve hareket tercihi.
for (const locale of ["tr", "en"] as const) {
  const base = locale === "en" ? "/en" : "/tr";

  test.describe(`theme interactions (${locale})`, () => {
    test.use({ locale: locale === "en" ? "en-US" : "tr-TR", viewport: { width: 1440, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.route("**/*", (route) =>
        ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    });

    test("hover dims links to opacity .7 over .3s", async ({ page }) => {
      await page.goto(`${base}/projects`);
      const link = page.locator("[data-site-header] nav a[href]").first();
      await expect(link).toBeVisible();
      await expect.poll(() => link.evaluate((el) => getComputedStyle(el).transitionDuration)).toContain("0.3s");
      await link.hover();
      await expect.poll(() => link.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 3000 }).toBeCloseTo(0.7, 1);
      await page.mouse.move(5, 500);
      await expect.poll(() => link.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
    });

    test("header CTA pill fills white on hover instead of dimming", async ({ page }) => {
      await page.goto(`${base}/projects`);
      const pill = page.locator("a.header-cta").first();
      await pill.hover();
      await expect.poll(() => pill.evaluate((el) => getComputedStyle(el).backgroundColor), { timeout: 3000 }).toMatch(/^rgb\((2[3-5]\d|255)/);
      expect(await pill.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    });

    test("reduced motion: no transitions, no running animations, instant page change", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${base}/projects`);
      const link = page.locator("[data-site-header] nav a[href]").first();
      expect(await link.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s(, 0s)*$/);
      expect(await page.locator(".page-enter").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
      await page.locator("[data-site-header] nav a[href]").nth(1).click();
      await page.waitForURL((u) => !u.pathname.endsWith("/projects"));
      await expect(page.locator("main h1").first()).toBeVisible();
      // Exit fade is skipped: the new page is visible well under the 0.45s exit.
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
    });

    test("reveal: below-the-fold blocks are pending, then visible after scrolling", async ({ page }) => {
      await page.goto(`${base}/projects`);
      const footer = page.locator("footer[data-reveal]");
      await expect(footer).toHaveAttribute("data-reveal-state", /pending|in/);
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveAttribute("data-reveal-state", "in");
      await expect.poll(() => footer.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
    });

    test("skip link moves focus to main; #hash scrolls the target into view", async ({ page }) => {
      await page.goto(`${base}/projects`);
      await page.keyboard.press("Tab");
      await expect(page.locator("a.skip-link")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("main#main-content")).toBeFocused();

      await page.evaluate(() => {
        const target = document.createElement("div");
        target.id = "w1-anchor";
        target.style.cssText = "height:40px;scroll-margin-top:120px;margin-top:2400px";
        target.tabIndex = -1;
        target.textContent = "anchor";
        document.querySelector("main")!.appendChild(target);
        const a = document.createElement("a");
        a.href = "#w1-anchor";
        a.id = "w1-link";
        a.style.cssText = "position:fixed;top:300px;left:20px;z-index:300;background:#fff;color:#000";
        a.textContent = "go";
        document.querySelector("main")!.prepend(a);
      });
      await page.locator("#w1-link").click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
      const top = await page.locator("#w1-anchor").evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(100);
      expect(top).toBeLessThan(400);
    });

    test("client navigation moves focus to main and lands on the new page", async ({ page }) => {
      await page.goto(`${base}/projects`);
      await page.locator("[data-site-header] nav a[href]").nth(1).click();
      await expect(page.locator("main#main-content")).toBeFocused({ timeout: 8000 });
    });

    test("390px: no horizontal overflow", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of [`${base}/projects`, `${base}/contact`, `${base}/notes`]) {
        await page.goto(path);
        await expect(page.locator("main h1").first()).toBeVisible();
        const overflow = await horizontalOverflow(page);
        expect(overflow, path).toBe(0);
      }
    });
  });
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
}
