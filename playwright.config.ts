import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    // Pin the browser's Accept-Language to the site's default locale (TR).
    // Without this, Chromium's host-OS locale leaks in and next-intl's
    // "as-needed" prefix strategy can content-negotiate "/" to English,
    // making unprefixed-route tests flaky depending on the machine/CI
    // runner's locale.
    locale: "tr-TR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Assumes `pnpm build` already ran (see the roadmap's own Run sequence
    // and the "Build" step in ci.yml, both immediately before this) — not
    // rebuilding here avoids paying for the ~400-page SSG build twice per
    // CI run. Run `pnpm build` yourself first for local `pnpm test:e2e`.
    command: "pnpm exec next start -p 4173",
    // Keep the readiness probe on the public default-locale entry point.
    // Do not bind `next start` to 127.0.0.1: Next 15 normalizes loopback
    // rewrites to localhost, which can turn next-intl's internal /tr rewrite
    // into a local-only redirect loop (vercel/next.js#94745).
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
