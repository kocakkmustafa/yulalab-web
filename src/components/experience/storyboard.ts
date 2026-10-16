/** Scroll allocation inspired by observed public reference sections, 2026-10-16.
 * Camera/geometry time stays independent so native anchors and history can
 * invert the same continuous mapping without changing the physical poses.
 */
export const STORYBOARD = [
  { scene: "hero", scroll: 0, timeline: 0 },
  { scene: "portfolio", scroll: 0.087, timeline: 0.085 },
  { scene: "proof", scroll: 0.334, timeline: 0.505 },
  { scene: "crossing", scroll: 0.395, timeline: 0.575 },
  { scene: "mission", scroll: 0.437, timeline: 0.69 },
  { scene: "vision", scroll: 0.502, timeline: 0.765 },
  { scene: "values", scroll: 0.687, timeline: 0.835 },
  { scene: "closing", scroll: 0.959, timeline: 0.955 },
  { scene: "end", scroll: 1, timeline: 1 },
] as const;

function mapProgress(value: number, from: "scroll" | "timeline", to: "scroll" | "timeline"): number {
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

export const timelineProgressForScroll = (scroll: number) => mapProgress(scroll, "scroll", "timeline");
export const scrollProgressForTimeline = (timeline: number) => mapProgress(timeline, "timeline", "scroll");
