import { expect, test, type Page, type Request } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SUPPORTED_LOCALES, localePath } from "../src/i18n/locales";
import { MOTION_CONSENT_COPY } from "../src/data/motion-consent-copy";
import { E2E_MOTION_CONSENT_ENDPOINT } from "./motion-consent-endpoint";

// Localhost-only: the page is pointed at a fake Supabase project through
// playwright.config.ts and every call to it is fulfilled here. This proves the
// page contract, not the live Motion Core function. Chromium does not apply
// CORS to responses fulfilled by page.route, so the function's
// Access-Control-Allow-Origin requirement is only provable against the live
// function (YUL-10); the header below just mirrors the expected response.
const e2ePort = Number(process.env.YULA_E2E_PORT ?? "4173");
const ORIGIN = `http://127.0.0.1:${e2ePort}`;
const TOKEN = "Q2xhdWRlLW1vdGlvbi1jb25zZW50LWUyZS10b2tlbjAx".slice(0, 43);
const PENDING = { status: "pending", teenEmail: "t***@example.com", expiresAt: "2026-10-30T12:00:00.000Z" };

type Step = { status: number; body: unknown };

async function fakeFunction(page: Page, steps: Step[]) {
  const posts: { body: unknown; request: Request }[] = [];
  const methods: string[] = [];
  await page.route(E2E_MOTION_CONSENT_ENDPOINT, async (route) => {
    methods.push(route.request().method());
    const step = steps.shift();
    if (!step) return route.abort();
    posts.push({ body: route.request().postDataJSON(), request: route.request() });
    await route.fulfill({
      status: step.status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": ORIGIN },
      body: JSON.stringify(step.body),
    });
  });
  return { posts, methods };
}

function watchRequests(page: Page) {
  const seen: Request[] = [];
  page.on("request", (request) => seen.push(request));
  return seen;
}

function expectTokenNeverSent(seen: Request[]) {
  for (const request of seen) {
    expect(request.url(), request.url()).not.toContain(TOKEN);
    expect(request.headers()["referer"] ?? "", request.url()).not.toContain(TOKEN);
  }
}

test("consent HTTP responses own their nonce, connect-src and referrer policy", async ({ request }) => {
  const cases = [
    ...SUPPORTED_LOCALES.map((locale) => ({ path: localePath(locale, "/motion/consent"), locale })),
    { path: "/tr/motion/consent", locale: "tr" },
    { path: "/en/motion/%63onsent", locale: "en" },
    { path: "/%65n/motion/consent", locale: "en" },
    { path: "/EN/motion/consent", locale: "en" },
    { path: "/pt-br/motion/consent", locale: "pt-BR" },
  ];
  for (const { path, locale } of cases) {
    const response = await request.get(path, { maxRedirects: 3 });
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const nonces = [...html.matchAll(/<script nonce="([^"]+)"/g)].map((match) => match[1]);
    expect(nonces, path).toHaveLength(2);
    expect(nonces[0], path).toBe(nonces[1]);
    const csp = response.headers()["content-security-policy"];
    expect(response.headersArray().filter((h) => h.name.toLowerCase() === "content-security-policy"), path).toHaveLength(1);
    expect(csp, path).toContain("default-src 'none'");
    expect(csp, path).toContain(`script-src 'nonce-${nonces[0]}'`);
    expect(csp, path).toContain(`connect-src ${E2E_MOTION_CONSENT_ENDPOINT}`);
    expect(csp, path).not.toMatch(/unsafe-inline|unsafe-eval|vercel/);
    expect(response.headers()["referrer-policy"], path).toBe("no-referrer");
    expect(response.headers()["cache-control"], path).toContain("no-store");
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
    expect(html, path).toContain(`<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">`);
  }
});

