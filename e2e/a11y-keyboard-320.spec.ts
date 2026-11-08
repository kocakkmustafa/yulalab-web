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
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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
  outlineContrast: number | null;
  shadowContrast: number | null;
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
    const ratio = (c: { r: number; g: number; b: number }) => {
      const l1 = lum(c);
      const l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const outlineVisible = style.outlineStyle !== "none" && (parseFloat(style.outlineWidth) || 0) > 0;
    const oc = parse(style.outlineColor) ?? parse(style.color) ?? { r: 255, g: 255, b: 255, a: 1 };
    const sc = style.boxShadow !== "none" ? parse(style.boxShadow) : null;
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
      outlineContrast: outlineVisible ? ratio(oc) : null,
      shadowContrast: sc ? ratio(sc) : null,
    } as FocusSample;
  });
}

function expectFocusIndicator(s: FocusSample) {
  const hasOutline = s.outlineStyle !== "none" && s.outlineWidth > 0;
  const hasShadow = s.boxShadow !== "none";
  expect(hasOutline || hasShadow, `no focus indicator on ${s.label} (${s.region})`).toBe(true);
  // Every indicator that is present must clear WCAG 1.4.11 (3:1) against the background.
  if (hasOutline) expect(s.outlineContrast ?? 0, `outline contrast on ${s.label}`).toBeGreaterThanOrEqual(3);
  if (hasShadow && s.shadowContrast !== null) {
    expect(s.shadowContrast, `box-shadow contrast on ${s.label}`).toBeGreaterThanOrEqual(3);
  }
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
      expectFocusIndicator(s);
    }
  });

  // Known gap (not a skipped test: the CI gate fails on any skipped test): the site has no
  // skip link (WCAG 2.4.1 Bypass Blocks). Tracked as WEB-P0-02d, which adds the link and its
  // real E2E test; see docs/yula-execution/wireframes.md "Bilinen eksik".

  test("theme control is operable with the keyboard", async ({ page }) => {
    await page.goto("/tr/projects");
    const select = page.locator("header select").filter({ has: page.locator("option[value='dark']") }).first();
    await select.focus();
    await expect(select).toBeFocused();
    // Real keyboard behaviour: focus stays on the select and typeahead changes the value.
    const before = await select.inputValue();
    // Native select typeahead: typing the first letter of the "dark" option selects it.
    const darkLabel = (await select.locator("option[value='dark']").textContent()) ?? "";
    await page.keyboard.type(darkLabel.trim().charAt(0));
    await expect(select).toBeFocused();
    await expect.poll(() => select.inputValue()).toBe("dark");
    expect(before).not.toBe("dark");
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
    expectFocusIndicator(ring);
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

async function loopingAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        const t = a.effect?.getComputedTiming();
        return a.playState === "running" && (t?.iterations === Infinity || (t?.iterations ?? 1) > 1);
      })
      .map((a) => (a as CSSAnimation).animationName ?? a.id ?? "unnamed"),
  );
}

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: "reduce" } });

  for (const route of ["/tr", "/tr/projects", "/tr/projects/lifeos", "/ar"]) {
    test(`no looping animation, marquee or auto-scroll on ${route}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(route);
      await page.waitForLoadState("load");
      await page.waitForLoadState("networkidle");
      // Late-mounting content gets two settled frames before the sample.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const running = await loopingAnimations(page);
      expect(running, `looping animations: ${running.join(",")}`).toEqual([]);
      expect(await page.locator("marquee").count()).toBe(0);
      // Real scroll, then the position must hold: nothing may keep scrolling by itself.
      await page.evaluate(() => window.scrollTo(0, 300));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      const settled = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
      expect(await page.evaluate(() => window.scrollY), "page must not auto-scroll").toBe(settled);
      expect(await loopingAnimations(page)).toEqual([]);
    });
  }

  test("positive control: the detector catches an injected infinite animation", async ({ page }) => {
    await page.goto("/tr/projects");
    await page.waitForLoadState("load");
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = "@keyframes yula-probe{to{transform:translateX(1px)}}#yula-probe{animation:yula-probe 1s linear infinite}";
      document.head.append(style);
      const el = document.createElement("div");
      el.id = "yula-probe";
      document.body.append(el);
    });
    expect(await loopingAnimations(page)).toContain("yula-probe");
  });

  test("the 3D scene is replaced by the static experience on the home page", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.locator('[data-experience-static="true"]')).toBeAttached();
    expect(await page.locator("canvas").count()).toBe(0);
  });
});

test.describe("reduced motion off (control)", () => {
  test.use({ viewport: { width: 390, height: 844 }, contextOptions: { reducedMotion: "no-preference" } });

  test("a product page does carry looping animation, so the detector is meaningful", async ({ page }) => {
    await page.goto("/tr/projects/lifeos");
    await page.waitForLoadState("networkidle");
    expect((await loopingAnimations(page)).length).toBeGreaterThan(0);
  });
});
