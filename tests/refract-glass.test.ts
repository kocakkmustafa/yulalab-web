import { describe, expect, it } from "vitest";
import { GLASS_PARAMS } from "@/components/experience/RefractGlass";
import { HERO_CAM_CONFIG, heroWordmarkPlaneScale, resolveHeroCamMode } from "@/components/experience/hero-slot";
import { LOADER_TEXT_CHAR_MS, LOADER_TEXT_DELAY_MS, resolveLoaderChars } from "@/components/experience/loader";
import { dwellFloat } from "@/components/experience/timeline";
import { evaluateTimeline } from "@/components/experience/timeline";
import { stageWordFrame } from "@/components/experience/instruments";
import { timelineProgressForScroll } from "@/components/experience/storyboard";

describe("W1D-D / W8 glass material (REA section 3)", () => {
  it("keeps the measured refraction values and 512x512 background copy", () => {
    expect(GLASS_PARAMS.refractPower).toBe(0.1);
    expect([...GLASS_PARAMS.slide]).toEqual([1, 2, 4]);
    expect(GLASS_PARAMS.roughness).toBe(0.1);
    expect(GLASS_PARAMS.f0).toBe(0.1);
    expect(GLASS_PARAMS.output).toBe(1.2);
    expect(GLASS_PARAMS.samples).toBe(8);
    expect(GLASS_PARAMS.backdropSize).toBe(512);
  });

  it("supports default slot mode and ?cam=ref centre mode", () => {
    expect(resolveHeroCamMode("")).toBe("slot");
    expect(resolveHeroCamMode("?cam=slot")).toBe("slot");
    expect(resolveHeroCamMode("?cam=ref")).toBe("ref");
    expect(HERO_CAM_CONFIG.slot.skipFirstLetter).toBe(true);
    expect(HERO_CAM_CONFIG.ref.skipFirstLetter).toBe(false);
    expect(HERO_CAM_CONFIG.ref.viewportHeightRatio).toBeGreaterThanOrEqual(0.6);
    expect(HERO_CAM_CONFIG.ref.viewportHeightRatio).toBeLessThanOrEqual(0.7);
  });

  it("fits mobile wordmark edge-to-edge without squeezing desktop", () => {
    expect(heroWordmarkPlaneScale(1440, 900, 0)).toBe(1);
    const mobileScale = heroWordmarkPlaneScale(390, 844, 1);
    expect(mobileScale).toBeGreaterThan(0.45);
    expect(mobileScale).toBeLessThan(0.55);
  });

  it("resolves loader characters at 40 ms per character after a 300 ms delay", () => {
    expect(LOADER_TEXT_DELAY_MS).toBe(300);
    expect(LOADER_TEXT_CHAR_MS).toBe(40);
    const hidden = resolveLoaderChars("Yula", 200);
    expect(hidden.every((item) => item.opacity === 0)).toBe(true);
    const mid = resolveLoaderChars("Yula", 360);
    expect(mid[0]).toEqual({ char: "Y", opacity: 1 });
    expect(mid[1]).toEqual({ char: "u", opacity: 1 });
    expect(mid[2].opacity).toBe(0.3);
    const done = resolveLoaderChars("Yula", 600);
    expect(done.map((item) => item.char).join("")).toBe("Yula");
    expect(done.every((item) => item.opacity === 1)).toBe(true);
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
