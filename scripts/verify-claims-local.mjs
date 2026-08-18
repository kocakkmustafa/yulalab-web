#!/usr/bin/env node
// Y-P0-001 stopgap claim/content check. Plain Node (no deps, no build step)
// so it runs today, before Y-P0-002 adds vitest and Y-P0-003 adds the
// registry-driven scripts/verify-public-registry.ts + verify-public-links.ts.
// Once both exist and cover TR/EN parity + forbidden-pattern scanning, this
// file can be retired — don't let it silently duplicate them forever.
//
// Usage: node scripts/verify-claims-local.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)); // site/
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url)); // yulalab-com/

const failures = [];

// 1. TR/EN key parity in messages/*.json -----------------------------------
function collectKeys(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const child of collectKeys(v, path)) keys.add(child);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

const tr = JSON.parse(readFileSync(join(ROOT, "messages/tr.json"), "utf8"));
const en = JSON.parse(readFileSync(join(ROOT, "messages/en.json"), "utf8"));
const trKeys = collectKeys(tr);
const enKeys = collectKeys(en);

for (const k of trKeys) {
  if (!enKeys.has(k)) failures.push(`TR/EN parity: messages/en.json is missing "${k}" (present in tr.json)`);
}
for (const k of enKeys) {
  if (!trKeys.has(k)) failures.push(`TR/EN parity: messages/tr.json is missing "${k}" (present in en.json)`);
}

// 2. Forbidden public-claim patterns -----------------------------------------
// Each entry is a regression guard for a specific claim fixed in Y-P0-001
// (2026-08-19) — see EVIDENCE-LEDGER.md for the sourced finding behind each
// one. A hit means the false/stale claim crept back in; verify the specific
// finding before assuming the checker itself is wrong.
const FORBIDDEN = [
  { pattern: /venture studio/i, note: "brand category roadmap §1.1 forbids — use 'product lab'" },
  { pattern: /girişim stüdyosu/i, note: "brand category roadmap §1.1 forbids — use 'ürün laboratuvarı'" },
  { pattern: /\bthree products\b/i, note: "stale product count (site has 8) — drop the number or state the real count" },
  { pattern: /üç ürün(?:ümüz)?(?:ün|ü)?\b/i, note: "stale product count (site has 8) — drop the number or state the real count" },
  { pattern: /\bshap\b/i, note: "Burun Farkı's per-prediction bars are synthetic (verified 2026-08-19, see EVIDENCE-LEDGER) — do not claim SHAP" },
  { pattern: /unlimited combinations/i, note: "Braavolabs has a finite step/depth cap (MAX_STEPS_PER_RUN=50) — 'unlimited' is not accurate" },
  { pattern: /sınırsız birleşim/i, note: "Braavolabs has a finite step/depth cap — 'sınırsız' is not accurate" },
  { pattern: /compliant with[^.]*(kvkk|gdpr)/i, note: "blanket compliance-certification language roadmap §1.1 forbids" },
  { pattern: /bütün ürünler(?:imiz)?[^.]*(kvkk|gdpr)[^.]*kapsamındadır/i, note: "blanket categorical KVKK/GDPR claim roadmap §1.1 forbids" },
];

const SCAN_TARGETS = [
  join(ROOT, "src"),
  join(ROOT, "messages"),
  join(ROOT, "LICENSE"),
  join(ROOT, "README.md"),
  join(REPO_ROOT, "links/index.html"),
  join(REPO_ROOT, "links/README.md"),
];

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".md", ".html", ""]);

function walk(path, out) {
  const st = statSync(path, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isDirectory()) {
    if (path.includes("node_modules") || path.includes(`${path.sep ?? "/"}.next`)) return;
    for (const entry of readdirSync(path)) walk(join(path, entry), out);
  } else if (TEXT_EXT.has(extname(path))) {
    out.push(path);
  }
}

const files = [];
for (const target of SCAN_TARGETS) walk(target, files);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const { pattern, note } of FORBIDDEN) {
    if (pattern.test(content)) {
      failures.push(`${file}: matches forbidden pattern ${pattern} — ${note}`);
    }
  }
}

// -----------------------------------------------------------------------
if (failures.length) {
  console.error(`verify-claims-local: ${failures.length} issue(s) found\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log(
    `verify-claims-local: OK — ${trKeys.size} TR keys / ${enKeys.size} EN keys in parity, ${files.length} files scanned, 0 forbidden-pattern hits.`,
  );
  process.exit(0);
}
