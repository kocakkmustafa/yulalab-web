import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { scrollProgressForTimeline } from "../src/components/experience/storyboard";

test.use({ hasTouch: true });

const ROOT = '[data-yula-experience="true"]';

// CI uses software WebGL, which the product deliberately routes to its static
// fallback. Native-journey tests control only the renderer label so they
// exercise the real native document in CI. This does not establish hardware
// or performance acceptance.
async function labelRendererForNativeJourney(page: Page) {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
      return parameter === 37446
        ? "local anchor geometry test renderer"
        : original.call(this, parameter);
    };
  });
}
const PRODUCTS = ["braavolabs", "burunfarki", "lifeos", "gravita", "lissom", "jablab", "ostinato", "choreia"];

test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
});

async function openJourney(page: Page, path: string) {
  await labelRendererForNativeJourney(page);
  await page.goto(path);
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute("data-loader-visible", "false", { timeout: 30_000 });
  test.skip(await root.getAttribute("data-experience-fallback") === "true", "Native journey requires hardware WebGL.");
  await expect(root).toHaveAttribute("data-experience-ready", "true");
  return root;
}

async function scrollTimeline(page: Page, progress: number) {
  await page.evaluate(value => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * value, behavior: "instant" }), scrollProgressForTimeline(progress));
}

