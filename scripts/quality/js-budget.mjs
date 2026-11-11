#!/usr/bin/env node
/**
 * Post-build JS byte budget (WEB-P0-08).
 *
 * Kapsam: CI'da koşan YALNIZ JS bayt bütçesidir. CWV (LCP/TBT/CLS) Lighthouse
 * sakin makinede ölçülür (WEB-P0-03a5 BLOCKED_TEST); gürültü yüzünden CI'da
 * koşmaz ve burada uydurma bir CWV eşiği yoktur.
 *
 * Ölçüm kaynağı: main 069477c prod build'i (.next), gzip seviye 9.
 *   /            (app-build-manifest "/[locale]/page")          173519 B gzip, 12 JS dosyası
 *   /projects    (app-build-manifest "/[locale]/projects/page") 171314 B gzip, 10 JS dosyası
 *   static/chunks/**\/*.js toplamı                              695758 B gzip, 62 dosya
 * Bütçe = ölçüm x 1.15 (güvenlik payı), 1000 B'a yukarı yuvarlanır.
 * Amaç: mevcut main'i kırmızıya çekmeden yalnız büyük regresyonu yakalamak.
 *
 * Kullanım: node scripts/quality/js-budget.mjs [--root .next]
 *   test/negatif deneme için: --max-home N --max-projects N --max-total N (bayt)
 * Başarısızlıkta exit 1 ve aşılan rota yazılır.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const MARGIN = 1.15;
const roundUp = (n) => Math.ceil(n / 1000) * 1000;
const BASELINE = { home: 173519, projects: 171314, total: 695758 };
const DEFAULTS = {
  home: roundUp(BASELINE.home * MARGIN),
  projects: roundUp(BASELINE.projects * MARGIN),
  total: roundUp(BASELINE.total * MARGIN),
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
function limit(name) {
  const v = arg(`max-${name}`);
  if (v === undefined) return DEFAULTS[name];
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) fail(`--max-${name} geçersiz: ${v}`);
  return n;
}
function fail(message) {
  console.error(`js-budget: ${message}`);
  process.exit(1);
}
const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith(".js") ? [full] : [];
  });
}

const root = path.resolve(arg("root") ?? ".next");
const manifestPath = path.join(root, "app-build-manifest.json");
if (!existsSync(manifestPath)) fail(`app-build-manifest.json yok: ${manifestPath} (önce build gerekir)`);
const pages = JSON.parse(readFileSync(manifestPath, "utf8")).pages ?? {};

const checks = [];
for (const [label, key, name] of [
  ["/", "/[locale]/page", "home"],
  ["/projects", "/[locale]/projects/page", "projects"],
]) {
  const files = pages[key];
  if (!Array.isArray(files)) fail(`manifest'te rota yok: ${key}`);
  const js = [...new Set(files.filter((f) => f.endsWith(".js")))];
  const bytes = js.reduce((sum, f) => sum + gz(path.join(root, f)), 0);
  checks.push({ label: `${label} ilk yük JS (gzip, ${js.length} dosya)`, bytes, max: limit(name) });
}
const chunksDir = path.join(root, "static", "chunks");
if (!existsSync(chunksDir) || !statSync(chunksDir).isDirectory()) fail(`static/chunks yok: ${chunksDir}`);
const all = walk(chunksDir);
checks.push({ label: `static/chunks toplamı (gzip, ${all.length} dosya)`, bytes: all.reduce((s, f) => s + gz(f), 0), max: limit("total") });

let failed = false;
for (const c of checks) {
  const over = c.bytes > c.max;
  failed ||= over;
  console.log(`${over ? "AŞILDI" : "ok    "} ${c.label}: ${c.bytes} / ${c.max} B`);
}
if (failed) fail("JS bayt bütçesi aşıldı");
console.log("js-budget: geçti (CWV bu adımda ölçülmez)");
