import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    return ["localhost", "127.0.0.1"].includes(host) ? route.continue() : route.abort();
  });
  // Withhold WebGL so the result does not depend on the 3D scene (CI has only
  // software WebGL); same pattern as the "no WebGL" test in home-doors.spec.ts.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      if (/^(experimental-)?webgl2?$/.test(id)) return null;
      return (original as (...a: unknown[]) => unknown).call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
});

// WEB-UX-05g, QA PERF-01. Budget source: 04-design §6 G1 / QA PERF-01 "<= 2
// simultaneous blurs" ([Ö] = proposed there, and the only numeric budget in the
// design). Counted: elements that are rendered, intersect the first viewport,
// and carry a computed `backdrop-filter` other than none.
export const MAX_SIMULTANEOUS_BLURS = 2;

const ROUTES = ["/", "/projects", "/projects/lifeos", "/consulting", "/contact", "/start", "/privacy"];

async function countBlurs(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const cs = getComputedStyle(el);
      const filter = cs.getPropertyValue("backdrop-filter") || cs.getPropertyValue("-webkit-backdrop-filter");
      if (!filter || filter === "none") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) continue;
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ${filter}`);
    }
    return out;
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`glass budget at ${viewport.width}px`, () => {
    test.use({ viewport });
    for (const route of ROUTES) {
      test(`${route}: simultaneous backdrop-filter elements <= ${MAX_SIMULTANEOUS_BLURS}`, async ({ page }) => {
        test.setTimeout(60_000); // the scroll sweep of "/" sat at ~29 of 30 s on main
        await page.goto(route);
        await page.waitForLoadState("load");
        await page.waitForTimeout(1500); // settle page-enter / route veil
        // Worst case over the scroll positions a visitor can reach.
        let found = await countBlurs(page);
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = viewport.height / 2; y < total; y += viewport.height / 2) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.waitForTimeout(80);
          const here = await countBlurs(page);
          if (here.length > found.length) found = here;
        }
        console.log(`GLASS ${viewport.width} ${route}: ${found.length} ${JSON.stringify(found)}`);
        expect(found.length, found.join("\n")).toBeLessThanOrEqual(MAX_SIMULTANEOUS_BLURS);
      });
    }
  });
}
