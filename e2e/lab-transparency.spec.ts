import { test, expect } from "@playwright/test";

/**
 * WEB-UX-05e: /lab hub, per-product anchors on /transparency, the product
 * page status link that deep-links to them, and the placement of the
 * "capital / outside-client" sentence (only /studio and /transparency).
 */
const SLUGS = ["braavolabs", "burunfarki", "lifeos", "gravita", "lissom", "jablab", "ostinato", "choreia"];
const SENTENCE = /Sermaye ya da yatırım sağlamıyoruz|We do not provide capital or investment/;

for (const [locale, prefix] of [["tr", ""], ["en", "/en"]] as const) {
  test(`/lab renders with written empty state and no console errors (${locale})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${prefix}/lab`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("lab-cases-empty")).toBeVisible();
    await expect(page.getByTestId("lab-notes-meta")).toContainText(/\d{4}-\d{2}-\d{2}/);
    await expect(page.locator("main, body").first()).not.toContainText(SENTENCE);
    expect(errors).toEqual([]);
  });

  test(`/transparency has unique per-product anchors, summary and ADRs (${locale})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${prefix}/transparency`);
    for (const slug of SLUGS) await expect(page.locator(`[id="${slug}"]`)).toHaveCount(1);
    await expect(page.getByTestId("status-summary")).toBeVisible();
    await expect(page.getByTestId("adr-summaries")).toBeVisible();
    await expect(page.getByTestId("transparency-nopromise")).toContainText(SENTENCE);
    expect(errors).toEqual([]);
  });

  test(`product status link lands on its transparency anchor (${locale})`, async ({ page }) => {
    await page.goto(`${prefix}/projects/lifeos`);
    const link = page.getByTestId("status-link");
    await expect(link).toHaveAttribute("href", `${prefix}/transparency#lifeos`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/transparency#lifeos$`));
    await expect(page.locator('[id="lifeos"]')).toBeInViewport();
  });
}

test("the capital / outside-client sentence is absent from other pages", async ({ page }) => {
  for (const path of ["/", "/projects", "/case-studies", "/consulting", "/contact", "/manifesto", "/operating-system", "/notes", "/projects/lifeos", "/studio"]) {
    await page.goto(path);
    await expect(page.locator("body"), path).not.toContainText(SENTENCE);
  }
});

test("/lab is in the sitemap for every locale", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("https://yulalab.com/lab");
  expect(xml).toContain("https://yulalab.com/en/lab");
  expect(xml).toContain("https://yulalab.com/zh-Hans/lab");
});
