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

/**
 * W8 (decision "a"): one switch for the glass Y's size and place. "slot" (default, W7 CY5) keeps it as the first letter of
 * [Y]ULA. "ref" (`?cam=ref`) frees it into the middle of the screen at the closer, larger composition of the reference's
 * glass monogram so both can be judged side by side. Read once per page load; it never changes while the page is open.
 */
export const HERO_GLASS_MODE: "slot" | "ref" = (() => {
  if (typeof window === "undefined") return "slot";
  return new URLSearchParams(window.location.search).get("cam") === "ref" ? "ref" : "slot";
})();
