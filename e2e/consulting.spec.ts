import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * /consulting optional lead form (intent `partnership`). Rendered only when
 * LEADS_ENABLED=1 (default closed) and the locale is tr/en. The flag is read
 * while /consulting is prerendered, i.e. at `next build`, not `next start`:
 * for open-mode tests run `LEADS_ENABLED=1 pnpm build` first, then
 * `LEADS_ENABLED=1 playwright test e2e/consulting.spec.ts`. CI builds with the
 * default env, so only closed-mode assertions run (no skipped tests). The
 * mailto path is asserted in both modes. The network is always mocked.
 */
const leadsOpen = process.env.LEADS_ENABLED === "1";

for (const [locale, prefix, title, action] of [
  ["tr", "", "Yapay zekayı işinizde faydaya dönüştürün.", "Projenizi konuşalım"],
  ["en", "/en", "Make AI useful in your business.", "Discuss your project"],
] as const) {
  for (const width of [320, 390, 1440]) {
    test(`${locale} consulting flow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${prefix}/consulting`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://yulalab.com${prefix}/consulting`);
      await expect(page.locator("form")).toHaveCount(leadsOpen ? 1 : 0);
      await page.getByRole("link", { name: action, exact: true }).first().click();
      await expect(page).toHaveURL(/#consulting-contact$/);
      const email = page.locator("[data-consulting-email]");
      await expect(email).toBeVisible();
      const href = await email.getAttribute("href");
      expect(href).toMatch(/^mailto:yula@yulalab\.com\?subject=/);
      await expect(page.getByText("yula@yulalab.com", { exact: true })).toBeVisible();
      await expect(page.locator('footer a[href="mailto:support@yulalab.com"]')).toHaveCount(1);
      expect(decodeURIComponent(href!)).toContain(locale === "tr" ? "AI danışmanlığı görüşmesi" : "AI consulting enquiry");
      await email.focus();
      await expect(email).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`consulting-${locale}-${width}.png`), fullPage: true });
      if (width === 1440) {
        await page.getByRole("link", { name: locale === "tr" ? "Ürünlerimizi inceleyin" : "Explore our products", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${prefix}/projects$`));
        await page.goto(`${prefix}/contact`);
        // 05f: the contact path links straight to the mail section (chain /contact → /consulting → mailto shortened).
        await expect(page.getByRole("link", { name: action, exact: true })).toHaveAttribute("href", `${prefix}/consulting#consulting-contact`);
        await page.goto(`${prefix}/projects/burunfarki`);
        await expect(page.getByText(locale === "tr" ? /tahminler yarıştan önce kayda geçer/ : /predictions are recorded before each race/)).toBeVisible();
        await page.goto(prefix || "/");
        await expect(page.locator('[data-experience-static="true"]')).toBeVisible();
        await expect(page.getByRole("link", { name: locale === "tr" ? "AI danışmanlığı" : "AI consulting", exact: true }).first()).toHaveAttribute("href", `${prefix}/consulting`);
      }
      expect(errors).toEqual([]);
    });
  }
}

for (const [prefix, menuName, consultingName, title] of [
  ["", "Menü", "AI danışmanlığı", "Yapay zekayı işinizde faydaya dönüştürün."],
  ["/en", "Menu", "AI consulting", "Make AI useful in your business."],
] as const) {
  test(`preserved modal navigates to consulting (${prefix || 'tr'})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${prefix}/contact`);
    const menu = page.locator("header button[aria-controls='site-mobile-navigation']");
    await menu.click();
    const dialog = page.getByRole("dialog", { name: menuName, exact: true });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => {
        const active = document.activeElement;
        return active && active !== document.body && !active.closest("dialog");
      })).toBe(false);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(menu).toBeFocused();
    await menu.click();
    await dialog.getByRole("link", { name: consultingName, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/consulting$`));
    await expect(page.locator("dialog")).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
}

if (leadsOpen) {
  test.describe("consulting lead form (open)", () => {
    test("shows the form without a topic selector and keeps mailto", async ({ page }) => {
      await page.goto("/consulting");
      await expect(page.locator("[data-consulting-lead-form] form")).toBeVisible();
      await expect(page.locator("[data-consulting-lead-form]").getByRole("combobox")).toHaveCount(0);
      await expect(page.locator("[data-consulting-email]")).toHaveAttribute("href", /^mailto:yula@yulalab\.com\?subject=/);
    });

    test("de: no form, mailto remains", async ({ page }) => {
      await page.goto("/de/consulting");
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator("[data-consulting-email]")).toBeVisible();
    });

    test("201 posts intent partnership and shows the receipt", async ({ page }) => {
      let body: Record<string, unknown> | null = null;
      await page.route("**/api/leads", async (route) => {
        body = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { receiptId: "cons-1" } });
      });
      await page.goto("/consulting");
      await page.getByLabel("Ad", { exact: true }).fill("Ada Test");
      await page.getByLabel("E-posta", { exact: true }).fill("ada@example.com");
      await page.getByLabel("Mesaj", { exact: true }).fill("Danışmanlık görüşmesi istiyorum.");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Gönder", exact: true }).click();
      await expect(page.getByText("Referans: cons-1")).toBeVisible();
      expect(body).toMatchObject({ intent: "partnership", consent: true, locale: "tr" });
      expect(body).not.toHaveProperty("productSlug");
      await expect(page.locator("[data-consulting-email]")).toBeVisible();
    });
  });
}
