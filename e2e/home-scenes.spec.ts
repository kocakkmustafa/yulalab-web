import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
});

const IDS = [
  "scene-1-identity",
  "scene-2-difference",
  "scene-3-products",
  "scene-4-engineering",
  "scene-5-lab",
  "scene-6-trust",
  "scene-7-start",
];

const VIEWS = [
  { name: "desktop 1440", viewport: { width: 1440, height: 900 }, path: "/", locale: "tr-TR" },
  { name: "mobile 390", viewport: { width: 390, height: 844 }, path: "/", locale: "tr-TR" },
  { name: "ar 390", viewport: { width: 390, height: 844 }, path: "/ar", locale: "ar" },
] as const;

async function sceneHeadings(page: Page) {
  return page.locator("section[data-home-scene] > h2").allTextContents();
}

for (const view of VIEWS) {
  test.describe(`home scenes (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: view.locale });

    test("seven anchors are visible and reachable by keyboard", async ({ page }) => {
      await page.goto(view.path);
      for (const [index, id] of IDS.entries()) {
        const section = page.locator(`section#${id}`);
        await expect(section).toHaveCount(1);
        await section.scrollIntoViewIfNeeded();
        await expect(section).toBeVisible();
        const heading = page.getByRole("heading", { level: 2, name: (await sceneHeadings(page))[index] });
        await expect(heading).toBeVisible();
        await expect(section).toHaveAttribute("aria-labelledby", `${id}-title`);
      }

      // Tab walks the seven scene links in order.
      const links = page.locator("[data-home-scenes] nav a");
      await expect(links).toHaveCount(7);
      await links.first().focus();
      for (let i = 0; i < 7; i++) {
        await expect(links.nth(i)).toBeFocused();
        if (i < 6) await page.keyboard.press("Tab");
      }
      // Enter on a link moves to its scene.
      await links.nth(2).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#scene-3-products$/);
      await expect
        .poll(() => page.locator("#scene-3-products").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
        .toBeLessThan(view.viewport.height / 2);
    });

    test("direct link /#scene-n lands on its scene", async ({ page }, testInfo) => {
      await page.goto(`${view.path === "/" ? "" : view.path}/#scene-5-lab`);
      // Which path ran depends on the browser: with usable WebGL this is the
      // 3D journey (opening card pins the top, then the hash is honoured);
      // software rendering falls back to the static journey (native anchor).
      // The annotation records it; the 3D branch is otherwise covered by the
      // homeSceneIdFromHash unit test.
      await page.waitForSelector('[data-yula-experience][data-experience-mounted="true"]');
      const path3d = await page.evaluate(() => !document.querySelector('[data-experience-static="true"]'));
      testInfo.annotations.push({ type: "journey-path", description: path3d ? "3D" : "static" });
      await expect
        .poll(() => page.locator("#scene-5-lab").evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
          timeout: 15_000,
        })
        .toBeLessThan(view.viewport.height / 2);
    });

    test("reduced motion renders the same seven headings in the static journey", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(view.path);
      await expect(page.locator('[data-experience-static="true"]')).toHaveCount(1);
      const headings = await sceneHeadings(page);
      expect(headings).toHaveLength(7);
      for (const heading of headings) expect(heading.trim().length).toBeGreaterThan(5);
      for (const id of IDS) await expect(page.locator(`section#${id}`)).toBeAttached();
    });
  });
}

test.describe("honest language fallback", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("/ar scene text is English with its own lang and ltr direction", async ({ page }) => {
    await page.goto("/ar");
    const block = page.locator("[data-home-scenes]");
    await expect(block).toHaveAttribute("lang", "en");
    await expect(block).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#scene-1-identity h2")).toHaveText(/Yula Lab|technology/i);
  });

});

test.describe("tr scene block", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  test("carries no lang override", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-home-scenes]")).not.toHaveAttribute("lang", /.+/);
  });
});

test.describe("malformed hash", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("a broken percent-escape neither throws nor leaves the page unscrollable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#%E0%A4%A");
    await expect(page.locator('[data-yula-experience][data-experience-ready="true"]')).toHaveCount(1, {
      timeout: 45_000,
    });
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(100);
    expect(errors).toEqual([]);
  });
});

test.describe("first load never starts audio", () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });

  test("no AudioContext is created or resumed, and no microphone is requested, without a gesture", async ({ page }) => {
    // `getUserMedia` has no caller in src today; the counter guards against a
    // future one. The automatic-audio guard is the AudioContext pair.
    await page.addInitScript(() => {
      const calls = { getUserMedia: 0, resume: 0, created: 0 };
      (window as unknown as { __audioCalls: typeof calls }).__audioCalls = calls;
      const md = navigator.mediaDevices;
      if (md?.getUserMedia) {
        const original = md.getUserMedia.bind(md);
        md.getUserMedia = (...args) => {
          calls.getUserMedia++;
          return original(...args);
        };
      }
      for (const name of ["AudioContext", "webkitAudioContext"] as const) {
        const w = window as unknown as Record<string, typeof AudioContext | undefined>;
        const Base = w[name];
        if (!Base) continue;
        const original = Base.prototype.resume;
        Base.prototype.resume = function (...args: []) {
          calls.resume++;
          return original.apply(this, args);
        };
        w[name] = class extends Base {
          constructor(...args: ConstructorParameters<typeof AudioContext>) {
            calls.created++;
            super(...args);
          }
        };
      }
    });
    await page.goto("/");
    await expect(page.locator('[data-yula-experience][data-experience-ready="true"]')).toHaveCount(1, {
      timeout: 45_000,
    });
    const calls = await page.evaluate(
      () => (window as unknown as { __audioCalls: Record<string, number> }).__audioCalls,
    );
    expect(calls).toEqual({ getUserMedia: 0, resume: 0, created: 0 });
  });
});
