import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

const VIEWS = [
  { name: "desktop 1440", viewport: { width: 1440, height: 900 } },
  { name: "mobile 390", viewport: { width: 390, height: 844 } },
] as const;

// Whole-product or absolute claims, and "checked" wording, must not appear.
const FORBIDDEN =
  /doğrulandı|verified|validated|confirmed|measured|onaylandı|ölçüldü|asla|never|always|tüm ürün|all products|every product/i;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function bodyText(page: Page) {
  return page.locator("#scene-6-trust [data-scene6-trust]").innerText();
}

for (const view of VIEWS) {
  test.describe(`scene 6 trust (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("four rows in order, protection names each product", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-6-trust");
      await scene.scrollIntoViewIfNeeded();
      const rows = scene.locator("[data-scene6-row]");
      await expect(rows).toHaveCount(4);
      await expect(rows.nth(0)).toContainText("Veri koruma");
      await expect(rows.nth(1)).toContainText("Kontrol ve onay");
      await expect(rows.nth(2)).toContainText("Ölçülebilir sonuç");
      await expect(rows.nth(3)).toContainText("Şeffaf ürün aşaması");
      const protection = rows.nth(0);
      await expect(protection.locator('[data-scene6-line="protection.lifeos"]')).toContainText(
        "Kayıtlar cihazında kalır ve hesap gerekmez; bazı özellikler App Store aboneliği gerektirir.",
      );
      // Braavolabs server-side processing is stated explicitly.
      await expect(protection.locator('[data-scene6-line="protection.braavolabs"]')).toContainText(
        "Braavolabs veriyi sunucularda işler",
      );
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("lines point at their record and privacy page", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-6-trust");
      await expect(scene.locator('[data-scene6-line="protection.lifeos"] [data-scene6-source]')).toHaveAttribute(
        "data-scene6-source",
        "projects/lifeos",
      );
      await expect(scene.locator('[data-scene6-line="protection.braavolabs"] [data-scene6-source]')).toHaveAttribute(
        "data-scene6-source",
        "projects/braavolabs",
      );
      await expect(scene.locator('[data-scene6-line="protection.lifeos"] a')).toHaveAttribute("href", "/privacy/lifeos");
      await expect(scene.locator('[data-scene6-line="protection.braavolabs"] a')).toHaveAttribute(
        "href",
        "/privacy/braavolabs",
      );
      await expect(scene.locator('[data-scene6-line="control.braavolabs"]')).toContainText(
        "Para harcayan adımlar açık bir insan onayını bekler",
      );
    });

    test("result row publishes no figure; stage row reads record statuses", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-6-trust");
      await expect(scene.locator('[data-scene6-result="none"]')).toContainText("Henüz yayımlanmış bir sonuç ölçümü yok");
      const stage = (slug: string) => scene.locator(`[data-scene6-stage="${slug}"]`);
      await expect(stage("braavolabs")).toHaveText("Braavolabs · Beta");
      await expect(stage("lifeos")).toHaveText("LifeOS · Yayında");
      for (const slug of ["ostinato", "lissom", "gravita", "choreia", "jablab"]) {
        await expect(stage(slug)).toHaveAttribute("data-scene6-status", "coming-soon");
        await expect(stage(slug)).toContainText("Yakında");
      }
      await expect(scene.locator('[data-scene6-stage="burunfarki"]')).toHaveCount(0);
    });

    test("no number and no whole-product or absolute wording", async ({ page }) => {
      await page.goto("/");
      const text = await bodyText(page);
      expect(text).not.toMatch(/\d/);
      expect(text.toLocaleLowerCase("tr-TR")).not.toMatch(FORBIDDEN);
    });
  });
}

test.describe("scene 6 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-6-trust").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 6 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, four rows, honest wording", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator("#scene-6-trust");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene6-row]")).toHaveCount(4);
    await expect(scene.locator('[data-scene6-line="protection.lifeos"]')).toContainText(
      "Records stay on your device and no account is needed; some features need an App Store subscription.",
    );
    await expect(scene.locator('[data-scene6-line="protection.braavolabs"]')).toContainText(
      "Braavolabs handles data on servers",
    );
    await expect(scene.locator('[data-scene6-result="none"]')).toHaveText("No outcome measurements are published yet.");
    await expect(scene.locator('[data-scene6-stage="braavolabs"]')).toHaveText("Braavolabs · Beta");
    await expect(scene.locator('[data-scene6-stage="lifeos"]')).toHaveText("LifeOS · Live");
    await expect(scene.locator('[data-scene6-stage="gravita"]')).toHaveText("Gravita · Coming soon");
    const text = await bodyText(page);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(FORBIDDEN);
    await expect(scene.getByRole("list", { name: /four rows/i })).toBeVisible();
  });
});

test.describe("scene 6 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, four rows, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator("#scene-6-trust");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene6-row]")).toHaveCount(4);
    // Status words inside the English block are English (no mixed-script text).
    await expect(scene.locator('[data-scene6-stage="lifeos"]')).toHaveText("LifeOS · Live");
    await expect(scene.locator('[data-scene6-stage="lissom"]')).toHaveText("Lissom · Coming soon");
    expect(await bodyText(page)).not.toMatch(/[؀-ۿ]/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 6 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 6 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator("#scene-6-trust").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#scene-6-trust")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
