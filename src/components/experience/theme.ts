import type { TimelineFrame } from "./types";
import type { ResolvedTheme } from "@/lib/theme";

export const WORLD_DARK_COLOR = "#030303";
export const WORLD_LIGHT_COLOR = "#e6eef0";

/** Keep narrative geometry/timing intact while honoring the chosen surface. */
export function applyExperienceTheme(frame: TimelineFrame, theme: ResolvedTheme): TimelineFrame {
  return { ...frame, world: { ...frame.world, themeMix: theme === "light" ? 1 : 0 } };
}

// The renderer keeps its spatial background transition continuous. Text must
// not follow the same interpolation curve: near the midpoint foreground and
// background would converge. This switch sits where the interpolated surface
// luminance is approximately 0.18, so pure white immediately before it and
// pure black immediately after it both retain at least WCAG AA contrast.
export const THEME_CONTRAST_SWITCH = 0.216;

export type ExperiencePalette = {
  foreground: "#000000" | "#ffffff";
  muted: "#000000" | "#ffffff";
  line: "#000000" | "#ffffff";
  surface: "dark" | "light";
};

export function resolveExperiencePalette(themeMix: number): ExperiencePalette {
  const lightSurface = Number.isFinite(themeMix) && themeMix >= THEME_CONTRAST_SWITCH;
  const polarity = lightSurface ? "#000000" : "#ffffff";

  return {
    foreground: polarity,
    muted: polarity,
    line: polarity,
    surface: lightSurface ? "light" : "dark",
  };
}
