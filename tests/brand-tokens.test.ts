import { describe, expect, it } from "vitest";
import { audit, contrast, parseBlocks, readGlobalsCss, toHex, toRgb, MIN_RATIO } from "../scripts/contrast-audit";
import { THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/theme";

const blocks = parseBlocks(readGlobalsCss());

describe("brand tokens: theme contrast and consistency", () => {
  it("WCAG helper matches known reference values", () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
  });

  it("every text/accent colour is >= 4.5:1 on ink-900/850/800 in both themes", () => {
    const rows = audit(blocks);
    expect(rows.length).toBe(60);
    const failed = rows.filter((r) => r.ratio < MIN_RATIO).map((r) => `${r.theme} ${r.fg} on ${r.bg} ${r.ratio.toFixed(2)}`);
    expect(failed).toEqual([]);
  });

  it("light data-theme block and prefers-color-scheme fallback block are identical", () => {
    expect(blocks.lightMedia).toEqual(blocks.light);
  });

  it("dark and light blocks define the same token names", () => {
    expect(Object.keys(blocks.dark).sort()).toEqual(Object.keys(blocks.light).sort());
  });

  it("ink scale keeps dark text lightest-first and light text darkest-first", () => {
    const lum = (t: Record<string, string>, k: string) => contrast(toRgb(t[k]), [0, 0, 0]);
    for (const [theme, sign] of [["dark", 1], ["light", -1]] as const) {
      const t = blocks[theme];
      expect(sign * (lum(t, "ink-50") - lum(t, "ink-100"))).toBeGreaterThan(0);
      expect(sign * (lum(t, "ink-100") - lum(t, "ink-200"))).toBeGreaterThan(0);
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
