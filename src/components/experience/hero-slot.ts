/**
 * W1D: the opening word reads "[Y]ULA" where the glass Y stands in for the first letter. The wordmark
 * texture leaves that slot empty and records where it is (fractions of the plane), so the glass Y can
 * be placed there at the cap height of "ULA" without a second, white Y.
 */
export type HeroSlot = {
  /** Slot centre, fraction of the plane width from its centre (-0.5..0.5). */
  x: number;
  /** Cap-height centre, fraction of the plane height above its centre. */
  y: number;
  /** Cap height as a fraction of the plane height. */
  cap: number;
};

/** Plane the wordmark texture is mapped on (world units), see GridRoom. */
export const HERO_PLANE_HEIGHT = 5.2;
export const HERO_PLANE_Z = -1.25;

export const heroSlot: HeroSlot = { x: -0.31, y: 0.02, cap: 0.47 };

export type HeroCamMode = "slot" | "ref";

/**
 * W8 (a): single source of truth for the hero glass Y placement and size.
 * Default `slot` preserves W7 CY5 (single initial in the wordmark slot);
 * `?cam=ref` switches to the reference centre-stage composition (~66% viewport height).
 */
export const HERO_CAM_CONFIG = {
  slot: {
    skipFirstLetter: true,
    capScale: 0.95,
  },
  ref: {
    skipFirstLetter: false,
    viewportHeightRatio: 0.66,
    desktopOffsetY: -0.18,
    mobileOffsetY: 0.12,
  },
} as const;

export function resolveHeroCamMode(search?: string): HeroCamMode {
  const raw = search ?? (typeof window !== "undefined" ? window.location.search : "");
  if (!raw) return "slot";
  try {
    return new URLSearchParams(raw).get("cam") === "ref" ? "ref" : "slot";
  } catch {
    return "slot";
  }
}

/**
 * W8 C8: uniform wordmark plane scale so narrow/mobile viewports fit edge-to-edge (~94% viewport width)
 * without horizontally squeezing the glyphs or the glass Y.
 */
export function heroWordmarkPlaneScale(
  viewportWidth: number,
  viewportHeight: number,
  mobileMix: number,
): number {
  const aspect = Math.max(0.3, viewportWidth / Math.max(1, viewportHeight));
  const camZ = 11.5 + (13.8 - 11.5) * mobileMix;
  const fov = 39 + (52 - 39) * mobileMix;
  const dist = camZ - HERO_PLANE_Z;
  const frustumWidth = 2 * dist * Math.tan((fov * Math.PI) / 360) * aspect;
  // "YULA" glyphs span ~81% of the 2:1 texture width; x1.16 brings the rendered letters to ~94% of mobile width (~366 CSS px).
  return Math.min(1, (frustumWidth * 1.16) / 14.2);
}
