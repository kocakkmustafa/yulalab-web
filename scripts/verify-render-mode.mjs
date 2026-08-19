#!/usr/bin/env node
/**
 * Post-build assertion: product pages must not be frozen prerenders.
 *
 * The unit guard reads the source, which is what Next parses — but it runs
 * before `pnpm build` in CI, so the build output itself is never checked
 * there. This script runs after the build and observes the real artifact.
 *
 * Why it matters: with `initialRevalidateSeconds: false`, claim-freshness is
 * evaluated once at build, so an expired claim stays published under
 * "Verified claims" until someone happens to deploy. Expiry was deliberately
 * removed from the build gate on the assumption that runtime would catch it,
 * so when that assumption broke, nothing caught it at all.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MANIFEST = path.resolve(process.cwd(), ".next/prerender-manifest.json");
const MAX_SECONDS = 3600;

if (!existsSync(MANIFEST)) {
  console.error("verify-render-mode: no .next/prerender-manifest.json — run `pnpm build` first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const routes = Object.entries(manifest.routes ?? {});
const productRoutes = routes.filter(([route]) => /^\/(tr|en)\/projects\/[a-z0-9-]+$/.test(route));

if (productRoutes.length === 0) {
  console.error(
    "verify-render-mode: found no product detail routes in the manifest. " +
      "Either the route pattern changed or nothing was prerendered — both need a look, " +
      "so this fails rather than passing vacuously.",
  );
  process.exit(1);
}

const bad = productRoutes.filter(([, cfg]) => {
  const seconds = cfg.initialRevalidateSeconds;
  return seconds === false || typeof seconds !== "number" || seconds <= 0 || seconds > MAX_SECONDS;
});

if (bad.length > 0) {
  console.error("verify-render-mode: product pages render claim freshness but are not revalidating.");
  for (const [route, cfg] of bad) {
    console.error(`  ✗ ${route} → initialRevalidateSeconds = ${JSON.stringify(cfg.initialRevalidateSeconds)}`);
  }
  process.exit(1);
}

console.log(
  `verify-render-mode: OK — ${productRoutes.length} product routes revalidate ` +
    `(${productRoutes[0][1].initialRevalidateSeconds}s).`,
);
