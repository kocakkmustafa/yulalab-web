/**
 * WCAG 2.x contrast audit for the --yula-* theme tokens in src/app/globals.css.
 * Source-only: no network, no browser. Used by `pnpm verify:contrast` and tests/brand-tokens.test.ts.
 *
 * Usage: node --import tsx scripts/contrast-audit.ts [--markdown] [--out <file.md>] [--css <path>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Rgb = [number, number, number];
export type TokenMap = Record<string, string>;
export interface ThemeBlocks { dark: TokenMap; light: TokenMap; lightMedia: TokenMap }
export interface AuditRow { theme: "dark" | "light"; fg: string; bg: string; fgHex: string; bgHex: string; ratio: number; pass: boolean }

export const MIN_RATIO = 4.5;
export const TEXT_TOKENS = ["ink-50", "ink-100", "ink-200", "ink-300", "ink-400"] as const;
export const SURFACE_TOKENS = ["ink-900", "ink-850", "ink-800"] as const;
export const ACCENT_TOKENS = ["focus", "warning", "warning-strong", "success", "success-strong"] as const;

/** Returns the declaration body of the first `selector {` block, matching braces. */
function blockBody(css: string, selector: string, from = 0): string {
  const start = css.indexOf(selector, from);
  if (start < 0) throw new Error(`Selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}" && (depth -= 1) === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Unclosed block: ${selector}`);
}

function declarations(body: string): TokenMap {
  const out: TokenMap = {};
  for (const m of body.matchAll(/--yula-([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

export function parseBlocks(css: string): ThemeBlocks {
  const marker = css.indexOf("User appearance");
  const from = marker < 0 ? 0 : marker;
  const dark = declarations(blockBody(css, ":root {", from));
  const light = declarations(blockBody(css, ':root[data-theme="light"]', from));
  const media = blockBody(css, "@media (prefers-color-scheme: light)", from);
  const lightMedia = declarations(blockBody(media, ":root:not([data-theme])"));
  return { dark, light, lightMedia };
}

export function toRgb(value: string): Rgb {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb;
  const triplet = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/.exec(v);
  if (triplet) return [Number(triplet[1]), Number(triplet[2]), Number(triplet[3])];
  throw new Error(`Unsupported colour value: ${value}`);
}

export const toHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function audit(blocks: ThemeBlocks): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const theme of ["dark", "light"] as const) {
    const t = blocks[theme];
    for (const bg of SURFACE_TOKENS) {
      for (const fg of [...TEXT_TOKENS, ...ACCENT_TOKENS]) {
        const f = toRgb(t[fg]); const b = toRgb(t[bg]);
        const ratio = contrast(f, b);
        rows.push({ theme, fg, bg, fgHex: toHex(f), bgHex: toHex(b), ratio, pass: ratio >= MIN_RATIO });
      }
    }
  }
  return rows;
}

export function markdownTable(rows: AuditRow[]): string {
  const lines = ["| Tema | Metin | Zemin | Oran | Sonuç |", "|---|---|---|---|---|"];
  for (const r of rows) lines.push(`| ${r.theme} | ${r.fg} ${r.fgHex} | ${r.bg} ${r.bgHex} | ${r.ratio.toFixed(2)} | ${r.pass ? "geçti" : "KALDI"} |`);
  return lines.join("\n");
}

export function readGlobalsCss(file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/app/globals.css")): string {
  return fs.readFileSync(file, "utf8");
}

function main(): void {
  const argv = process.argv.slice(2);
  const cssIdx = argv.indexOf("--css");
  const blocks = parseBlocks(readGlobalsCss(cssIdx >= 0 ? path.resolve(argv[cssIdx + 1]) : undefined));
  const rows = audit(blocks);
  const failed = rows.filter((r) => !r.pass);
  const outIdx = argv.indexOf("--out");
  if (outIdx >= 0) fs.writeFileSync(path.resolve(argv[outIdx + 1]), `${markdownTable(rows)}\n`);
  if (argv.includes("--markdown")) console.log(markdownTable(rows));
  else for (const r of rows) console.log(`${r.pass ? "ok  " : "FAIL"} ${r.theme.padEnd(5)} ${r.fg.padEnd(15)} on ${r.bg} ${r.ratio.toFixed(2)}`);
  const min = Math.min(...rows.map((r) => r.ratio));
  console.log(`\n${rows.length} pairs, min ${min.toFixed(2)}:1, ${failed.length} below ${MIN_RATIO}:1`);
  if (failed.length) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
