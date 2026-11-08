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

// Claims, absolutes and offers the page cannot back.
const FORBIDDEN =
  /doğrulandı|verified|validated|confirmed|measured|onaylandı|ölçüldü|asla|never|always|ücretsiz|free trial|hemen başla|get started now|start now/i;

// CTA key -> [href, heading text (tr), heading text (en), expected locale-free path]
const CTAS = [
  { key: "products", href: "/projects", h1: { tr: /Ürünler|Projeler/i, en: /Products|Projects/i } },
  { key: "braavolabs", href: "/projects/braavolabs", h1: { tr: /Braavolabs/i, en: /Braavolabs/i } },
  { key: "consulting", href: "/consulting", h1: { tr: /Yapay zekayı işinizde faydaya dönüştürün/, en: /Make AI useful in your business/ } },
  { key: "notes", href: "/notes", h1: { tr: /.+/, en: /What we did, as it happened/ } },
  { key: "approach", href: "/operating-system", h1: { tr: /.+/, en: /.+/ } },
  { key: "contact", href: "/contact", h1: { tr: /.+/, en: /Let's talk/ } },
] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function bodyText(page: Page) {
  return page.locator("#scene-7-start [data-scene7-paths]").innerText();
}

for (const view of VIEWS) {
  test.describe(`scene 7 start (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("three paths with equal weight, six links, no filled primary", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-7-start");
      await scene.scrollIntoViewIfNeeded();
      await expect(scene.getByRole("group", { name: /Başlamanın üç yolu/ })).toHaveCount(1);
      const paths = scene.locator("[data-scene7-path]");
      await expect(paths).toHaveCount(3);
      await expect(paths.nth(0)).toHaveAttribute("data-scene7-path", "individual");
      await expect(paths.nth(1)).toHaveAttribute("data-scene7-path", "business");
      await expect(paths.nth(2)).toHaveAttribute("data-scene7-path", "engineer");
      await expect(paths.nth(0).getByRole("heading", { level: 3 })).toHaveText("Bireyler için");
      await expect(paths.nth(1).getByRole("heading", { level: 3 })).toHaveText("İşletmeler için");
      await expect(paths.nth(2).getByRole("heading", { level: 3 })).toHaveText("Mühendisler için");
      const links = scene.locator("a[data-scene7-cta]");
      await expect(links).toHaveCount(6);
      // Every CTA has the same visual weight: transparent ground, same border, same type.
      const styles = await links.evaluateAll((els) =>
        els.map((e) => {
          const c = getComputedStyle(e);
          return `${c.backgroundColor}|${c.borderTopWidth}|${c.color}|${c.fontSize}`;
        }),
      );
      expect(new Set(styles).size).toBe(1);
      expect(styles[0].startsWith("rgba(0, 0, 0, 0)")).toBe(true);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("labels say what the target is; no data-room, studio or sign-up link", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-7-start");
      const label = (key: string) => scene.locator(`a[data-scene7-cta="${key}"]`);
      await expect(label("products")).toHaveText("Ürünlere göz at");
      await expect(label("braavolabs")).toContainText("Braavolabs ile işi otomatikleştir");
      await expect(label("consulting")).toHaveText("Birlikte nasıl çalışabileceğimizi gör");
      await expect(label("notes")).toHaveText("Laboratuvar defterini oku");
      await expect(label("approach")).toHaveText("Teknik yaklaşımı oku");
      await expect(label("contact")).toHaveText("Ekiple iletişime geç");
      const hrefs = await scene.locator("a[data-scene7-cta]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
      expect(hrefs).toEqual(CTAS.map((c) => c.href));
      expect(hrefs.join(" ")).not.toMatch(/studio|data-room|dataroom|signup|sign-up|mailto/i);
      // No two links share a name.
      const names = (await scene.locator("a").allTextContents()).map((n) => n.trim());
      expect(new Set(names).size).toBe(names.length);
    });

    test("Braavolabs link shows the stage from the product record", async ({ page }) => {
      await page.goto("/");
      const link = page.locator('#scene-7-start a[data-scene7-cta="braavolabs"]');
      await expect(link.locator("[data-scene7-status]")).toHaveAttribute("data-scene7-status", "beta");
      await expect(link.locator("[data-scene7-status]")).toHaveText("Beta");
      await expect(link).toHaveAccessibleName(/Braavolabs ile işi otomatikleştir\s+Beta/);
    });

    test("every CTA target answers 200 with real content, and a click opens it", async ({ page }) => {
      for (const cta of CTAS) {
        const res = await page.request.get(cta.href);
        expect(res.status(), cta.href).toBe(200);
        expect((await res.text()).length, cta.href).toBeGreaterThan(2000);
      }
      for (const cta of CTAS) {
        await page.goto("/");
        const link = page.locator(`#scene-7-start a[data-scene7-cta="${cta.key}"]`);
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${cta.href}$`));
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(cta.h1.tr);
      }
    });

    test("no number and no claim or offer wording", async ({ page }) => {
      await page.goto("/");
      const text = await bodyText(page);
      expect(text).not.toMatch(/\d/);
      expect(text.toLocaleLowerCase("tr-TR")).not.toMatch(FORBIDDEN);
    });

    test("footer still holds its links and scene 7 adds no footer or nav element", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#scene-7-start footer")).toHaveCount(0);
      await expect(page.locator("#scene-7-start nav")).toHaveCount(0);
      await expect(page.locator("footer")).toHaveCount(1);
    });
  });
}

test.describe("scene 7 keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("Tab walks the six CTAs in reading order with a visible focus ring", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("#scene-7-start a[data-scene7-cta]");
    await links.first().scrollIntoViewIfNeeded();
    await links.first().focus();
    for (let i = 0; i < 6; i++) {
      await expect(links.nth(i)).toBeFocused();
      if (i === 0) {
        const outline = await links.nth(0).evaluate((e) => {
          const c = getComputedStyle(e);
          return `${c.outlineStyle}|${c.outlineWidth}`;
        });
        expect(outline).toBe("solid|2px");
        const box = await links.nth(0).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      if (i < 5) await page.keyboard.press("Tab");
    }
    await links.nth(5).press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
  });
});

test.describe("scene 7 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow, targets at least 44 px", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-7-start").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const heights = await page
      .locator("#scene-7-start a[data-scene7-cta]")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("scene 7 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, six links to real routes, honest wording", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator("#scene-7-start");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.getByRole("group", { name: /Three ways to start/ })).toHaveCount(1);
    await expect(scene.locator("[data-scene7-path]")).toHaveCount(3);
    const link = (key: string) => scene.locator(`a[data-scene7-cta="${key}"]`);
    await expect(link("products")).toHaveText("Browse the products");
    await expect(link("braavolabs")).toContainText("Automate work with Braavolabs");
    await expect(link("braavolabs").locator("[data-scene7-status]")).toHaveText("Beta");
    await expect(link("consulting")).toHaveText("See how we can work together");
    await expect(link("notes")).toHaveText("Read the lab notebook");
    await expect(link("approach")).toHaveText("Read the technical approach");
    await expect(link("contact")).toHaveText("Get in touch with the team");
    const hrefs = await scene.locator("a[data-scene7-cta]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(CTAS.map((c) => `/en${c.href}`));
    for (const href of hrefs) {
      const res = await page.request.get(href!);
      expect(res.status(), href!).toBe(200);
    }
    for (const cta of CTAS) {
      await page.goto("/en");
      const l = page.locator(`#scene-7-start a[data-scene7-cta="${cta.key}"]`);
      await l.scrollIntoViewIfNeeded();
      await l.click();
      await expect(page).toHaveURL(new RegExp(`/en${cta.href}$`));
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(cta.h1.en);
    }
    await page.goto("/en");
    const text = await bodyText(page);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(FORBIDDEN);
  });
});

test.describe("scene 7 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, English stage word, no Arabic letters, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator("#scene-7-start");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene7-path]")).toHaveCount(3);
    await expect(scene.locator('a[data-scene7-cta="braavolabs"] [data-scene7-status]')).toHaveText("Beta");
    expect(await bodyText(page)).not.toMatch(/[؀-ۿ]/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const hrefs = await scene.locator("a[data-scene7-cta]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    for (const href of hrefs) {
      const res = await page.request.get(href!);
      expect(res.status(), href!).toBe(200);
    }
  });
});

test.describe("scene 7 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 7 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator("#scene-7-start").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#scene-7-start")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
