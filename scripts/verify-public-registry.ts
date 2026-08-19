#!/usr/bin/env -S npx tsx
// PR/CI gate for the public registry (Y-P0-003, roadmap §12 Y-P0-003,
// mapped from package.json's `verify:claims`). Structural only — see
// src/lib/public-registry.ts's validateRecord() header comment for why
// freshness/expiry is deliberately NOT checked here.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { publicRegistry } from "../src/data/public-registry";
import { validateRegistry } from "../src/lib/public-registry";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const errors = validateRegistry(publicRegistry);
if (errors.length) {
  console.error(`verify-public-registry: ${errors.length} issue(s) found\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// Re-generate into a throwaway path and diff, rather than trusting whatever
// is already on disk — a stale committed JSON must fail this the same way
// a stale generated one would.
try {
  execFileSync("npx", ["tsx", "scripts/export-public-registry.ts", "--check"], {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}

console.log(
  `verify-public-registry: OK — ${publicRegistry.length} products, 0 structural issues, generated artifact current.`,
);
