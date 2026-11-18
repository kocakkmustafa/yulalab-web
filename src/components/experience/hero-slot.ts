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
