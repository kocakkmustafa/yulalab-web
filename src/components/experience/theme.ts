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

/**
 * Screen-space room light. Each set is a wide glow plus a narrow peak around
 * a centre (uv, origin bottom left) falling off to a dark edge; colours are
 * sRGB hex, spreads are squared-uv variances. Values come from the measured
 * ground light of the reference scenes (cell colours of the 4x3 grid).
 */
export type GroundSet = {
  edge: string; mid: string; peak: string;
  centre: [number, number, number, number];
  spread: [number, number, number, number];
};

export const GROUND_SETS = {
  hero: { edge: "#02010b", mid: "#130940", peak: "#7a4cd0", centre: [0.5, 0.5, 0.5, 0.5], spread: [0.08, 0.075, 0.05, 0.05] },
  portfolio: { edge: "#050505", mid: "#c8c0d0", peak: "#c8c0d0", centre: [0.5, 0.55, 0.5, 0.55], spread: [0.05, 0.06, 0.05, 0.06] },
  proof: { edge: "#030709", mid: "#0c3446", peak: "#4cc4ff", centre: [0.24, 0.5, 0.36, 0.5], spread: [0.17, 0.5, 0.034, 0.03] },
  night: { edge: "#000104", mid: "#031030", peak: "#041a3c", centre: [0.5, 0.5, 0.5, 0.5], spread: [0.12, 0.3, 0.06, 0.15] },
  closing: { edge: "#000001", mid: "#030917", peak: "#021736", centre: [0.5, 0.5, 0.5, 0.5], spread: [0.12, 0.3, 0.06, 0.15] },
  light: { edge: "#c8d1d4", mid: "#e4eef1", peak: "#e4eef1", centre: [0.5, 0.5, 0.5, 0.5], spread: [0.14, 0.25, 0.2, 0.3] },
} as const satisfies Record<string, GroundSet>;

export type GroundWeights = { hero: number; portfolio: number; proof: number; night: number; closing: number; light: number };

export function resolveGroundWeights(progress: number, themeMix: number): GroundWeights {
  const ss = (a: number, b: number) => smoothstep(segmentProgress(progress, a, b));
  const dark = 1 - themeMix;
  return {
    hero: (1 - ss(0.06, 0.12)) * dark,
    portfolio: ss(0.06, 0.12) * (1 - ss(0.46, 0.52)) * dark,
    proof: ss(0.82, 0.84) * (1 - ss(0.88, 0.93)) * dark,
    night: ss(0.57, 0.62) * (1 - ss(0.69, 0.74)) * dark,
    closing: ss(0.93, 0.97) * dark,
    light: themeMix,
  };
}