test("view then approve keeps the token out of URLs and Referer", async ({ page }) => {
  const seen = watchRequests(page);
  const fake = await fakeFunction(page, [
    { status: 200, body: { ...PENDING, locale: "tr" } },
    { status: 200, body: { status: "approved" } },
  ]);
  await page.goto(`/motion/consent#token=${TOKEN}`);
  await expect(page).toHaveURL(/\/motion\/consent$/);
  const copy = MOTION_CONSENT_COPY.tr;
  await expect(page.locator("#teen")).toHaveText("Onay bekleyen hesap: t***@example.com");
  expect(await new AxeBuilder({ page }).analyze().then((result) => result.violations.map((v) => v.id))).toEqual([]);
  await page.getByRole("button", { name: copy.approve }).click();
  await expect(page.locator("#status")).toHaveText(copy.approved);
  await expect(page.getByRole("button", { name: copy.approve })).toBeHidden();
  expect(fake.methods).toEqual(["POST", "POST"]);
  expect(fake.posts.map((post) => post.body)).toEqual([
    { action: "view", token: TOKEN },
    { action: "decide", token: TOKEN, decision: "approve" },
  ]);
  for (const post of fake.posts) expect(post.request.headers()["content-type"]).toMatch(/^text\/plain/);
  expectTokenNeverSent(seen);
});

test("decline needs an explicit second confirmation and reports deletion", async ({ page }) => {
  const fake = await fakeFunction(page, [
    { status: 200, body: { ...PENDING, locale: "en" } },
    { status: 200, body: { status: "denied" } },
  ]);
  const copy = MOTION_CONSENT_COPY.en;
  await page.goto(`/en/motion/consent#token=${TOKEN}`);
  await page.getByRole("button", { name: copy.deny, exact: true }).click();
  await expect(page.locator("#warning")).toHaveText(copy.denyWarning);
  await expect(page.getByRole("button", { name: copy.denyConfirm })).toBeFocused();
  expect(fake.posts).toHaveLength(1);
  await page.getByRole("button", { name: copy.denyConfirm }).click();
  await expect(page.locator("#status")).toHaveText(copy.denied);
  expect(fake.posts[1].body).toEqual({ action: "decide", token: TOKEN, decision: "deny" });
});

test("the request language chosen in the app wins over the link language", async ({ page }) => {
  await fakeFunction(page, [{ status: 200, body: { ...PENDING, locale: "de" } }]);
  await page.goto(`/motion/consent#token=${TOKEN}`);
  await expect(page.locator("h1")).toHaveText(MOTION_CONSENT_COPY.de.heading);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});

for (const [status, key] of [[404, "invalid"], [410, "expired"], [503, "serverError"]] as const) {
  test(`a ${status} view shows the ${key} state`, async ({ page }) => {
    await fakeFunction(page, [{ status, body: status === 410 ? { status: "expired" } : { error: "x" } }]);
    await page.goto(`/en/motion/consent#token=${TOKEN}`);
    await expect(page.getByRole("alert")).toHaveText(MOTION_CONSENT_COPY.en[key]);
    await expect(page.getByRole("button", { name: MOTION_CONSENT_COPY.en.approve })).toBeHidden();
    await expect(page.getByRole("button", { name: MOTION_CONSENT_COPY.en.retry })).toBeVisible({ visible: status === 503 });
  });
}

test("a malformed fragment never contacts the function", async ({ page }) => {
  const fake = await fakeFunction(page, []);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/en/motion/consent#token=not-a-capability");
  await expect(page.getByRole("alert")).toHaveText(MOTION_CONSENT_COPY.en.invalid);
  expect(fake.methods).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("no-script visitors get an explanation and no inert buttons", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: "tr-TR" });
  const page = await context.newPage();
  try {
    await page.goto(`${ORIGIN}/en/motion/consent#token=${TOKEN}`);
    await expect(page.getByRole("button")).toHaveCount(0);
    expect(await page.locator("noscript").evaluate((element) => element.textContent?.trim())).toBe(MOTION_CONSENT_COPY.en.noScript);
    await expect(page.getByRole("link", { name: MOTION_CONSENT_COPY.en.email })).toHaveAttribute("href", "mailto:support@yulalab.com");
  } finally {
    await context.close();
  }
});
