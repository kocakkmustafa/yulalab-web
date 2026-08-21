import type { QualityTier } from "./types";

export type QualitySettings = {
  dpr: number | [number, number];
  shadows: "basic" | false;
};

/**
 * Canvas-level settings that React Three Fiber can update without rebuilding
 * the WebGL renderer. Geometry and material detail remain local to the scene
 * components that actually consume those values.
 */
export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    dpr: [1, 2],
    shadows: "basic",
  },
  medium: {
    dpr: [1, 1.5],
    shadows: false,
  },
  low: {
    dpr: 1,
    shadows: false,
  },
};

export function downgradeTier(tier: QualityTier): QualityTier {
  if (tier === "high") return "medium";
  return "low";
}

export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;

  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function detectInitialTier(): QualityTier {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "low";
  if (!supportsWebGL() || prefersReducedMotion()) return "low";

  const dpr = finitePositive(window.devicePixelRatio) ?? 1;
  const width = finitePositive(window.innerWidth) ?? 0;
  const height = finitePositive(window.innerHeight) ?? 0;
  const viewportArea = width * height;
  const renderedPixelArea = viewportArea * dpr * dpr;
  const cores = finitePositive(navigator.hardwareConcurrency);
  const memory = finitePositive((navigator as NavigatorWithDeviceMemory).deviceMemory);

  const constrainedHardware =
    (cores !== null && cores <= 4) || (memory !== null && memory <= 4);
  const constrainedDisplay = dpr > 3 || renderedPixelArea > 8_000_000;

  if (constrainedHardware || constrainedDisplay) return "low";

  const capableHardware =
    (cores === null || cores >= 8) && (memory === null || memory >= 8);
  const capableDisplay = viewportArea >= 1_000_000 && dpr <= 2;

  return capableHardware && capableDisplay ? "high" : "medium";
}
