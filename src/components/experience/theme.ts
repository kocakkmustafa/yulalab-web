import type { TimelineFrame } from "./types";
import type { ResolvedTheme } from "@/lib/theme";
import { segmentProgress, smoothstep } from "./timeline";

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

// Section light for the LED wall, as linear RGB multipliers. The room leaves
// the gallery in petrol and turns night blue just before the white blade, so
// the light change announces the crossing. Text is drawn over darker panels
// than with white light, so the contrast switch above still holds.
export const WALL_TINTS = {
  neutral: [1, 1, 1],
  petrol: [0.2, 0.92, 1],
  night: [0.24, 0.42, 1],
} as const satisfies Record<string, readonly [number, number, number]>;

export function resolveWallTint(progress: number): [number, number, number] {
  const petrol = smoothstep(segmentProgress(progress, 0.46, 0.51))
    * (1 - smoothstep(segmentProgress(progress, 0.53, 0.57)));
  const night = smoothstep(segmentProgress(progress, 0.53, 0.57))
    * (1 - smoothstep(segmentProgress(progress, 0.6, 0.66)));
  return [0, 1, 2].map((channel) => {
    const base = WALL_TINTS.neutral[channel] + (WALL_TINTS.petrol[channel] - WALL_TINTS.neutral[channel]) * petrol;
    return base + (WALL_TINTS.night[channel] - base) * night;
  }) as [number, number, number];
}
