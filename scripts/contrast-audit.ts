/**
 * WCAG 2.x contrast audit for the --yula-* theme tokens in src/app/globals.css.
 * Source-only: no network, no browser. Used by `pnpm verify:contrast` and tests/brand-tokens.test.ts.
 *
 * Measures text/accent tokens against the opaque ink grounds AND against the
 * grounds composited with the alpha surface layers (--yula-surface, -raised, -inset),
 * singly and stacked in pairs. Border token --yula-control-line is checked at the
 * 3:1 non-text threshold (WCAG 1.4.11).
 *
 * Usage: node --import tsx scripts/contrast-audit.ts [--markdown] [--out <file.md>] [--css <path>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Rgb = [number, number, number];
export type Rgba = [number, number, number, number];
export type TokenMap = Record<string, string>;
export interface ThemeBlocks { dark: TokenMap; light: TokenMap; lightMedia: TokenMap; duplicates: string[] }
export interface AuditRow { theme: "dark" | "light"; fg: string; bg: string; layers: string[]; fgHex: string; bgHex: string; ratio: number; min: number; pass: boolean }

export const MIN_RATIO = 4.5;
export const MIN_NON_TEXT_RATIO = 3;
export const THEMES = ["dark", "light"] as const;
export const TEXT_TOKENS = ["ink-50", "ink-100", "ink-200", "ink-300", "ink-400"] as const;
export const SURFACE_TOKENS = ["ink-900", "ink-850", "ink-800"] as const;
export const ACCENT_TOKENS = ["focus", "warning", "warning-strong", "success", "success-strong", "danger", "exp-accent"] as const;
export const NON_TEXT_TOKENS = ["control-line"] as const;
export const LAYER_TOKENS = ["surface", "surface-raised", "surface-inset"] as const;
/** [] = bare ground, then each layer alone, then every ordered pair of distinct layers (bottom first). */
export const LAYER_STACKS: string[][] = [
  [],
  ...LAYER_TOKENS.map((l) => [l]),
  ...LAYER_TOKENS.flatMap((a) => LAYER_TOKENS.filter((b) => b !== a).map((b) => [a, b])),
];
export const EXPECTED_ROWS = THEMES.length * SURFACE_TOKENS.length * LAYER_STACKS.length * (TEXT_TOKENS.length + ACCENT_TOKENS.length + NON_TEXT_TOKENS.length);

function blockBody(css: string, selector: string, from: number): { body: string; end: number } | null {
  const start = css.indexOf(selector, from);
  if (start < 0) return null;
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}" && (depth -= 1) === 0) return { body: css.slice(open + 1, i), end: i };
  }
  throw new Error(`Unclosed block: ${selector}`);
}

