import { describe, expect, it } from "vitest";
import { evaluateTimeline, STAGES } from "@/components/experience/timeline";

describe("hero glyph spin", () => {
  it("keeps the timeline rotation free of a position-based spin (W7 CY4: the turn follows scroll velocity)", () => {
    const start = evaluateTimeline(0, "desktop").glyph.rotation[1];
    const middle = evaluateTimeline(STAGES.hero[1] / 2, "desktop").glyph.rotation[1];
    expect(Math.abs(middle - start)).toBeLessThan(0.5);

    const before = evaluateTimeline(STAGES.hero[1] - 1e-6, "desktop").glyph.rotation[1];
    const after = evaluateTimeline(STAGES.hero[1], "desktop").glyph.rotation[1];
    expect(Math.abs(before - after)).toBeLessThan(1e-3);
  });

  it("moves the glyph through the hero without depth jumps while it turns", () => {
    for (const mode of ["desktop", "mobile"] as const) {
      let previous = evaluateTimeline(0, mode).glyph.position;
      for (let step = 1; step <= 90; step += 1) {
        const position = evaluateTimeline(step / 1000, mode).glyph.position;
        expect(Math.abs(position[2] - previous[2])).toBeLessThan(0.08);
        previous = position;
      }
    }
  });
});
