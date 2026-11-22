/** Scroll allocation inspired by observed public reference sections, 2026-10-16.
 * Camera/geometry time stays independent so native anchors and history can
 * invert the same continuous mapping without changing the physical poses.
 *
 * W1D-D H1-b: same wheel input, same scrollY (about 1270 px at 8 s). The reference shows the works card there, so the
 * opening (wordmark, glass Y, giant PROJECTS word) is compressed into the first ~980 px (0.045 of the journey).
 */
export const STORYBOARD_DESKTOP = [
  { scene: "hero", scroll: 0, timeline: 0 },
  { scene: "portfolio", scroll: 0.045, timeline: 0.085 },
  { scene: "proof", scroll: 0.334, timeline: 0.505 },
  { scene: "crossing", scroll: 0.395, timeline: 0.575 },
  { scene: "mission", scroll: 0.437, timeline: 0.69 },
  { scene: "vision", scroll: 0.502, timeline: 0.765 },
  { scene: "values", scroll: 0.687, timeline: 0.835 },
  { scene: "closing", scroll: 0.959, timeline: 0.955 },
  { scene: "end", scroll: 1, timeline: 1 },
] as const;

/** W7 Z04: the reference lays the same journey out on a different scroll budget on a phone (390 px measurement). */
export const STORYBOARD_MOBILE = [
  { scene: "hero", scroll: 0, timeline: 0 },
  { scene: "portfolio", scroll: 0.0548, timeline: 0.085 },
  { scene: "proof", scroll: 0.398, timeline: 0.505 },
  { scene: "crossing", scroll: 0.4715, timeline: 0.575 },
  { scene: "mission", scroll: 0.5058, timeline: 0.69 },
  { scene: "vision", scroll: 0.5549, timeline: 0.765 },
  // W7 Z04: the dark return (timeline ~0.799) lands ~700 px earlier on a phone.
  { scene: "dark-return", scroll: 0.5825, timeline: 0.799 },
  { scene: "values", scroll: 0.696, timeline: 0.835 },
  { scene: "closing", scroll: 0.946, timeline: 0.955 },
  { scene: "end", scroll: 1, timeline: 1 },
] as const;

export type StoryboardMode = "desktop" | "mobile";

function mapProgress(value: number, from: "scroll" | "timeline", to: "scroll" | "timeline", mode: StoryboardMode): number {
  const STORYBOARD = mode === "mobile" ? STORYBOARD_MOBILE : STORYBOARD_DESKTOP;
  const safe = Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));
  for (let i = 1; i < STORYBOARD.length; i += 1) {
    const end = STORYBOARD[i];
    if (safe <= end[from]) {
      const start = STORYBOARD[i - 1];
      return start[to] + (end[to] - start[to]) * (safe - start[from]) / (end[from] - start[from]);
    }
  }
  return 1;
}

export const STORYBOARD = STORYBOARD_DESKTOP;
export const timelineProgressForScroll = (scroll: number, mode: StoryboardMode = "desktop") => mapProgress(scroll, "scroll", "timeline", mode);
export const scrollProgressForTimeline = (timeline: number, mode: StoryboardMode = "desktop") => mapProgress(timeline, "timeline", "scroll", mode);
