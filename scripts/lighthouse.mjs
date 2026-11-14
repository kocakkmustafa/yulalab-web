#!/usr/bin/env node
/**
 * Lighthouse / CWV kapısı (QA-WEB-02).
 *
 * Üretim derlemesini (.next, önce `pnpm build`) yerel porta `next start` ile kaldırır,
 * /tr ve /en rotalarını mobil + masaüstü presetiyle ölçer; her kombinasyon için N koşunun
 * MEDYANINI alır ve eşikle karşılaştırır. Lighthouse'u `npx lighthouse@<sürüm>` ile çalıştırır
 * (projeye bağımlılık eklenmez; önceki denetimler de `npx lighthouse` ile yapıldı).
 *
 * Eşikler: performans mobil >= 80, masaüstü >= 80 (mobilden az olamaz); a11y >= 95 (ikisi de).
 * TBT/LCP/CLS yalnız raporlanır, eşik değildir (paylaşılan CI makinesinde TBT kararsız).
 *
 * Kullanım: node scripts/lighthouse.mjs [--runs 3] [--routes /tr,/en] [--presets mobile,desktop]
 *           [--port 4191] [--out lighthouse-results] [--base-url http://host:port]
 * Çıktı: <out>/results.json, <out>/summary.md, <out>/raw/*.json. Kapı kaldıysa exit 1.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LIGHTHOUSE_VERSION = "12.8.2";
export const THRESHOLDS = {
  mobile: { performance: 80, accessibility: 95 },
  desktop: { performance: 80, accessibility: 95 },
};

/** Medyan; boş girişte null (uydurma sayı yok). */
export function median(values) {
  const nums = (values ?? []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * runs: [{performance, accessibility, tbt?, lcp?, cls?}] (performance/a11y 0-100).
 * Dönüş: {runs, medians, pass, failures[]}. Boş girdi = kaldı.
 */
export function evaluate(preset, runs, thresholds = THRESHOLDS) {
  const limit = thresholds[preset];
  if (!limit) throw new Error(`bilinmeyen preset: ${preset}`);
  const list = runs ?? [];
  const medians = {
    performance: median(list.map((r) => r.performance)),
    accessibility: median(list.map((r) => r.accessibility)),
    tbt: median(list.map((r) => r.tbt)),
    lcp: median(list.map((r) => r.lcp)),
    cls: median(list.map((r) => r.cls)),
  };
  const failures = [];
  if (list.length === 0 || medians.performance === null || medians.accessibility === null) {
    failures.push("ölçüm yok (boş koşu listesi)");
  } else {
    for (const key of ["performance", "accessibility"]) {
      if (medians[key] < limit[key]) failures.push(`${key} ${medians[key]} < ${limit[key]}`);
    }
  }
  return { preset, runs: list.length, medians, pass: failures.length === 0, failures };
}

export function toMarkdown(results) {
  const fmt = (v, d = 0) => (v === null || v === undefined ? "-" : Number(v).toFixed(d));
  const lines = [
    "## Lighthouse özeti (koşu medyanı)",
    "",
    "| Rota | Preset | Koşu | Perf | A11y | TBT ms | LCP ms | CLS | Sonuç |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of results) {
    const m = r.medians;
    lines.push(
      `| ${r.route} | ${r.preset} | ${r.runs} | ${fmt(m.performance)} | ${fmt(m.accessibility)} | ${fmt(m.tbt)} | ${fmt(m.lcp)} | ${fmt(m.cls, 3)} | ${r.pass ? "GEÇTİ" : "KALDI: " + r.failures.join("; ")} |`,
    );
  }
  lines.push("", `Eşik: perf >= ${THRESHOLDS.mobile.performance} (mobil), >= ${THRESHOLDS.desktop.performance} (masaüstü); a11y >= ${THRESHOLDS.mobile.accessibility}. TBT/LCP/CLS yalnız bilgi.`);
  return lines.join("\n") + "\n";
}

export function overallPass(results) {
  return results.length > 0 && results.every((r) => r.pass);
}

/** Lighthouse JSON -> {performance, accessibility, tbt, lcp, cls}. */
export function extractRun(lhr) {
  const score = (id) => (typeof lhr.categories?.[id]?.score === "number" ? Math.round(lhr.categories[id].score * 100) : null);
  const audit = (id) => (typeof lhr.audits?.[id]?.numericValue === "number" ? lhr.audits[id].numericValue : null);
  return {
    performance: score("performance"),
    accessibility: score("accessibility"),
    tbt: audit("total-blocking-time"),
    lcp: audit("largest-contentful-paint"),
    cls: audit("cumulative-layout-shift"),
  };
}

// ---- CLI -----------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function waitReady(url, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`sunucu hazır olmadı: ${url}`);
}

async function main() {
  const runsPer = Number(arg("runs", "3"));
  const routes = arg("routes", "/tr,/en").split(",");
  const presets = arg("presets", "mobile,desktop").split(",");
  const port = Number(arg("port", "4191"));
  const out = path.resolve(arg("out", "lighthouse-results"));
  const external = arg("base-url");
  const base = external ?? `http://localhost:${port}`;
  mkdirSync(path.join(out, "raw"), { recursive: true });

  let server;
  if (!external) {
    const nextBin = path.resolve("node_modules/next/dist/bin/next");
    server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { stdio: "ignore", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  }
  const results = [];
  try {
    await waitReady(`${base}${routes[0]}`);
    for (const route of routes) {
      for (const preset of presets) {
        const runs = [];
        for (let i = 1; i <= runsPer; i++) {
          const file = path.join(out, "raw", `${route.replace(/\W+/g, "") || "root"}-${preset}-${i}.json`);
          const args = ["--yes", `lighthouse@${LIGHTHOUSE_VERSION}`, `${base}${route}`, "--output=json", `--output-path=${file}`,
            "--only-categories=performance,accessibility", "--quiet", "--chrome-flags=--headless=new --no-sandbox"];
          if (preset === "desktop") args.push("--preset=desktop");
          const res = spawnSync("npx", args, { stdio: ["ignore", "ignore", "inherit"], timeout: 180_000 });
          if (res.status !== 0) {
            console.error(`lighthouse başarısız: ${route} ${preset} #${i} (exit ${res.status})`);
            continue;
          }
          runs.push(extractRun(JSON.parse(readFileSync(file, "utf8"))));
        }
        results.push({ route, ...evaluate(preset, runs) });
      }
    }
  } finally {
    server?.kill("SIGTERM");
  }
  const pass = overallPass(results);
  writeFileSync(path.join(out, "results.json"), JSON.stringify({ lighthouse: LIGHTHOUSE_VERSION, thresholds: THRESHOLDS, pass, results }, null, 2) + "\n");
  const md = toMarkdown(results);
  writeFileSync(path.join(out, "summary.md"), md);
  console.log(md);
  process.exit(pass ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`lighthouse: ${e.message}`); process.exit(1); });
}
