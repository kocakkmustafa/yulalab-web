// @vitest-environment jsdom
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_BOOTSTRAP, THEME_COLORS, THEME_STORAGE_KEY, applyThemeToDocument, resolveTheme, type ThemePreference } from "@/lib/theme";
import { applyExperienceTheme } from "@/components/experience/theme";
import { evaluateTimeline } from "@/components/experience/timeline";
import tailwindConfig from "../tailwind.config";

afterEach(() => vi.restoreAllMocks());
function boot(saved: unknown, systemDark: boolean, blocked = false) {
  document.documentElement.className = "font-sample";
  document.head.innerHTML = '<meta name="theme-color" content="#09060e">';
  runInNewContext(THEME_BOOTSTRAP, {
    document,
    localStorage: { getItem(key: string) { expect(key).toBe(THEME_STORAGE_KEY); if (blocked) throw new Error("blocked storage"); return saved; } },
    matchMedia(query: string) { expect(query).toBe("(prefers-color-scheme: dark)"); return { matches: systemDark }; },
  });
}
describe("fixed public prepaint bootstrap and display-theme frame", () => {
  it("applies saved or system appearance before React while preserving font classes", () => {
    for (const preference of ["system", "light", "dark"] as ThemePreference[]) {
      for (const systemDark of [true, false]) {
        boot(preference, systemDark);
        const resolved = resolveTheme(preference, systemDark);
        expect(document.documentElement.dataset.theme).toBe(resolved);
        expect(document.documentElement.dataset.themePreference).toBe(preference);
        expect(document.documentElement.style.colorScheme).toBe(resolved);
        expect(document.documentElement.classList.contains("font-sample")).toBe(true);
        expect(document.documentElement.classList.contains("dark")).toBe(resolved === "dark");
        expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(THEME_COLORS[resolved]);
      }
    }
  });

  it("uses system for missing, invalid or blocked storage and stays aligned with the public sync helper", () => {
    for (const value of [null, "sepia", undefined]) {
      boot(value, false);
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.dataset.themePreference).toBe("system");
    }
    boot("dark", false, true);
    expect(document.documentElement.dataset.theme).toBe("light");
    applyThemeToDocument(document, "dark", "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("does not need a media API or read a page URL, token, network or account", () => {
    runInNewContext(THEME_BOOTSTRAP, { document, localStorage: { getItem() { throw new Error("blocked"); } } });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps the fixed bootstrap in head before body and leaves generic CSP unchanged", () => {
    const layout = readFileSync(path.resolve(import.meta.dirname, "../src/app/[locale]/layout.tsx"), "utf8");
    expect(layout.indexOf("__html: THEME_BOOTSTRAP")).toBeGreaterThan(layout.indexOf("<head>"));
    expect(layout.indexOf("__html: THEME_BOOTSTRAP")).toBeLessThan(layout.indexOf("<body"));
    expect(layout).toContain("<ThemeProvider>");
    const config = readFileSync(path.resolve(import.meta.dirname, "../next.config.mjs"), "utf8");
    expect(config).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("uses the same surface polarity at both timeline consumers without altering narrative geometry", () => {
    for (const progress of [0, 0.2, 0.72, 0.84, 1]) {
      const raw = evaluateTimeline(progress, "desktop");
      const originalMix = raw.world.themeMix;
      for (const theme of ["dark", "light"] as const) {
        const frame = applyExperienceTheme(raw, theme);
        expect(frame.world.themeMix).toBe(theme === "light" ? 1 : 0);
        expect(frame.world.whiteMix).toBe(raw.world.whiteMix);
        expect(frame.camera).toBe(raw.camera);
        expect(frame.stage).toBe(raw.stage);
        expect(raw.world.themeMix).toBe(originalMix);
      }
    }
    for (const consumer of ["YulaExperience.tsx", "ExperienceWorld.tsx"]) {
      expect(readFileSync(path.resolve(import.meta.dirname, "../src/components/experience", consumer), "utf8")).toContain("applyExperienceTheme(evaluateTimeline(");
    }
  });

  it("keeps configured normal text and status colors readable on both page and raised surfaces", () => {
    const css = readFileSync(path.resolve(import.meta.dirname, "../src/app/globals.css"), "utf8");
    const base: Record<string, string> = {}, light: Record<string, string> = {};
    for (const block of css.matchAll(/^:root(?:\[data-theme="(light)"\])? \{([^}]+)\}/gm)) {
      for (const property of block[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
        (block[1] ? light : base)[property[1]] = property[2].trim();
      }
    }
    const experienceCSS = readFileSync(path.resolve(import.meta.dirname, "../src/components/experience/Experience.module.css"), "utf8");
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, Record<string, string>>;
    const luminance = (configured: string, vars: Record<string, string>) => {
      const variable = configured.match(/var\((--[\w-]+)\)/)?.[1];
      const value = variable ? vars[variable] : configured;
      const channels = value.startsWith("#")
        ? [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
        : value.split(/\s+/).map(Number);
      expect(channels).toHaveLength(3);
      const linear = channels.map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const focusColors = ["glyphControl", "previewExpand"].map((selector) => {
      const rule = experienceCSS.match(new RegExp(`\\.${selector}:focus-visible \\{([^}]+)\\}`))?.[1] ?? "";
      const color = rule.match(/outline:\s*[^;]*?(#[0-9a-f]{6}|var\(--[\w-]+\))/i)?.[1];
      expect(color, selector).toBeDefined();
      return color!;
    });
    for (const vars of [base, { ...base, ...light }]) {
      const world = luminance("var(--yula-exp-rgb)", vars);
      for (const configured of focusColors) {
        const ring = luminance(configured, vars);
        expect((Math.max(ring, world) + .05) / (Math.min(ring, world) + .05)).toBeGreaterThanOrEqual(3);
      }
      for (const surface of [colors.ink[900], colors.ink[850]]) {
        const background = luminance(surface, vars);
        for (const foreground of [colors.ink[50], colors.ink[300], colors.ink[400], colors.amber[300], colors.emerald[300]]) {
          const text = luminance(foreground, vars);
          expect((Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05)).toBeGreaterThanOrEqual(4.5);
        }
        for (const control of ["var(--yula-focus)", "var(--yula-control-line)"]) {
          const line = luminance(control, vars);
          expect((Math.max(line, background) + 0.05) / (Math.min(line, background) + 0.05)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
