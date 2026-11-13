import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

const LOCALES = [
  { code: "tr", prefix: "", menu: "Menü", close: "Kapat", primary: ["Ürünler", "Laboratuvar", "İş Birliği"] },
  { code: "en", prefix: "/en", menu: "Menu", close: "Close", primary: ["Products", "Lab", "Collaboration"] },
  { code: "ar", prefix: "/ar", menu: "القائمة", close: "إغلاق", primary: ["المنتجات", "المختبر", "التعاون"] },
] as const;

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const l of LOCALES) {
  test.describe(`mobile header and footer (${l.code})`, () => {
    test.use({ viewport: { width: 390, height: 844 }, locale: l.code === "tr" ? "tr-TR" : l.code });

    test("menu shows three primary entries, traps Tab and closes with Escape", async ({ page }) => {
      await page.goto(`${l.prefix}/contact`);
      const menu = page.locator("header button[aria-controls='site-mobile-navigation']");
      await menu.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: l.menu, exact: true });
      await expect(dialog).toBeVisible();
      const primary = dialog.locator("nav > a");
      await expect(primary).toHaveCount(3);
      for (const [index, label] of l.primary.entries()) await expect(primary.nth(index)).toHaveText(label);
      if (l.code === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      // Tab order stays inside the dialog and wraps from the last to the first control.
      await expect(dialog.getByRole("button", { name: l.close, exact: true })).toBeFocused();
      const seen: string[] = [];
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        const state = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return { inside: !!el && !!document.getElementById("site-mobile-navigation")?.contains(el), id: el?.getAttribute("href") ?? el?.getAttribute("aria-label") ?? el?.tagName ?? "" };
        });
        expect(state.inside).toBe(true);
        seen.push(state.id);
      }
      expect(new Set(seen).size).toBeGreaterThan(5);
      await page.keyboard.press("Shift+Tab");
      await expect(dialog).toBeVisible();

      // Touch targets: every link/button in the menu is at least 44px tall.
      const tooSmall = await dialog.locator("a, button, select").evaluateAll((nodes) =>
        nodes.filter((n) => n.getBoundingClientRect().height < 43.5).map((n) => n.textContent?.trim() || n.tagName));
      expect(tooSmall).toEqual([]);
      expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(menu).toBeFocused();
    });

    test("footer keeps legal, contact and social links and no store link", async ({ page }) => {
      await page.goto(`${l.prefix}/contact`);
      const footer = page.locator('[data-site-footer="true"]');
      for (const href of ["/privacy", "/terms", "/contact", "/consulting", "/projects", "/notes"]) {
        await expect(footer.locator(`a[href='${l.prefix}${href}']`).first()).toBeAttached();
      }
      await expect(footer.locator("a[href^='mailto:support@yulalab.com']")).toHaveCount(1);
      await expect(footer.locator("a[href*='apps.apple.com'], a[href*='play.google.com']")).toHaveCount(0);
      for (const social of await footer.locator("a[target='_blank']").all()) {
        const box = await social.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect(await social.getAttribute("aria-label")).toMatch(/^(X|LinkedIn|Instagram)$/);
      }
    });

    test("no horizontal overflow at 390 and 320", async ({ page }) => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 700 });
        await page.goto(`${l.prefix}/contact`);
        expect(await overflow(page)).toBeLessThanOrEqual(0);
      }
    });
  });
}

test.describe("desktop header (1440)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const scheme of ["light", "dark"] as const) {
    test(`links the four entries in order, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("/contact");
      const links = page.locator("header nav a");
      await expect(links).toHaveCount(5);
      const hrefs = await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
      expect(hrefs).toEqual(["/projects", "/notes", "/manifesto", "/consulting", "/projects"]);
      await links.first().focus();
      await expect(links.first()).toBeFocused();
      expect(await page.locator("header [data-ticker], header marquee").count()).toBe(0);
      const serious = (await new AxeBuilder({ page }).include("header").include("footer").analyze()).violations
        .filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(serious).toEqual([]);
    });
  }

  test("RTL desktop header does not break", async ({ page }) => {
    await page.goto("/ar/contact");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await expect(page.locator("header nav a[href='/ar/projects']").first()).toBeVisible();
  });
});
