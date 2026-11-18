import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CASES = [
  ["tr", "lifeos", 6, "Tasarım önizlemesi"],
  ["tr", "braavolabs", 5, "Tasarım önizlemesi"],
  ["en", "lifeos", 6, "Design preview"],
  ["en", "braavolabs", 5, "Design preview"],
  ["ar", "lifeos", 6, "معاينة التصميم"],
  ["ar", "braavolabs", 5, "معاينة التصميم"],
] as const;

for (const [locale, slug, count, label] of CASES) {
  test(`design previews ${locale}/${slug}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const api: string[] = [];
    page.on("request", (r) => { if (new URL(r.url()).pathname.startsWith("/api")) api.push(r.url()); });
    await page.goto(locale === "tr" ? `/projects/${slug}` : `/${locale}/projects/${slug}`);
    // Below 1024px the screen item is a collapsed <details>; open it like a reader would.
    const details = page.locator("details#ekran");
    if (await details.count()) await details.locator("summary").click();
    const section = page.locator(`[data-design-previews="${slug}"]`);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText(label);
    const imgs = section.locator("img");
    await expect(imgs).toHaveCount(count);
    for (let i = 0; i < count; i++) {
      await imgs.nth(i).scrollIntoViewIfNeeded();
      await expect.poll(() => imgs.nth(i).evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    const results = await new AxeBuilder({ page }).include(`[data-design-previews="${slug}"]`).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(api).toEqual([]);
  });
}
