import { describe, expect, it } from "vitest";
import { GLASS_PARAMS } from "@/components/experience/RefractGlass";
import { dwellFloat } from "@/components/experience/timeline";
import { evaluateTimeline } from "@/components/experience/timeline";
import { stageWordFrame } from "@/components/experience/instruments";
import { timelineProgressForScroll } from "@/components/experience/storyboard";

describe("W1D-D glass material (REA section 3)", () => {
  it("keeps the measured refraction values", () => {
    expect(GLASS_PARAMS.refractPower).toBe(0.1);
    expect([...GLASS_PARAMS.slide]).toEqual([1, 2, 4]);
    expect(GLASS_PARAMS.roughness).toBe(0.1);
    expect(GLASS_PARAMS.f0).toBe(0.1);
    expect(GLASS_PARAMS.output).toBe(1.2);
    expect(GLASS_PARAMS.samples).toBe(8);
  });
});

describe("W1D-D opening sequence", () => {
  it("dissolves the wordmark before the PROJECTS word and the portfolio card", () => {
    const early = evaluateTimeline(0.002, "desktop");
    const mid = evaluateTimeline(0.045, "desktop");
    const portfolio = evaluateTimeline(0.1, "desktop");
    expect(early.world.wordmarkOpacity).toBeGreaterThan(0.95);
    expect(mid.world.wordmarkOpacity).toBe(0);
    expect(portfolio.world.wordmarkOpacity).toBe(0);
    expect(stageWordFrame(mid)?.label).toBe("works");
    expect(stageWordFrame(portfolio)?.label).toBe("works");
  });

  it("reaches the first portfolio card within the first thousand pixels of a 900px viewport", () => {
    const range = 21780;
    expect(timelineProgressForScroll(1000 / range)).toBeGreaterThanOrEqual(0.085);
    expect(dwellFloat(0)).toBe(0);
  });
});
