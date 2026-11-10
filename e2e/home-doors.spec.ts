import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

// WEB-UX-05d. `/lab` (05e) and `/contact#yollar` (05f) are not on this base:
// only their href attribute is checked, no test navigates to them.
const DOOR_HREFS = ["/projects", "/consulting", "/contact#yollar", "/lab", "/transparency"];

test.describe("home doors strip", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("strip sits after the journey, outside YulaExperience, with four doors and real hrefs", async ({ page }) => {
    await page.goto("/");
    const strip = page.locator("#scene-7-start [data-home-doors]");
    await expect(strip).toHaveCount(1);
    await expect(page.locator("[data-yula-experience] [data-home-doors]")).toHaveCount(0);
    const order = await page.evaluate(() => {
      const journey = document.querySelector("[data-yula-experience]");
      const doors = document.querySelector("[data-home-doors]");
      return !!journey && !!doors && !!(journey.compareDocumentPosition(doors) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);
    await expect(strip.locator("[data-home-door]")).toHaveCount(4);
    const hrefs = await strip.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(DOOR_HREFS);
    expect(hrefs.join(" ")).not.toMatch(/\/start|mailto|studio/);
    // The scene anchor contract is untouched.
    await expect(page.locator("section#scene-7-start")).toHaveCount(1);
    for (const id of ["scene-1-identity", "scene-3-products", "scene-6-trust"]) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
  });

  test("links do not prefetch (plain anchors)", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("#scene-7-start [data-home-doors] a");
    expect(await links.count()).toBe(5);
    expect(await links.evaluateAll((els) => els.filter((e) => e.hasAttribute("data-nimg") || e.getAttribute("rel") === "prefetch").length)).toBe(0);
  });
});

test.describe("loader skip", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("Tab reaches 'Girişi atla', focus is visible and Enter hands the page over", async ({ page }) => {
    await page.goto("/");
    const skip = page.locator("[data-yula-loader-skip]");
    await expect(skip).toBeVisible({ timeout: 30_000 });
    await expect(skip).toHaveText("Girişi atla");
    for (let i = 0; i < 40 && !(await skip.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
    await page.keyboard.press("Enter");
    const root = page.locator("[data-yula-experience]");
    await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 45_000 });
    await expect(page.locator("[data-yula-loader]")).toHaveCount(0);
    await expect(root).toHaveAttribute("data-experience-ready", "true", { timeout: 45_000 });
  });

  test("Escape skips the intro and the page is interactive afterwards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-yula-loader-skip]")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Escape");
    const root = page.locator("[data-yula-experience]");
    await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 45_000 });
    const overflow = await page.evaluate(() => document.documentElement.style.overflow);
    expect(overflow).not.toBe("hidden");
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test("Escape already handled elsewhere (Doors panel, menu) does not also skip the intro", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-yula-loader-skip]")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") e.preventDefault();
      });
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const progress = await page.locator("[data-yula-loader]").getAttribute("data-loader-progress");
    expect(Number(progress)).toBeLessThan(0.5);
  });

  test("the skip button is absent where there is no opening card (reduced motion)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-yula-loader-skip]")).toHaveCount(0);
    await expect(page.locator("#scene-7-start [data-home-door]")).toHaveCount(4);
  });
});

test.describe("header doors and scroll lock", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("desktop panel: four doors, href only for lab and #yollar, Esc returns focus", async ({ page }) => {
    await page.goto("/projects");
    const trigger = page.locator("[data-site-doors-trigger]");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("[data-site-doors-panel]");
    const hrefs = await panel.locator("a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(["/projects", "/consulting", "/contact#yollar", "/lab"]);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe("mobile menu scroll lock", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  test("open menu locks page scroll, close restores it; doors listed", async ({ page }) => {
    await page.goto("/projects");
    const before = await page.evaluate(() => document.body.style.overflow);
    await page.locator("header button[aria-controls='site-mobile-navigation']").click();
    await expect(page.locator("[data-site-mobile-panel][data-open='true']")).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const hrefs = await page.locator("[data-site-mobile-panel] a[data-site-door]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(["/projects", "/consulting", "/contact#yollar", "/lab"]);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-site-mobile-panel][data-open='false']")).toBeAttached();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(before);
  });
});

test.describe("menu opened during the opening card", () => {
  test.use({ viewport: { width: 1000, height: 800 }, locale: "tr-TR" });

  test("closing the menu leaves no scroll lock behind, before or after the card leaves", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-yula-loader-skip]")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() =>
      document.querySelector<HTMLButtonElement>("header button[aria-controls='site-mobile-navigation']")?.click(),
    );
    await expect(page.locator("[data-site-mobile-panel][data-open='true']")).toBeAttached();
    await page.evaluate(() =>
      document.querySelector<HTMLButtonElement>("[data-site-mobile-panel] button.mm-close")?.click(),
    );
    await expect(page.locator("[data-site-mobile-panel][data-open='false']")).toBeAttached();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-yula-experience]")).toHaveAttribute("data-loader-visible", "false", { timeout: 45_000 });
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });
});
