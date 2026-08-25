import { expect, test } from "@playwright/test";

const TOKEN = "a".repeat(64);

for (const locale of ["tr", "en"] as const) {
  test(`${locale} verification keeps the fragment local until explicit action`, async ({ page }) => {
    const route = locale === "tr" ? "/data-request/verify" : "/en/data-request/verify";
    const button = locale === "tr" ? /talebi doğrula/i : /verify request/i;
    let posts = 0;
    let postedBody: unknown;
    await page.route("**/api/data-request", async (requestRoute) => {
      posts += 1;
      postedBody = requestRoute.request().postDataJSON();
      await requestRoute.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ verified: true }),
      });
    });

    await page.goto(`${route}#token=${TOKEN}`);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    expect(posts).toBe(0);
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByRole("status")).toBeVisible();
    expect(posts).toBe(1);
    expect(postedBody).toEqual({ token: TOKEN });
  });
}

test("malformed fragment is inert, keyboard-safe, and does not overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  let posts = 0;
  await page.route("**/api/data-request", async (requestRoute) => {
    posts += 1;
    await requestRoute.abort();
  });
  await page.goto("/data-request/verify#token=not-a-capability");
  await expect(page).toHaveURL(/\/data-request\/verify$/);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /doğrula/i })).toHaveCount(0);
  expect(posts).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
