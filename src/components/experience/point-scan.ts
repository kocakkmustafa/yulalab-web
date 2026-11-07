import type { QualityTier } from "./types";

/** Journey progress over which the last value panel is scanned in. */
export const POINT_SCAN_WINDOW = [0.922, 0.95] as const;

/**
 * The last value panel ("science") is shown as a scan: it flies in as a
 * scattered point cloud, a scan front rebuilds it left to right, and the flat
 * image only comes back faintly under the cloud, so the section reads as a
 * point-cloud capture of our own evidence screen.
 *
 * A pure function of journey progress, so capture frames are exact.
 */
export function pointScanState(progress: number) {
  const [start, end] = POINT_SCAN_WINDOW;
  const p = Number.isFinite(progress) ? progress : 0;
  const assemble = smooth((p - start) / (end - start));
  const settle = smooth((assemble - 0.8) / 0.2);
  const arrive = smooth((p - (start - 0.008)) / 0.014);
  return {
    /** 0 = scattered, 1 = every point rebuilt on the panel. */
    assemble,
    /** Scan front position across the panel, from just before 0 to just past 1. */
    front: assemble * 1.3 - 0.15,
    pointOpacity: arrive * (1 - settle * 0.3),
    /** Multiplier for the flat media image: faint while scanning, half once rebuilt. */
    imageMix: 0.1 + settle * 0.45,
  };
}

/** Columns × rows of the cloud per quality tier; phones use the tier they get. */
export function pointScanGrid(tier: QualityTier): readonly [number, number] {
  return tier === "high" ? [176, 112] : tier === "medium" ? [128, 82] : [80, 52];
}

function smooth(value: number) {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
}
