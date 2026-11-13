import { describe, expect, it } from "vitest";
import { audit, contrast, luminance, parseBlocks, readGlobalsCss, toHex, toRgb, EXPECTED_ROWS, MIN_RATIO } from "../scripts/contrast-audit";
import { THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/theme";

const blocks = parseBlocks(readGlobalsCss());

describe("brand tokens: theme contrast and consistency", () => {
  it("WCAG helper matches known reference values", () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it("every text/accent colour is >= 4.5:1 (control-line >= 3:1) on bare and alpha-composited grounds, both themes", () => {
    const rows = audit(blocks);
    expect(rows.length).toBe(EXPECTED_ROWS);
    expect(rows.some((r) => r.layers.length === 2)).toBe(true);
    const failed = rows
      .filter((r) => !r.pass)
      .map((r) => `${r.theme} ${r.fg} on ${[r.bg, ...r.layers].join("+")} ${r.ratio.toFixed(2)}`);
    expect(failed).toEqual([]);
    expect(Math.min(...rows.filter((r) => r.min === MIN_RATIO).map((r) => r.ratio))).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("second token block (control-line, danger, exp-accent) is parsed for both themes and the media fallback", () => {
    for (const set of [blocks.dark, blocks.light, blocks.lightMedia]) {
      for (const k of ["control-line", "danger", "exp-accent"]) expect(set[k]).toBeTruthy();
    }
  });

  it("no token is declared twice within the same theme block", () => {
    expect(blocks.duplicates).toEqual([]);
    const dup = parseBlocks(
      '/* User appearance */\n:root { --yula-ink-900: 1 2 3; --yula-ink-900: 4 5 6; }\n:root[data-theme="light"] { --yula-a: 1; }\n@media (prefers-color-scheme: light) { :root:not([data-theme]) { --yula-a: 1; } }',
    );
    expect(dup.duplicates).toEqual(["dark :root: --yula-ink-900"]);
  });

  it("light data-theme block and prefers-color-scheme fallback block are identical", () => {
    expect(blocks.lightMedia).toEqual(blocks.light);
  });

  it("dark and light blocks define the same token names", () => {
    expect(Object.keys(blocks.dark).sort()).toEqual(Object.keys(blocks.light).sort());
  });

  it("ink text scale is strictly monotonic 50 > 100 > 200 > 300 > 400 (dark: lighter to dimmer; light: darker to lighter)", () => {
    const chain = ["ink-50", "ink-100", "ink-200", "ink-300", "ink-400"];
    for (const [theme, sign] of [["dark", 1], ["light", -1]] as const) {
      const lum = chain.map((k) => luminance(toRgb(blocks[theme][k])));
      for (let i = 0; i < chain.length - 1; i += 1) {
        expect(sign * (lum[i] - lum[i + 1]), `${theme} ${chain[i]} vs ${chain[i + 1]}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the appearance storage key unchanged", () => {
    expect(THEME_STORAGE_KEY).toBe("yula.appearance.v1");
  });

  it("THEME_COLORS match each theme's page background and ink-900", () => {
    for (const theme of ["dark", "light"] as const) {
      const t = blocks[theme];
      expect(THEME_COLORS[theme].toUpperCase()).toBe(t["page-bg"].toUpperCase());
      expect(THEME_COLORS[theme].toUpperCase()).toBe(toHex(toRgb(t["ink-900"])));
      expect(toHex(toRgb(t["page-rgb"]))).toBe(toHex(toRgb(t["ink-900"])));
    }
  });

  it("design candidates are the live end tokens", () => {
    expect(THEME_COLORS.light).toBe("#f6f5f0");
    expect(toHex(toRgb(blocks.light["ink-50"]))).toBe("#111110");
    expect(THEME_COLORS.dark).toBe("#0d0e11");
    expect(toHex(toRgb(blocks.dark["ink-50"]))).toBe("#E4E4E0");
  });
});
