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

const SLUGS = ["site-motion", "terms-of-service", "lifeos-live"] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Text of the lab block without real dates and source file paths (the only digits it may carry). */
async function labTextWithoutDatesAndPaths(page: Page) {
  return page.locator("#scene-5-lab [data-scene5-lab]").evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("time, [data-scene5-source] code").forEach((n) => n.remove());
    return clone.innerText.replace(/\b3D\b/g, "");
  });
}

const FORBIDDEN =
  /doğrulandı|doğrulan|verified|validated|confirmed|measured|onaylandı|onaylan|ölçüldü|asla|never|always/i;
const MEASUREMENT = /\d+\s*(%|ms|kb|sn|saniye|seconds?|users?|kullanıcı)|\d+[.,]\d+/i;

for (const view of VIEWS) {
  test.describe(`scene 5 lab (${view.name})`, () => {
    test.use({ viewport: view.viewport, locale: "tr-TR" });

    test("one design record and three real notes, each with the five-field template", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-5-lab");
      await scene.scrollIntoViewIfNeeded();
      await expect(scene.getByRole("list", { name: /Laboratuvar kayıtları/ })).toBeVisible();
      const entries = scene.locator("[data-scene5-entry]");
      await expect(entries).toHaveCount(4);
      await expect(scene.locator('[data-scene5-kind="note"]')).toHaveCount(3);
      await expect(scene.locator('[data-scene5-kind="decision"]')).toHaveCount(1);
      for (let i = 0; i < 4; i++) {
        await expect(entries.nth(i).locator("[data-scene5-field]")).toHaveCount(5);
      }
      const labels = await entries.first().locator("dt").evaluateAll((els) => els.map((e) => e.textContent ?? ""));
      expect(labels.map((l) => l.toLocaleLowerCase("tr-TR"))).toEqual(["soru", "hipotez", "ne yaptık", "ne öğrendik", "sonraki test"]);
      // Notes carry a body only: four fields stay honestly empty. The decision leaves only the hypothesis empty.
      for (const slug of SLUGS) {
        const entry = scene.locator(`[data-scene5-entry="${slug}"]`);
        await expect(entry.locator('[data-scene5-empty="true"]')).toHaveCount(4);
        await expect(entry.locator('[data-scene5-empty="true"]').first()).toHaveText("henüz yazılmadı");
        await expect(entry.locator('[data-scene5-field="did"]')).not.toHaveAttribute("data-scene5-empty", "true");
      }
      const decision = scene.locator('[data-scene5-entry="adr-003"]');
      await expect(decision.locator('[data-scene5-empty="true"]')).toHaveCount(1);
      await expect(decision.locator('[data-scene5-field="hypothesis"] dd')).toHaveText("henüz yazılmadı");
      await expect(decision).toContainText("Tasarım kararı (öneri)");
      await expect(decision.locator('[data-scene5-status="proposal"]')).toContainText("öneri, onay bekliyor; uygulanmadı");
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test("titles, dates and bodies come from notes.ts; every row shows its source", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-5-lab");
      const motion = scene.locator('[data-scene5-entry="site-motion"]');
      await expect(motion).toContainText("Vitrine biraz can kattık");
      await expect(motion).toContainText("Sayfa geçişleri artık bir sahne değişimi gibi hissediyor");
      await expect(motion.locator("time")).toHaveAttribute("datetime", "2026-07-10");
      await expect(scene.locator('[data-scene5-entry="terms-of-service"]')).toContainText("Kullanım Şartları sayfası eklendi");
      await expect(scene.locator('[data-scene5-entry="lifeos-live"]')).toContainText("LifeOS artık App Store'da");
      for (const slug of SLUGS) {
        const src = scene.locator(`[data-scene5-entry="${slug}"] [data-scene5-source]`);
        await expect(src).toHaveAttribute("data-scene5-source", `src/data/notes.ts#${slug}`);
        await expect(src).toContainText("Kaynak: src/data/notes.ts");
        await expect(src).toContainText(`not: ${slug}`);
      }
      const decision = scene.locator('[data-scene5-entry="adr-003"]');
      await expect(decision.locator("time")).toHaveAttribute("datetime", "2026-11-08");
      await expect(decision.locator("[data-scene5-source]")).toContainText("docs/yula-execution/adr-003-3d-default.md");
      await expect(decision.locator("a")).toHaveCount(0);
    });

    test("no invented number or measurement, no 'verified' wording", async ({ page }) => {
      await page.goto("/");
      const text = await labTextWithoutDatesAndPaths(page);
      expect(text).not.toMatch(/\d/);
      expect(text).not.toMatch(MEASUREMENT);
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).toContain("henüz yazılmadı");
    });

    test("every link has its own name, resolves with HTTP 200 and shows the note", async ({ page }) => {
      await page.goto("/");
      const scene = page.locator("#scene-5-lab");
      const links = scene.locator("a");
      await expect(links).toHaveCount(4);
      const names = (await links.allInnerTexts()).map((s) => s.trim());
      expect(new Set(names).size).toBe(names.length);
      for (const slug of SLUGS) {
        const link = scene.locator(`[data-scene5-note-link="${slug}"]`);
        const href = (await link.getAttribute("href")) ?? "";
        expect(href).toBe(`/notes#${slug}`);
        const res = await page.request.get(href.split("#")[0]);
        expect(res.status(), href).toBe(200);
        const html = await res.text();
        expect(html).toContain(`id="${slug}"`);
        expect(html).toContain((await link.innerText()).trim().replace(/'/g, "&#x27;"));
      }
      const all = scene.locator("[data-scene5-all-notes]");
      expect(await all.getAttribute("href")).toBe("/notes");
      expect((await page.request.get("/notes")).status()).toBe(200);
    });

    test("the note link lands on its card on /notes", async ({ page }) => {
      await page.goto("/");
      await page.locator('#scene-5-lab [data-scene5-note-link="lifeos-live"]').click();
      await expect(page).toHaveURL(/\/notes#lifeos-live$/);
      await expect(page.locator("article#lifeos-live")).toContainText("LifeOS artık App Store'da");
    });
  });
}

test.describe("scene 5 at 320 px", () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: "tr-TR" });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.locator("#scene-5-lab").scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 5 in English", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

  test("English copy, template labels, English note text and links", async ({ page }) => {
    await page.goto("/en");
    const scene = page.locator("#scene-5-lab");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.getByRole("list", { name: /Lab records/ })).toBeVisible();
    await expect(scene.locator("[data-scene5-entry]")).toHaveCount(4);
    const labels = await scene.locator('[data-scene5-entry="site-motion"] dt').evaluateAll((els) => els.map((e) => e.textContent ?? ""));
    expect(labels.map((l) => l.toLocaleLowerCase("tr-TR"))).toEqual(["question", "hypothesis", "what we did", "what we learned", "next test"]);
    await expect(scene.locator('[data-scene5-entry="site-motion"]')).toContainText("Gave the showcase some life");
    await expect(scene.locator('[data-scene5-entry="site-motion"] [data-scene5-empty="true"]').first()).toHaveText("not written yet");
    await expect(scene.locator('[data-scene5-entry="adr-003"] [data-scene5-source]')).toContainText("written in Turkish");
    await expect(scene.locator('[data-scene5-entry="adr-003"]')).toContainText("Design decision (proposal)");
    const text = await labTextWithoutDatesAndPaths(page);
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(MEASUREMENT);
    expect(text).not.toMatch(FORBIDDEN);
    const href = (await scene.locator('[data-scene5-note-link="site-motion"]').getAttribute("href")) ?? "";
    expect(href).toBe("/en/notes#site-motion");
    expect((await page.request.get(href.split("#")[0])).status()).toBe(200);
  });
});

test.describe("scene 5 in /ar (RTL page, English fallback block)", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "ar" });

  test("keeps ltr English copy, no Arabic letters in the block, no overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const scene = page.locator("#scene-5-lab");
    await scene.scrollIntoViewIfNeeded();
    await expect(scene.locator("[data-scene5-entry]")).toHaveCount(4);
    await expect(scene.locator('[data-scene5-entry="site-motion"]')).toContainText("Gave the showcase some life");
    await expect(scene.locator('[data-scene5-entry="site-motion"] dt').first()).toHaveText(/question/i);
    const block = await page.locator("[data-home-scenes]").evaluate((el) => (el as HTMLElement).innerText);
    expect(block).not.toMatch(/[؀-ۿ]/);
    const href = (await scene.locator('[data-scene5-note-link="site-motion"]').getAttribute("href")) ?? "";
    expect(href).toBe("/ar/notes#site-motion");
    expect((await page.request.get(href.split("#")[0])).status()).toBe(200);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("scene 5 accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });

  for (const scheme of ["dark", "light"] as const) {
    test(`axe finds no serious or critical issue in scene 5 (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await page.locator("#scene-5-lab").scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include("#scene-5-lab")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
