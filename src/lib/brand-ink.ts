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
