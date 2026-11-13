import { test, expect } from "@playwright/test";

/**
 * WEB-UX-04 prototype routes (/prototype/*). They answer 404 unless the server
 * was started with UX_PROTOTYPE=1, so, like contact.spec.ts, the describe block
 * registered matches the server's mode (no skipped tests):
 *   default server          -> closed-gate test
 *   UX_PROTOTYPE=1 server   -> UX_PROTOTYPE=1 playwright test e2e/prototype.spec.ts
 * The prototype pages make no network call beyond their own documents.
 */
const open = process.env.UX_PROTOTYPE === "1";

if (!open) {
  test.describe("prototype (gate closed, default)", () => {
    test("/prototype/start answers 404", async ({ page }) => {
      const res = await page.goto("/prototype/start");
      expect(res?.status()).toBe(404);
    });
  });
}

if (open) {
  test.describe("prototype: doors (E2)", () => {
    test("four doors point at real routes", async ({ page, request }) => {
      const res = await page.goto("/prototype/start");
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(4);
      for (const href of ["/prototype/projects", "/consulting", "/contact", "/transparency"]) {
        await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
        const r = await request.get(href);
        expect(r.status(), href).toBe(200);
      }
    });
  });

  test.describe("prototype: product discovery (E3)", () => {
    test("groups, badges, filter and panel on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/prototype/projects");
      await expect(page.getByRole("heading", { level: 2, name: /Ana ürünler/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /Portföy/ })).toBeVisible();
      const items = page.locator('section[aria-labelledby^="grp-"] li');
      await expect(items).toHaveCount(8);
      await expect(items.first()).toContainText("LifeOS");
      await expect(items.first()).toContainText("Yayında");
      await expect(items.filter({ hasText: "Ostinato" })).toContainText("Yakında");
      await page.getByRole("button", { name: "Beta", exact: true }).click();
      await expect(items).toHaveCount(1);
      await expect(page).toHaveURL(/durum=beta/);
      await page.getByRole("button", { name: "Hepsi" }).click();
      await expect(items).toHaveCount(8);
      await expect(page.locator("#universe-panel")).toBeVisible();
      await items.filter({ hasText: "Braavolabs" }).getByRole("button", { name: "Önizle" }).click();
      await expect(page).toHaveURL(/katman=braavolabs/);
      await expect(page.locator("#universe-panel")).toContainText("Braavolabs");
    });

    test("?katman= deep link restores the panel; mobile has no panel", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/prototype/projects?katman=lifeos");
      await expect(page.locator("#universe-panel")).toContainText("LifeOS");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("#universe-panel")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Önizle" })).toHaveCount(0);
      await expect(page.locator('section[aria-labelledby^="grp-"] li')).toHaveCount(8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  });

  test.describe("prototype: product detail (E4)", () => {
    test("live product shows the 8 items in order with a badge", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/prototype/projects/lifeos");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/LifeOS/);
      await expect(page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) }).getByText("Yayında").first()).toBeVisible();
      const ids = await page.locator("[id]").evaluateAll((els) => els.map((e) => e.id).filter((id) => /^s[1-8]$/.test(id)));
      expect(ids).toEqual(["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]);
      await expect(page.locator("#s4")).toContainText("ekran görüntüsü henüz yok");
      await expect(page.locator('#s5 a[href*="/privacy"]').first()).toBeVisible();
    });

    test("research product shows no unsupported capability claims", async ({ page }) => {
      await page.goto("/prototype/projects/ostinato");
      await expect(page.getByText("Yakında").first()).toBeVisible();
      await expect(page.locator('section[aria-labelledby="s3"]')).toContainText("Kayıt: araştırma");
      await expect(page.getByText("240")).toHaveCount(0);
      await expect(page.locator("#s8 a[href^='mailto:']").first()).toBeVisible();
    });

    test("unknown slug is a 404", async ({ page }) => {
      const res = await page.goto("/prototype/projects/nope");
      expect(res?.status()).toBe(404);
    });
  });

  test.describe("prototype: conceptual simulation (E5)", () => {
    test("label is visible, tabs work, no network request", async ({ page }) => {
      await page.goto("/prototype/projects/braavolabs");
      await page.locator("#dene").scrollIntoViewIfNeeded();
      await expect(page.locator("#dene")).toContainText("Kavramsal simülasyon");
      await expect(page.locator("#dene")).toContainText("gerçek bir kabiliyeti değildir");
      const requests: string[] = [];
      // Data calls only: the site-wide 3D scene may lazy-load its own static chunks.
      page.on("request", (r) => {
        if (["fetch", "xhr", "websocket", "eventsource", "ping"].includes(r.resourceType())) requests.push(r.url());
      });
      await page.getByRole("tab", { name: "Erişim yolu" }).click();
      await expect(page.getByRole("tab", { name: "Erişim yolu" })).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#sim-body")).toContainText("Kayıtta gerçek");
      await page.getByRole("tab", { name: "Erişim yolu" }).press("ArrowRight");
      await expect(page.getByRole("tab", { name: "Veri" })).toHaveAttribute("aria-selected", "true");
      expect(requests).toEqual([]);
    });
  });

  test.describe("prototype: localized product text keeps its own language (ar)", () => {
    test("ar: product text carries lang=ar dir=rtl inside the lang=en fallback scope", async ({ page }) => {
      await page.goto("/ar/prototype/projects/lifeos");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator('div[lang="en"][dir="ltr"] section[aria-labelledby="s1"]')).toBeVisible();
      await expect(page.locator("section[aria-labelledby='s1'] span[lang='ar'][dir='rtl']").first()).toBeVisible();
      await page.goto("/ar/prototype/projects");
      await expect(page.locator("li span[lang='ar'][dir='rtl']").first()).toBeVisible();
    });
  });

  test.describe("prototype: contact paths (E8)", () => {
    test("five audience paths, mailto and the approved sentence", async ({ page }) => {
      await page.goto("/prototype/contact");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('section[aria-labelledby^="p-"]')).toHaveCount(5);
      const sentence = "İş ortaklığı ve yatırım görüşmeleri için bize yazın.";
      await expect(page.locator("[data-partner-sentence]")).toHaveCount(2);
      await expect(page.locator("[data-partner-sentence]").first()).toHaveText(sentence);
      await expect(page.locator("[data-partner-sentence]").first()).toHaveAttribute("lang", "tr");
      await expect(page.locator('a[href="mailto:support@yulalab.com"]').first()).toBeVisible();
      // the support address is shown once per path (no text + link duplicate)
      await expect(page.getByText("support@yulalab.com", { exact: false })).toHaveCount(
        await page.locator('a[href="mailto:support@yulalab.com"]').count(),
      );
      await expect(page.locator('a[href="mailto:yula@yulalab.com"]').first()).toBeVisible();
      await expect(page.locator('a[href="/consulting"]').first()).toBeVisible();
      await expect(page.locator('a[href="/transparency"]').first()).toBeVisible();
      await expect(page.getByText("KURUCU KARARI")).toHaveCount(0);
      await expect(page.getByText(/Sermaye sağlamıyoruz/)).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
    });
  });
}