for (const locale of ["tr", "en"] as const) {
  test(`linear view retains the current content and keyboard focus (${locale})`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 667 });
    for (const [progress, target] of [
      [0, "experience-hero"], [0.26875, "experience-product-gravita"],
      [0.72, "experience-manifesto"], [0.8, "experience-vision"],
      [0.9, "experience-values"], [0.98, "experience-closing"],
    ] as const) {
      const root = await openJourney(page, locale === "en" ? "/en" : "/");
      await scrollTimeline(page, progress);
      if (progress === 0.26875) await expect(root).toHaveAttribute("data-active-product", "gravita");
      else await expect(root).toHaveAttribute("data-stage", target.replace("experience-", "").replace("manifesto", "mission"));
      await page.getByRole("button", { name: /^2D/ }).focus();
      await page.keyboard.press("Enter");
      const content = page.locator(`[data-experience-static] #${target}`);
      await expect(content).toBeFocused();
      const top = await content.evaluate(node => node.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(await page.locator("[data-experience-static] > header").evaluate(node => node.getBoundingClientRect().bottom) - 1);
      expect(top).toBeLessThan(target === "experience-closing" ? 667 / 2 : 200);
      if (target === "experience-product-gravita" || target === "experience-manifesto") await testInfo.attach(target, {body:await page.screenshot(),contentType:"image/png"});
      await page.waitForTimeout(250);
      await expect(content).toBeFocused();
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
    }
  });

  test(`enlarged journey menu remains reachable on a short touch screen (${locale})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 568, height: 320 });
    await page.goto(locale === "en" ? "/en" : "/");
    await expect(page.locator(ROOT)).toHaveAttribute("data-loader-visible", "false");
    const summary = page.locator('[data-experience-static] header summary');
    await summary.tap();
    const nav = page.locator('[data-experience-static] header details nav');
    await nav.locator("a").evaluateAll(nodes => {
      const measured = nodes.map(node => ({ node: node as HTMLElement, font: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight) }));
      for (const {node, font, line} of measured) { node.style.fontSize = `${font * 2}px`; if (Number.isFinite(line)) node.style.lineHeight = `${line * 2}px`; }
    });
    expect(await nav.evaluate(node => getComputedStyle(node).overflowY)).toBe("auto");
    const last = nav.locator('a[href="#experience-proof"]');
    await last.focus();
    await expect(last).toBeInViewport({ ratio: 1 });
    expect(await last.evaluate(node => { const r = node.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("a") === node; })).toBe(true);
    await testInfo.attach("short-menu", { body: await page.screenshot(), contentType: "image/png" });
    expect((await new AxeBuilder({ page }).include('[data-experience-static] header').analyze()).violations).toEqual([]);
    await last.tap();
    await expect(page).toHaveURL(/#experience-proof$/);
    await expect(page.locator('[data-experience-static] header details')).not.toHaveAttribute("open", "");
    await expect(page.locator("#experience-proof")).toBeFocused();
  });
}

for (const viewport of [{ width: 390, height: 667 }, { width: 1440, height: 900 }]) {
  test.describe(`English complete product journey ${viewport.width}x${viewport.height}`, () => {
    test.use({ hasTouch: true, viewport });
    test("keeps every introduction, image and local route reachable", async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const root = await openJourney(page, "/en");
      const origin = await page.evaluate(() => performance.timeOrigin);
      const evidence = [];
      for (const [index, slug] of PRODUCTS.entries()) {
        await scrollTimeline(page, 0.085 + ((index + 0.5) / 8) * (0.505 - 0.085));
        await expect(root).toHaveAttribute("data-active-product", slug);
        const panel = page.locator(`article[data-product="${slug}"][data-active="true"]`);
        await expect(panel).toBeVisible();
        const action = panel.locator('a');
        await expect(action).toHaveAttribute("href", `/en/projects/${slug}`);
        const preview = panel.getByRole("button", { name: "Enlarge screen" });
        if (await preview.count()) {
          await preview.tap();
          const reader = page.getByRole("dialog", { name: /Development view/ });
          const image = reader.locator("img");
          await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
          const region = reader.getByRole("region", { name: "Complete development screen" });
          await region.focus();
          await page.keyboard.press("End");
          await expect.poll(() => region.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
          await reader.getByRole("button", { name: "Close image" }).tap();
          await expect(reader).not.toBeVisible();
          await expect(preview).toBeFocused();
        }
        await testInfo.attach(`product-${slug}`, { body: await page.screenshot(), contentType: "image/png" });
        const before = await page.evaluate(() => scrollY);
        await action.tap();
        await expect(page).toHaveURL(new RegExp(`/en/projects/${slug}$`));
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expect(page.locator("main h1")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        evidence.push({slug, title:await page.locator("main h1").innerText(), before});
        await page.goBack();
        await expect(root).toHaveAttribute("data-active-product", slug);
        await expect.poll(() => page.evaluate(value => Math.abs(scrollY - value), before)).toBeLessThan(3);
        expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
      }
      expect(errors).toEqual([]);
      await testInfo.attach("English product flow", { body: JSON.stringify({viewport,evidence,errors}), contentType:"application/json" });
    });
  });
}

test("English touch scrolling survives the image reader and compact layouts", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 667 });
  const root = await openJourney(page, "/en");
  const swipe = async (x: number, from: number, to: number) => {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x,y:from}]});
      for(let step=1;step<=8;step++) {
        await session.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x,y:from+(to-from)*step/8}]});
        await page.waitForTimeout(24);
      }
      await session.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
    } finally { await session.detach(); }
  };
  await swipe(370, 590, 220);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  const documentTouchY = await page.evaluate(() => scrollY);
  await scrollTimeline(page, 0.26875);
  await expect(root).toHaveAttribute("data-active-product", "gravita");
  await page.getByRole("button", {name:"Enlarge screen"}).tap();
  const reader = page.getByRole("dialog", {name:/Development view/});
  const region = reader.getByRole("region", {name:"Complete development screen"});
  await expect.poll(() => reader.locator("img").evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const before = await page.evaluate(() => scrollY);
  const box = await region.boundingBox();
  expect(box).not.toBeNull();
  await swipe(box!.x + box!.width / 2, box!.y + box!.height - 25, box!.y + 35);
  await expect.poll(() => region.evaluate(node => node.scrollTop)).toBeGreaterThan(50);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  const readerTouchY = await region.evaluate(node => node.scrollTop);
  await testInfo.attach("touch-reader", {body:await page.screenshot(),contentType:"image/png"});
  await reader.getByRole("button", {name:"Close image"}).tap();
  const layouts = [];
  for(const viewport of [{width:667,height:375},{width:320,height:568}]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("[data-experience-static]")).toBeVisible();
    expect(await page.locator("[data-experience-static] #experience-portfolio article").count()).toBe(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const summary = page.locator("[data-experience-static] header summary");
    await summary.tap();
    await page.locator('[data-experience-static] details a[href="#experience-manifesto"]').tap();
    await expect(page.locator("[data-experience-static] #experience-manifesto")).toBeFocused();
    layouts.push({viewport,scrollY:await page.evaluate(() => scrollY)});
    await testInfo.attach(`compact-${viewport.width}`,{body:await page.screenshot(),contentType:"image/png"});
  }
  await testInfo.attach("touch-and-layout",{body:JSON.stringify({documentTouchY,readerTouchY,layouts}),contentType:"application/json"});
});

test("English project Back and Forward retain the same journey document", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({width:390,height:667});
  const root = await openJourney(page, "/en");
  const origin = await page.evaluate(() => performance.timeOrigin);
  await scrollTimeline(page, 0.47875);
  await expect(root).toHaveAttribute("data-active-product", "choreia");
  const before = await page.evaluate(() => scrollY);
  await page.locator('article[data-product="choreia"][data-active="true"] a').tap();
  await expect(page).toHaveURL(/\/en\/projects\/choreia$/);
  await page.goBack();
  await expect(root).toHaveAttribute("data-active-product", "choreia");
  await expect.poll(() => page.evaluate(value => Math.abs(scrollY-value), before)).toBeLessThan(3);
  await page.goForward();
  await expect(page).toHaveURL(/\/en\/projects\/choreia$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goBack();
  await expect(root).toHaveAttribute("data-active-product", "choreia");
  await expect.poll(() => page.evaluate(value => Math.abs(scrollY-value), before)).toBeLessThan(3);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  await testInfo.attach("English project history",{body:JSON.stringify({before,after:await page.evaluate(() => scrollY),sameDocument:true}),contentType:"application/json"});
});
