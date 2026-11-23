import { describe, expect, it } from "vitest";
import { GLASS_PARAMS } from "@/components/experience/RefractGlass";
import { LOADER_TEXT_CHAR_MS, LOADER_TEXT_DELAY_MS, openingSigmoid, resolveLoaderChars } from "@/components/experience/loader";
import { dwellFloat } from "@/components/experience/timeline";
import { evaluateTimeline } from "@/components/experience/timeline";
import { stageWordFrame } from "@/components/experience/instruments";
import { timelineProgressForScroll } from "@/components/experience/storyboard";
import { heroWordmarkWidth, HERO_PLANE_Z } from "@/components/experience/hero-slot";

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

describe("W8 opening loader text and curve", () => {
  it("resolves loader characters at 40 ms per character after a 300 ms delay", () => {
    expect(LOADER_TEXT_DELAY_MS).toBe(300);
    expect(LOADER_TEXT_CHAR_MS).toBe(40);
    expect(resolveLoaderChars("Yula", 200).every((item) => item.opacity === 0)).toBe(true);
    const mid = resolveLoaderChars("Yula", 360);
    expect(mid[0]).toEqual({ char: "Y", opacity: 1 });
    expect(mid[2].opacity).toBe(0.3);
    const done = resolveLoaderChars("Yula", 600);
    expect(done.map((item) => item.char).join("")).toBe("Yula");
  });
  it("normalises the opening sigmoid to 0..1", () => {
    expect(openingSigmoid(0)).toBeCloseTo(0, 6);
    expect(openingSigmoid(1)).toBeCloseTo(1, 6);
    expect(openingSigmoid(0.5)).toBeCloseTo(0.5, 6);
  });
});

describe("W1D-D opening sequence", () => {
  it.each([[390, 844], [320, 900]])("fits the whole wordmark in a %i by %i phone frustum", (width, height) => {
    const visibleWidth = 2 * (13.8 - HERO_PLANE_Z) * Math.tan(26 * Math.PI / 180) * width / height;
    // W8-36: the plane is 1.18x the screen; the baked word fills 82 percent of it (94 percent of the screen).
    const wordWidth = heroWordmarkWidth(1, width / height) * 0.82;
    expect(wordWidth).toBeLessThan(visibleWidth);
    expect(wordWidth).toBeGreaterThan(visibleWidth * 0.9);
  });
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