/** Merges every block matching `selector` after `from`; a token declared twice for the same theme is recorded. */
function collect(css: string, selector: string, from: number, label: string, inner?: string): { map: TokenMap; dupes: string[] } {
  const map: TokenMap = {}; const dupes: string[] = [];
  let pos = from;
  for (;;) {
    const found = blockBody(css, selector, pos);
    if (!found) break;
    pos = found.end;
    let body = found.body;
    if (inner) { const nested = blockBody(body, inner, 0); if (!nested) continue; body = nested.body; }
    for (const m of body.matchAll(/--yula-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (m[1] in map) dupes.push(`${label}: --yula-${m[1]}`);
      map[m[1]] = m[2].trim();
    }
  }
  if (!Object.keys(map).length) throw new Error(`Selector not found or empty: ${label}`);
  return { map, dupes };
}

export function parseBlocks(css: string): ThemeBlocks {
  const marker = css.indexOf("User appearance");
  const from = marker < 0 ? 0 : marker;
  const dark = collect(css, ":root {", from, "dark :root");
  const light = collect(css, ':root[data-theme="light"]', from, "light data-theme");
  const media = collect(css, "@media (prefers-color-scheme: light)", from, "light media fallback", ":root:not([data-theme])");
  return { dark: dark.map, light: light.map, lightMedia: media.map, duplicates: [...dark.dupes, ...light.dupes, ...media.dupes] };
}

export function toRgb(value: string): Rgb {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb;
  const triplet = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/.exec(v);
  if (triplet) return [Number(triplet[1]), Number(triplet[2]), Number(triplet[3])];
  throw new Error(`Unsupported colour value: ${value}`);
}

export function toRgba(value: string): Rgba {
  const m = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9.]+)\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`Unsupported rgba value: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
}

export const toHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** Source-over: layer (with alpha) painted on an opaque base. Rounds to 8-bit like a browser. */
export function composite(base: Rgb, layer: Rgba): Rgb {
  const a = layer[3];
  return [0, 1, 2].map((i) => Math.round(layer[i] * a + base[i] * (1 - a))) as Rgb;
}

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
  for (const theme of THEMES) {
    const t = blocks[theme];
    for (const bgName of SURFACE_TOKENS) {
      for (const layers of LAYER_STACKS) {
        let ground = toRgb(t[bgName]);
        for (const l of layers) ground = composite(ground, toRgba(t[l]));
        for (const fg of [...TEXT_TOKENS, ...ACCENT_TOKENS, ...NON_TEXT_TOKENS]) {
          const f = toRgb(t[fg]);
          const ratio = contrast(f, ground);
          const min = (NON_TEXT_TOKENS as readonly string[]).includes(fg) ? MIN_NON_TEXT_RATIO : MIN_RATIO;
          rows.push({ theme, fg, bg: bgName, layers, fgHex: toHex(f), bgHex: toHex(ground), ratio, min, pass: ratio >= min });
        }
      }
    }
  }
  return rows;
}

const stackName = (r: AuditRow) => [r.bg, ...r.layers].join(" + ");

/** Base-ground table: bare ink-900/850/800 only. */
export function markdownTable(rows: AuditRow[]): string {
  const lines = ["| Tema | Metin | Zemin | Oran | Eşik | Sonuç |", "|---|---|---|---|---|---|"];
  for (const r of rows.filter((x) => x.layers.length === 0)) lines.push(`| ${r.theme} | ${r.fg} ${r.fgHex} | ${r.bg} ${r.bgHex} | ${r.ratio.toFixed(2)} | ${r.min} | ${r.pass ? "geçti" : "KALDI"} |`);
  return lines.join("\n");
}

/** Worst case per theme and token across every ground and layer stack (composites included). */
export function worstCaseTable(rows: AuditRow[]): string {
  const lines = ["| Tema | Token | En kötü zemin (bileşik hex) | En düşük oran | Eşik | Sonuç |", "|---|---|---|---|---|---|"];
  for (const theme of THEMES) {
    for (const fg of [...TEXT_TOKENS, ...ACCENT_TOKENS, ...NON_TEXT_TOKENS]) {
      const worst = rows.filter((r) => r.theme === theme && r.fg === fg).sort((a, b) => a.ratio - b.ratio)[0];
      lines.push(`| ${theme} | ${fg} ${worst.fgHex} | ${stackName(worst)} ${worst.bgHex} | ${worst.ratio.toFixed(2)} | ${worst.min} | ${worst.pass ? "geçti" : "KALDI"} |`);
    }
  }
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
  const md = `${markdownTable(rows)}\n\n${worstCaseTable(rows)}\n`;
  if (outIdx >= 0) fs.writeFileSync(path.resolve(argv[outIdx + 1]), md);
  if (argv.includes("--markdown")) console.log(md);
  else for (const r of failed) console.log(`FAIL ${r.theme.padEnd(5)} ${r.fg.padEnd(15)} on ${stackName(r)} ${r.bgHex} ${r.ratio.toFixed(2)} < ${r.min}`);
  for (const d of blocks.duplicates) console.log(`DUPLICATE token: ${d}`);
  const min = Math.min(...rows.filter((r) => r.min === MIN_RATIO).map((r) => r.ratio));
  console.log(`${rows.length} pairs (expected ${EXPECTED_ROWS}), text/accent min ${min.toFixed(2)}:1, ${failed.length} below threshold, ${blocks.duplicates.length} duplicate tokens`);
  if (failed.length || blocks.duplicates.length || rows.length !== EXPECTED_ROWS) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
