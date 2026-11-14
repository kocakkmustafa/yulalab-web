#!/usr/bin/env -S npx tsx
// Generates public/portfolio-registry.json from src/data/public-registry.ts
// — the artifact links.yulalab.com fetches at runtime (Y-P0-003). Purely a
// serialization of static source data: no Date.now()/Math.random(), no
// network calls; the only date input is the `asOf` stamp (SEC-WEB-01b), and
// --check regenerates for the asOf stored in the file, so re-running against
// an unchanged registry produces a byte-identical file.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { publicRegistry } from "../src/data/public-registry";
import { buildRegistryExport, siteDate, validateRegistry } from "../src/lib/public-registry";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_PATH = join(ROOT, "public/portfolio-registry.json");

const errors = validateRegistry(publicRegistry);
if (errors.length) {
  console.error("export-public-registry: registry is invalid, refusing to export:\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// SEC-WEB-01b: lapsed non-exempt claims are exported withheld (see
// buildRegistryExport). Write mode stamps today (site zone) as `asOf`;
// --check regenerates for the asOf already in the file, so it stays
// deterministic and does not go red just because a claim lapsed.
const checkOnly = process.argv.includes("--check");
const render = (now: Date) => `${JSON.stringify(buildRegistryExport(publicRegistry, now), null, 2)}\n`;
let json = "";
if (!checkOnly) json = render(new Date());
if (checkOnly) {
  if (!existsSync(OUT_PATH)) {
    console.error(`export-public-registry --check: ${OUT_PATH} does not exist — run without --check first.`);
    process.exit(1);
  }
  const existing = readFileSync(OUT_PATH, "utf8");
  const fileAsOf = (JSON.parse(existing) as { asOf?: string }).asOf;
  if (!fileAsOf || !/^\d{4}-\d{2}-\d{2}$/.test(fileAsOf)) {
    console.error("export-public-registry --check: file has no valid asOf — run `pnpm export:registry`.");
    process.exit(1);
  }
  json = render(new Date(`${fileAsOf}T12:00:00+03:00`));
  if (render(new Date()) !== json) {
    console.warn(
      `export-public-registry --check: WARNING — asOf ${fileAsOf} is behind ${siteDate(new Date())} and a claim has lapsed since; run \`pnpm export:registry\` to withhold it (consumers must still filter by expiresAt).`,
    );
  }
  if (existing !== json) {
    console.error(
      "export-public-registry --check: public/portfolio-registry.json is stale — run `pnpm export:registry` and commit the result.",
    );
    process.exit(1);
  }
  console.log("export-public-registry --check: OK — generated artifact matches working tree, diff 0.");
  process.exit(0);
}

writeFileSync(OUT_PATH, json);
console.log(`export-public-registry: wrote ${OUT_PATH} (${publicRegistry.length} products).`);
