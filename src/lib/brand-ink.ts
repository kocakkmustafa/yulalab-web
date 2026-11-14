import type { CSSProperties } from "react";
import type { ProjectBrand } from "./types";

/**
 * Theme-aware foreground colour for a product's brand colour. Pair the returned
 * style with `data-brand-fg="true"`; globals.css resolves `--brand-fg` per theme
 * (dark: `primaryOnDark` when set, light: `primary`). Products without a
 * `primaryOnDark` keep their previous single colour and alpha.
 */
export function brandInk(brand: ProjectBrand, alphaPercent = 100): CSSProperties {
  return {
    "--brand-d": brand.primaryOnDark ?? brand.primary,
    "--brand-l": brand.primary,
    "--brand-a": `${brand.primaryOnDark ? 100 : alphaPercent}%`,
  } as CSSProperties;
}

/**
 * Fallback monogram panel (ProjectCard BigCard, no product shot): gradient
 * layer opacity and glyph colour. A deep-purple gradient start needs the full
 * gradient and an opaque dark glyph to keep >= 3:1 under the card's black
 * overlay; other products keep the original 0.85 / 0.55.
 */
export function monogramPanel(brand: ProjectBrand): { gradientOpacity: number; glyphAlpha: number } {
  return brand.primaryOnDark ? { gradientOpacity: 1, glyphAlpha: 1 } : { gradientOpacity: 0.85, glyphAlpha: 0.55 };
}
