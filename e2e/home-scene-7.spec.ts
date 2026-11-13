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

// Door links, in reading order. `lab` (WEB-UX-05e) and `contact` (#yollar,
// WEB-UX-05f) are not on this base: only their href is checked, never navigated.
const LINKS = [
  { key: "products", href: "/projects", live: true, h1: { tr: /^Aile\.$/, en: /^The\sfamily\.$/ } },
  {
    key: "consulting",
    href: "/consulting",
    live: true,
    h1: { tr: /^Yapay zekayı işinizde faydaya dönüştürün\.$/, en: /^Make AI useful in your business\.$/ },
  },
  { key: "contact", href: "/contact#yollar", live: false },
  { key: "lab", href: "/lab", live: false },
  { key: "transparency", href: "/transparency", live: true, h1: { tr: /./, en: /./ } },
] as const;

/**
 * Wait for hydration and the opening card to leave: until then the page pins
 * itself to the top, and a scroll made earlier is undone (pre-existing).
 */
async function ready(page: Page) {
  const root = page.locator("[data-yula-experience]");
  await expect(root).toHaveAttribute("data-experience-mounted", "true", { timeout: 45_000 });
  const skip = page.locator("[data-yula-loader-skip]");
  if (await skip.isVisible()) await page.keyboard.press("Escape");
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 45_000 });
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function bodyText(page: Page) {
  return page.locator("#scene-7-start [data-home-doors]").innerText();
}

for (const view of VIEWS) {
  test.describe(`scene 7 start (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("four doors with equal weight, five links, no filled primary", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-7-start");
      await scene.scrollIntoViewIfNeeded();
      await expect(scene.getByRole("heading", { level: 3, name: "Ne için buradasın?" })).toHaveCount(1);
      const doors = scene.locator("[data-home-door]");
      await expect(doors).toHaveCount(4);
      for (const [i, key] of ["products", "work", "partners", "inspect"].entries()) {
        await expect(doors.nth(i)).toHaveAttribute("data-home-door", key);
      }
      await expect(doors.nth(0).getByRole("heading", { level: 4 })).toHaveText("Ürünleri keşfet");
      await expect(doors.nth(1).getByRole("heading", { level: 4 })).toHaveText("İşime AI");
      await expect(doors.nth(2).getByRole("heading", { level: 4 })).toHaveText("İş birliği ve şirket");
      await expect(doors.nth(3).getByRole("heading", { level: 4 })).toHaveText("İnceleme");
      const links = scene.locator("a[data-home-door-link]");
      await expect(links).toHaveCount(5);
      // Every CTA has the same visual weight: transparent ground, same border, same type.
      const styles = await links.evaluateAll((els) =>
        els.map((e) => {
          const c = getComputedStyle(e);
          return `${c.backgroundColor}|${c.borderTopWidth}|${c.color}|${c.fontSize}`;
        }),
      );
      expect(new Set(styles).size).toBe(1);
      expect(styles[0].startsWith("rgba(0, 0, 0, 0)")).toBe(true);
      // Same size too: every target is at least 48 px tall; on desktop all have one height.
      const heights = await links.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(48);
      if (view.viewport.width >= 1024) expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("labels say what the target is; no data-room, studio or sign-up link", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-7-start");
      const label = (key: string) => scene.locator(`a[data-home-door-link="${key}"]`);
      await expect(label("products")).toHaveText("Ürünlere göz at");
      await expect(label("consulting")).toHaveText("AI danışmanlığını gör");
      await expect(label("contact")).toHaveText("İş birliği yollarını gör");
      await expect(label("lab")).toHaveText("Laboratuvarı gez");
      await expect(label("transparency")).toHaveText("Şeffaflık kayıtlarını oku");
      const hrefs = await scene.locator("a[data-home-door-link]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
      expect(hrefs).toEqual(LINKS.map((c) => c.href));
      expect(hrefs.join(" ")).not.toMatch(/studio|data-room|dataroom|signup|sign-up|mailto/i);
      // No two links share a name.
      const names = (await scene.locator("a").allTextContents()).map((n) => n.trim());
      expect(new Set(names).size).toBe(names.length);
    });

    test("live targets answer 200 and a click opens them; lab and #yollar are href-only", async ({ page }) => {
      for (const link of LINKS.filter((l) => l.live)) {
        const res = await page.request.get(link.href);
        expect(res.status(), link.href).toBe(200);
        expect((await res.text()).length, link.href).toBeGreaterThan(2000);
      }
      for (const link of LINKS.filter((l) => l.live)) {
        await page.goto("/");
        await ready(page);
        const a = page.locator(`#scene-7-start a[data-home-door-link="${link.key}"]`);
        await a.scrollIntoViewIfNeeded();
        await Promise.all([
          page.waitForURL(new RegExp(`${link.href}$`), { waitUntil: "commit", timeout: 60_000 }),
          a.click({ noWaitAfter: true }),
        ]);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(link.h1.tr);
      }
    });

    test("no number and no claim or offer wording", async ({ page }) => {
      await page.goto("/");
      const text = await bodyText(page);
      expect(text).not.toMatch(/\d/);
      expect(text.toLocaleLowerCase("tr-TR")).not.toMatch(FORBIDDEN);
    });

    test("footer is untouched: legal, company and contact links are still there; scene 7 adds none", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("#scene-7-start footer")).toHaveCount(0);
      await expect(page.locator("#scene-7-start nav")).toHaveCount(0);
      const footer = page.locator('[data-site-footer="true"]');
      await expect(footer).toHaveCount(1);
      for (const href of ["/privacy", "/terms", "/support", "/consulting", "/contact", "/notes", "/operating-system", "/projects"]) {
        await expect(footer.locator(`a[href='${href}']`).first()).toBeAttached();
      }
      await expect(footer.locator("a[href^='mailto:support@yulalab.com']")).toHaveCount(1);
      expect(await footer.locator("a").count()).toBeGreaterThanOrEqual(12);
    });
  });
}

