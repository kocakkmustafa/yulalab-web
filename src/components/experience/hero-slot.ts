import { WORDMARK_CAP } from "./wordmark-sdf-meta";

/**
 * W8-30/31: the opening word is the whole white "YULA"; the glass Y is a separate object standing in the middle
 * of the screen in front of it. This records the cap height of the baked letters (fractions of the plane) that the
 * glass Y's size is derived from.
 */
export type HeroSlot = {
  /** Reference centre, fraction of the plane width from its centre (the glass Y is centred, so 0). */
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
export const heroSlot: HeroSlot = { x: 0, ...WORDMARK_CAP };

/** W8-17: phones keep the letters' proportions (U width/height about 0.7, was 0.5 on a 1.25:1 plane). */
const MOBILE_PLANE_ASPECT = 1.9;

/** Plane height: desktop keeps 5.2; phones shrink it so the squeezed word is no longer tall and narrow. */
export function heroWordmarkHeight(mobileMix: number, aspect: number): number {
  const mobileHeight = Math.min(HERO_PLANE_HEIGHT, heroWordmarkWidth(1, aspect) / MOBILE_PLANE_ASPECT);
  return HERO_PLANE_HEIGHT * (1 - mobileMix) + mobileHeight * mobileMix;
}
