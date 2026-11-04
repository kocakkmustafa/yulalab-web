/**
 * Route contract for the persistent scene (alche reference §2.8). The WebGL
 * world lives in the locale layout; each route only decides how strongly it
 * shows through. Pure so the route table is testable without a renderer.
 */
export type SceneTone = "journey" | "page" | "quiet";

// Legal, account-deletion and data-request routes stay calm and readable:
// the scene is frozen and veiled almost to the page colour, and a visit that
// starts on one of these routes never downloads the 3D bundle at all.
const QUIET_ROUTES = [
  "/privacy",
  "/terms",
  "/delete-account",
  "/data-request",
  "/motion/consent",
] as const;

/** `pathname` is locale-free (next-intl `usePathname`). */
export function sceneToneForPath(pathname: string): Exclude<SceneTone, "journey"> {
  const path = pathname.replace(/\/+$/, "") || "/";
  return QUIET_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))
    ? "quiet"
    : "page";
}

/**
 * Timeline pose shown behind content pages: the opening pose, the glass Y in
 * front of the LED wall. It is the world's most recognisable frame, so a page
 * reads as the same place as the journey; the veil keeps copy legible.
 */
export const SCENE_BACKDROP_PROGRESS = 0;

/** Camera travel between the journey position and the backdrop pose. */
export const SCENE_TRANSITION_MS = 1_100;

export function easeSceneTransition(value: number): number {
  const t = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));
  // easeInOutCubic: the camera leaves gently and settles without overshoot.
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function interpolateSceneProgress(from: number, to: number, elapsedMs: number): number {
  return from + (to - from) * easeSceneTransition(elapsedMs / SCENE_TRANSITION_MS);
}

/**
 * When a visit that starts on a content page loads the renderer. Phones and
 * constrained hardware wait for the first gesture; the cost of compiling the
 * scene right after load (measured ~600 ms of blocking time on a mobile
 * product page) is only paid by a visitor who engages with the page.
 */
export type BackdropLoadPolicy = "after-load" | "first-gesture";

export function backdropLoadPolicy(input: { tier: "high" | "medium" | "low"; mobile: boolean }): BackdropLoadPolicy {
  return input.mobile || input.tier === "low" ? "first-gesture" : "after-load";
}
