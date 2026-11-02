import { describe, expect, it } from "vitest";
import { evaluateTimeline, STAGES } from "@/components/experience/timeline";

describe("hero glyph spin", () => {
  it("turns the glyph once over the hero and hands off without a jump", () => {
    const start = evaluateTimeline(0, "desktop").glyph.rotation[1];
    const middle = evaluateTimeline(STAGES.hero[1] / 2, "desktop").glyph.rotation[1];
    expect(middle - start).toBeGreaterThan(Math.PI * 0.9);

    const before = evaluateTimeline(STAGES.hero[1] - 1e-6, "desktop").glyph.rotation[1];
    const after = evaluateTimeline(STAGES.hero[1], "desktop").glyph.rotation[1];
    expect(Math.abs(before - Math.PI * 2 - after)).toBeLessThan(1e-3);
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
