import { WORDMARK_SLOT } from "./wordmark-sdf-meta";

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

/** Shared by the texture and its glass initial so the complete word fits phones. */
export function heroWordmarkWidth(mobileMix: number, aspect: number): number {
  // Mobile camera: 52 degree vertical FOV, 13.8 camera Z, -1.25 plane Z.
  const visibleWidth = 2 * (13.8 - HERO_PLANE_Z) * Math.tan(26 * Math.PI / 180) * Math.max(0, aspect);
  const mobileWidth = Math.min(14.2, visibleWidth * 0.96);
  return 14.2 * (1 - mobileMix) + mobileWidth * mobileMix;
}

/** Baked together with the SDF texture (scripts/build-wordmark-sdf.py). */
export const heroSlot: HeroSlot = { ...WORDMARK_SLOT };
