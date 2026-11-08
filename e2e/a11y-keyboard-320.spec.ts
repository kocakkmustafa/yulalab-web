import { expect, test, type Page } from "@playwright/test";

/**
 * WEB-P0-02c: small-screen, keyboard and reduced-motion contract for the
 * header, footer, theme control and product cards. Axe coverage of the
 * routes lives in accessibility.spec.ts (home, /projects, /ar).
 */

test.use({ locale: "tr-TR", extraHTTPHeaders: { "Accept-Language": "tr" } });

const ROUTES_320 = ["/tr", "/tr/projects", "/ar", "/tr/consulting"] as const;

for (const route of ROUTES_320) {
  test(`320px: no horizontal overflow on ${route}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(route);
    await page.waitForLoadState("load");
    const { inner, scroll } = await page.evaluate(() => ({
      inner: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(scroll, `${route} scrolls sideways at 320px`).toBeLessThanOrEqual(inner);
  });
}

type FocusSample = {
  region: "header" | "main" | "footer" | "other";
  label: string;
  outlineWidth: number;
  outlineStyle: string;
  boxShadow: string;
  outlineContrast: number;
};

async function sampleFocus(page: Page): Promise<FocusSample> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    const parse = (value: string) => {
      const m = /rgba?\(([^)]+)\)/.exec(value);
      if (!m) return null;
      const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
      return { r: +r, g: +g, b: +b, a: +a };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bg = { r: 0, g: 0, b: 0 };
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.9) {
        bg = c;
        break;
      }
    }
    const oc = parse(style.outlineColor) ?? parse(style.color) ?? { r: 255, g: 255, b: 255, a: 1 };
    const l1 = lum(oc);
    const l2 = lum(bg);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const region = el.closest("header")
      ? "header"
      : el.closest("footer")
        ? "footer"
        : el.closest("main")
          ? "main"
          : "other";
    return {
      region,
      label: `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`,
      outlineWidth: parseFloat(style.outlineWidth) || 0,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      outlineContrast: contrast,
    } as FocusSample;
  });
}

test.describe("keyboard order and focus visibility (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Tab walks header, then main content, then footer, with a visible focus ring", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/tr/projects");
    await page.waitForLoadState("load");
    const samples: FocusSample[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      samples.push(await sampleFocus(page));
      if (samples.at(-1)?.region === "footer" && samples.filter((s) => s.region === "footer").length >= 3) break;
    }
    const regions = samples.map((s) => s.region).filter((r, i, all) => r !== all[i - 1]);
    // First stop is a skip link (outside header) or the header itself; either
    // way header precedes main precedes footer and nothing returns to header.
    const headerAt = regions.indexOf("header");
    const mainAt = regions.indexOf("main");
    const footerAt = regions.indexOf("footer");
    expect(headerAt, JSON.stringify(regions)).toBeGreaterThanOrEqual(0);
    expect(mainAt).toBeGreaterThan(headerAt);
    expect(footerAt).toBeGreaterThan(mainAt);
    expect(regions.lastIndexOf("header")).toBe(headerAt);
    for (const s of samples) {
      const hasRing = (s.outlineStyle !== "none" && s.outlineWidth > 0) || s.boxShadow !== "none";
      expect(hasRing, `no focus indicator on ${s.label} (${s.region})`).toBe(true);
      if (s.outlineStyle !== "none" && s.outlineWidth > 0) {
        expect(s.outlineContrast, `focus ring contrast on ${s.label}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test("skip link, when present, moves focus into main", async ({ page }) => {
    await page.goto("/tr/projects");
    await page.keyboard.press("Tab");
    const first = page.locator(":focus");
    const href = await first.getAttribute("href");
    test.skip(!href?.startsWith("#"), "no skip link in the current header (known gap, see wireframes.md)");
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => document.activeElement?.closest("main") !== null)).toBe(true);
  });

  test("theme control is operable with the keyboard", async ({ page }) => {
    await page.goto("/tr/projects");
    const select = page.locator("header select").filter({ has: page.locator("option[value='dark']") }).first();
    await select.focus();
    await expect(select).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const value = await select.inputValue();
    expect(["system", "light", "dark"]).toContain(value);
    await select.selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await select.selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("product cards open with Enter from the keyboard", async ({ page }) => {
    await page.goto("/tr/projects");
    const card = page.locator("main a[href*='/projects/']").first();
    await card.focus();
    await expect(card).toBeFocused();
    const href = await card.getAttribute("href");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${href?.replace(/\//g, "\\/")}$`));
  });
});

test.describe("mobile menu (320)", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("opens and closes by keyboard and shows a visible focus ring", async ({ page }) => {
    await page.goto("/tr/projects");
    const menu = page.locator("header button[aria-controls='site-mobile-navigation']");
    await menu.focus();
    const ring = await sampleFocus(page);
    expect((ring.outlineStyle !== "none" && ring.outlineWidth > 0) || ring.boxShadow !== "none").toBe(true);
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.getByRole("button").first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: "reduce" } });

  for (const route of ["/tr", "/tr/projects", "/ar"]) {
    test(`no looping animation, marquee or auto-scroll on ${route}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(route);
      await page.waitForLoadState("load");
      await page.waitForTimeout(1200);
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => {
            const t = a.effect?.getComputedTiming();
            return a.playState === "running" && (t?.iterations === Infinity || (t?.iterations ?? 1) > 1);
          })
          .map((a) => (a as CSSAnimation).animationName ?? a.id ?? "unnamed"),
      );
      expect(running, `looping animations: ${running.join(",")}`).toEqual([]);
      const y1 = await page.evaluate(() => window.scrollY);
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => window.scrollY), "page must not auto-scroll").toBe(y1);
      expect(await page.locator("marquee").count()).toBe(0);
    });
  }

  test("the 3D scene is replaced by the static experience on the home page", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
    expect(await page.locator("canvas").count()).toBe(0);
  });
});
