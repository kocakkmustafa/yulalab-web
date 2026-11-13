import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

const SCENE = "#scene-4-engineering";
// No digit, no "verified" wording in either language (record sentences included).
const FORBIDDEN = /doğrulan|doğrulandı|onaylandı|onaylan|ölçüldü|verified|validated|confirmed|measured/i;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** The h1 is split into animated word spans; compare letters only. */
async function expectHeading(page: Page, letters: string) {
  await expect
    .poll(async () => (await page.locator("h1").first().textContent())?.replace(/[^\p{L}]/gu, "") ?? "")
    .toContain(letters);
}

for (const view of [
  { name: "desktop 1440", viewport: { width: 1440, height: 900 } },
  { name: "mobile 390", viewport: { width: 390, height: 844 } },
] as const) {
  test.describe(`scene 4 engineering (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("four principles, each with a current cell and a planned cell", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator(SCENE);
      await scene.scrollIntoViewIfNeeded();
      const items = scene.locator("[data-scene4-principle]");
      await expect(items).toHaveCount(4);
      await expect(items.locator('[data-scene4-cell="current"]')).toHaveCount(4);
      await expect(items.locator('[data-scene4-cell="planned"]')).toHaveCount(4);
      await expect(items.locator('[data-scene4-badge="planned"]')).toHaveCount(4);
      await expect(items.locator('[data-scene4-badge="planned"]').first()).toHaveText("Planlanan");
      await expect(items.nth(0)).toContainText("Yerel öncelikli veri");
      await expect(items.nth(1)).toContainText("Harcama adımlarında izin ve kanıt");
      await expect(items.nth(2)).toContainText("Cihaz içi işleme");
      await expect(items.nth(3)).toContainText("Anlaşılır arayüz");
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("every current-capability row quotes its product record and shows the record status", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator(SCENE);
      await expect(scene.locator('[data-scene4-badge="capability"]')).toHaveCount(3);
      await expect(scene.locator('[data-scene4-badge="capability"]').first()).toHaveText("Mevcut yetenek");
      await expect(scene.locator('[data-scene4-badge="none"]')).toHaveCount(1);
      const sources = scene.locator("[data-scene4-source]");
      await expect(sources).toHaveCount(3);
      await expect(sources.nth(0)).toHaveAttribute("data-scene4-source", "projects/lifeos");
      await expect(sources.nth(0)).toHaveText("Kaynak: LifeOS ürün kaydı, “Yerel-öncelikli”; ürün durumu: Yayında");
      await expect(sources.nth(1)).toHaveAttribute("data-scene4-source", "projects/braavolabs");
      await expect(sources.nth(1)).toHaveText("Kaynak: Braavolabs ürün kaydı, “Harcama onayı”; ürün durumu: Beta");
      await expect(sources.nth(2)).toHaveText("Kaynak: LifeOS ürün kaydı, “Sağlık verisi, yalnız okuma”; ürün durumu: Yayında");
      // Record sentences, verbatim.
      const current = scene.locator('[data-scene4-cell="current"]');
      await expect(current.nth(0)).toContainText("Temel kayıtlar yerel çalışır; hesap gerekmez ve bu sürümde bulut senkronu sunulmaz.");
      await expect(current.nth(1)).toContainText("Para harcayan adımlar açık bir insan onayını bekler; her adım denetim izinde görünür.");
      await expect(current.nth(2)).toContainText("cihazda işlenir; sunucuya gönderilmez");
      // The principle without a record line has no source and no capability badge.
      await expect(scene.locator('[data-scene4-principle="p4"] [data-scene4-source]')).toHaveCount(0);
      await expect(scene.locator('[data-scene4-principle="p4"] [data-scene4-badge="capability"]')).toHaveCount(0);
    });

    test("no number, no 'verified' wording, no shared model or database claim", async ({ page }) => {
      await page.goto("/");
      const text = await page.locator(`${SCENE} [data-scene4-body]`).innerText();
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).toContain("ortak bir model ve ortak bir veritabanı yoktur");
      expect(text).toContain("bağımsız bir doğrulama ya da ölçüm değildir");
    expect(text).toContain("Ürün durumu iOS içindir; Android kapalı testtedir.");
    });
  });
}

test.describe("scene 4 links are live", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("/operating-system answers 200 with its page and the link navigates there", async ({ page }) => {
    await page.goto("/");
    const link = page.locator(`${SCENE} [data-scene4-link="operating-system"]`);
    await expect(link).toHaveCount(1);
    const href = await link.getAttribute("href");
    expect(href).toBe("/operating-system");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Nasıl çalışıyoruz");
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/operating-system$/);
    await expectHeading(page, "Nasılçalışıyoruz");
  });

  test("with the Studio flag off (default), /studio is not linked and /transparency replaces it", async ({ page }) => {
    await page.goto("/");
    const scene = page.locator(SCENE);
    await expect(scene.locator('[data-scene4-link="studio"]')).toHaveCount(0);
    const link = scene.locator('[data-scene4-link="transparency"]');
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute("href")).toBe("/transparency");
    const res = await page.request.get("/transparency");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Kara kutu değil");
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/transparency$/);
    await expectHeading(page, "Karakutudeğil");
  });
});

test.describe("scene 4 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.locator(SCENE).scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 4 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, four principles, record sentences in English", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator(SCENE);
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene4-principle]")).toHaveCount(4);
    await expect(scene.locator('[data-scene4-badge="capability"]').first()).toHaveText("Current capability");
    await expect(scene.locator("[data-scene4-source]").nth(0)).toHaveText(
      "Source: LifeOS product record, “Offline-first”; product status: Live",
    );
    await expect(scene.locator("[data-scene4-source]").nth(1)).toHaveText(
      "Source: Braavolabs product record, “Spend approval”; product status: Beta",
    );
    const text = await scene.locator("[data-scene4-body]").innerText();
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).toContain("there is no shared model and no shared database");
    expect(text).toContain("Product status refers to iOS; Android is in closed testing.");
    await expect(scene.getByRole("list", { name: /four shared engineering principles/i })).toBeVisible();
  });
});

test.describe("scene 4 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, four principles, no mixed-language words, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator(SCENE);
    await scene.scrollIntoViewIfNeeded();
    await expect(page.locator("[data-home-scenes]")).toHaveAttribute("lang", "en");
    await expect(page.locator("[data-home-scenes]")).toHaveAttribute("dir", "ltr");
    await expect(scene.locator("[data-scene4-principle]")).toHaveCount(4);
    await expect(scene.locator('[data-scene4-badge="capability"]').first()).toHaveText("Current capability");
    await expect(scene.locator("[data-scene4-source]").nth(0)).toHaveText(
      "Source: LifeOS product record, “Offline-first”; product status: Live",
    );
    const text = await scene.locator("[data-scene4-body]").innerText();
    expect(text).not.toMatch(/[؀-ۿ]/);
    expect(text).not.toMatch(/\d/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 4 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 4 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator(SCENE).scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include(SCENE)
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