test.describe("scene 7 keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("Tab walks the five door links in reading order with a visible focus ring", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    const links = page.locator("#scene-7-start a[data-home-door-link]");
    await links.first().scrollIntoViewIfNeeded();
    await links.first().focus();
    for (let i = 0; i < 5; i++) {
      await expect(links.nth(i)).toBeFocused();
      if (i === 0) {
        const outline = await links.nth(0).evaluate((e) => {
          const c = getComputedStyle(e);
          return `${c.outlineStyle}|${c.outlineWidth}`;
        });
        expect(outline).toBe("solid|2px");
        // The ring uses the --yula-focus token.
        const { ring, token } = await links.nth(0).evaluate((e) => {
          const probe = document.createElement("span");
          probe.style.color = "var(--yula-focus)";
          document.body.appendChild(probe);
          const token = getComputedStyle(probe).color;
          probe.remove();
          return { ring: getComputedStyle(e).outlineColor, token };
        });
        expect(ring).toBe(token);
        const box = await links.nth(0).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      if (i < 4) await page.keyboard.press("Tab");
    }
    await Promise.all([
      page.waitForURL(/\/transparency$/, { waitUntil: "commit", timeout: 60_000 }),
      links.nth(4).press("Enter", { noWaitAfter: true }),
    ]);
  });
});

test.describe("scene 7 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow, targets at least 44 px", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-7-start").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const heights = await page
      .locator("#scene-7-start a[data-home-door-link]")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("scene 7 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, five links, honest wording", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator("#scene-7-start");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.getByRole("heading", { level: 3, name: "What brings you here?" })).toHaveCount(1);
    await expect(scene.locator("[data-home-door]")).toHaveCount(4);
    const link = (key: string) => scene.locator(`a[data-home-door-link="${key}"]`);
    await expect(link("products")).toHaveText("Browse the products");
    await expect(link("consulting")).toHaveText("See AI consulting");
    await expect(link("contact")).toHaveText("See ways to get in touch");
    await expect(link("lab")).toHaveText("Visit the lab");
    await expect(link("transparency")).toHaveText("Read the transparency records");
    const hrefs = await scene.locator("a[data-home-door-link]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(LINKS.map((c) => `/en${c.href}`));
    for (const l of LINKS.filter((x) => x.live)) {
      const res = await page.request.get(`/en${l.href}`);
      expect(res.status(), l.href).toBe(200);
    }
    const text = await bodyText(page);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(FORBIDDEN);
  });
});

test.describe("scene 7 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy with lang en, no Arabic letters, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("[data-home-scenes]")).toHaveAttribute("lang", "en");
    await expect(page.locator("[data-home-scenes]")).toHaveAttribute("dir", "ltr");
    const scene = page.locator("#scene-7-start");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-home-door]")).toHaveCount(4);
    expect(await bodyText(page)).not.toMatch(/[؀-ۿ]/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const hrefs = await scene.locator("a[data-home-door-link]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(LINKS.map((c) => `/ar${c.href}`));
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
