import { test, expect, type Page } from "@playwright/test";

// WEB-P0-02a: light / dark / system switching and persistence across reloads.
// Storage key and colours are the public contract of src/lib/theme.ts.
const KEY = "yula.appearance.v1";
const ROUTE = "/consulting";
const BG = { light: "rgb(246, 245, 240)", dark: "rgb(13, 14, 17)" } as const;

const control = (page: Page) => page.getByRole("combobox", { name: /Görünüm|Appearance/ }).first();
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY);

test.describe("appearance: light, dark, system", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("system mode follows the OS preference live", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(ROUTE);
    await expect(control(page)).toBeEnabled();
    await expect(control(page)).toHaveValue("system");
    expect(await theme(page)).toBe("dark");
    expect(await bodyBg(page)).toBe(BG.dark);
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => theme(page)).toBe("light");
    expect(await bodyBg(page)).toBe(BG.light);
  });

  test("explicit light and dark choices apply, persist and survive a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(ROUTE);
    await expect(control(page)).toBeEnabled();

    await control(page).selectOption("light");
    await expect.poll(() => theme(page)).toBe("light");
    expect(await stored(page)).toBe("light");
    expect(await bodyBg(page)).toBe(BG.light);
    await page.reload();
    expect(await theme(page)).toBe("light");
    await expect(control(page)).toHaveValue("light");
    expect(await bodyBg(page)).toBe(BG.light);

    await control(page).selectOption("dark");
    await expect.poll(() => theme(page)).toBe("dark");
    expect(await stored(page)).toBe("dark");
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    expect(await theme(page)).toBe("dark");
    await expect(control(page)).toHaveValue("dark");
    expect(await bodyBg(page)).toBe(BG.dark);
  });

  test("switching back to system re-follows the OS and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript((k) => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem(k, "dark"); } }, KEY);
    await page.goto(ROUTE);
    expect(await theme(page)).toBe("dark");
    await expect(control(page)).toBeEnabled();
    await control(page).selectOption("system");
    await expect.poll(() => theme(page)).toBe("light");
    expect(await stored(page)).toBe("system");
    await page.reload();
    expect(await theme(page)).toBe("light");
    await expect(control(page)).toHaveValue("system");
  });
});
