import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scrambleFrame, scramblePool } from "../src/lib/scramble";
import { stageWordFrame } from "../src/components/experience/instruments";
import { holoRibbonState } from "../src/components/experience/HoloRibbon";
import { evaluateTimeline } from "../src/components/experience/timeline";
import { POINT_SCAN_WINDOW, pointScanGrid, pointScanState } from "../src/components/experience/point-scan";
import { gizmoBalls } from "../src/components/experience/ExperienceInstruments";

const css = readFileSync("src/app/globals.css", "utf8");
const parity = css.slice(css.indexOf("Motion parity with the reference"));
const reduced = parity.slice(parity.lastIndexOf("@media (prefers-reduced-motion: reduce)"));

describe("scramble decode", () => {
  it("resolves to the exact text at the end and keeps whitespace in place", () => {
    const text = "ÜRÜN KAYDI HAZIRLANIYOR";
    expect(scrambleFrame(text, 1, 9)).toBe(text);
    for (const progress of [0, 0.3, 0.6, 0.9]) {
      const frame = scrambleFrame(text, progress, 4);
      expect(Array.from(frame)).toHaveLength(Array.from(text).length);
      Array.from(text).forEach((glyph, index) => {
        if (/\s/u.test(glyph)) expect(Array.from(frame)[index]).toBe(glyph);
      });
    }
  });

  it("draws stand-ins only from the text's own glyphs (script stays the same)", () => {
    const arabic = "مختبر يولا";
    const pool = scramblePool(arabic);
    for (const glyph of Array.from(scrambleFrame(arabic, 0, 3))) {
      if (glyph !== " ") expect(pool).toContain(glyph);
    }
  });

  it("resolves left to right and is deterministic per tick", () => {
    const text = "MEKANSAL EKSENLER";
    expect(scrambleFrame(text, 0.5, 2)).toBe(scrambleFrame(text, 0.5, 2));
    const half = Array.from(scrambleFrame(text, 0.5, 2));
    expect(half.slice(0, 3).join("")).toBe("MEK");
    expect(scrambleFrame(text, Number.NaN, 0)).toBe(text);
    expect(scrambleFrame("AA", 0, 0)).toBe("AA");
  });
});

describe("motion parity CSS", () => {
  it("keeps the slot copy out of the accessible name", () => {
    expect(parity).toContain('content: attr(data-slot) / "";');
    expect(parity).toMatch(/@media \(hover: hover\)\s*{\s*:is\(a, button\):hover \.slot/);
  });

  it("mirrors the title wipe and the menu entrance for right-to-left pages", () => {
    expect(parity).toContain('html[data-client-nav="true"][dir="rtl"] .page-enter h1');
    expect(parity).toContain('[dir="rtl"] .mm-item');
  });

  it("never holds back a first paint: title wipe after client navigation, header moves only", () => {
    expect(parity).toMatch(/html\[data-client-nav="true"\] \.page-enter h1 {\s*-webkit-mask-image/);
    expect(parity).not.toMatch(/(^|\n)\.page-enter h1 {\s*-webkit-mask-image/);
    const header = parity.slice(parity.indexOf("@keyframes siteHeaderIn"), parity.indexOf("@keyframes siteHeaderIn") + 120);
    expect(header).not.toContain("opacity");
  });

  it("gates scroll-driven effects on support", () => {
    expect(parity).toMatch(/@supports \(animation-timeline: scroll\(\)\)\s*{\s*\.scroll-marquee-scroll/);
    expect(parity).toMatch(/@supports \(animation-timeline: view\(\)\)\s*{\s*\.media-in/);
  });

  it("resolves every new effect to its end state under reduced motion", () => {
    for (const selector of [".slot > span", ".mm-item", ".footer-wordmark text", ".page-enter h1", ".scroll-marquee-track", ".media-in"]) {
      expect(reduced).toContain(selector);
    }
    expect(reduced).toContain("stroke-dashoffset: 0 !important");
    expect(reduced).toContain("mask-image: none");
  });
});


describe("journey stage word and vision ribbon", () => {
  it("shows the stage word only where the stage leaves room for it", () => {
    expect(stageWordFrame(evaluateTimeline(0.02, "desktop"))).toBeNull();
    expect(stageWordFrame(evaluateTimeline(0.125, "desktop"))?.label).toBe("works");
    expect(stageWordFrame(evaluateTimeline(0.3, "desktop"))).toBeNull();
    expect(stageWordFrame(evaluateTimeline(0.8, "mobile"))?.label).toBe("vision");
    expect(stageWordFrame(evaluateTimeline(0.62, "desktop"))).toBeNull();
  });

  it("drifts monotonically with the stage", () => {
    const a = stageWordFrame(evaluateTimeline(0.775, "desktop"))!;
    const b = stageWordFrame(evaluateTimeline(0.82, "desktop"))!;
    expect(b.shift).toBeLessThan(a.shift);
    expect(Math.abs(a.shift)).toBeLessThanOrEqual(0.5);
  });

  it("keeps the ribbon inside the vision stage", () => {
    expect(holoRibbonState(evaluateTimeline(0.7, "desktop")).opacity).toBe(0);
    expect(holoRibbonState(evaluateTimeline(0.8, "desktop")).opacity).toBe(1);
    expect(holoRibbonState(evaluateTimeline(0.9, "desktop")).opacity).toBe(0);
  });
});

describe("point-cloud scan of the science panel", () => {
  const [start, end] = POINT_SCAN_WINDOW;

  it("stays hidden before the window, rebuilds across it and keeps a faint cloud after", () => {
    expect(pointScanState(start - 0.02).pointOpacity).toBe(0);
    const mid = pointScanState((start + end) / 2);
    expect(mid.assemble).toBeGreaterThan(0.3);
    expect(mid.assemble).toBeLessThan(0.7);
    expect(mid.pointOpacity).toBeGreaterThan(0.9);
    const done = pointScanState(end + 0.01);
    expect(done.assemble).toBe(1);
    expect(done.front).toBeGreaterThan(1);
    expect(done.pointOpacity).toBeCloseTo(0.7, 5);
    expect(done.imageMix).toBeCloseTo(0.55, 5);
  });

  it("moves the scan front forward only, and is safe for bad input", () => {
    let last = -Infinity;
    for (let p = start; p <= end; p += 0.002) {
      const { front } = pointScanState(p);
      expect(front).toBeGreaterThanOrEqual(last);
      last = front;
    }
    expect(pointScanState(Number.NaN).pointOpacity).toBe(0);
  });

  it("sizes the cloud by quality tier", () => {
    const counts = (["high", "medium", "low"] as const).map((tier) => pointScanGrid(tier)[0] * pointScanGrid(tier)[1]);
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[0]).toBeLessThanOrEqual(20000);
  });
});

describe("HUD gizmo balls", () => {
  it("draws six balls, lettered positive axes and grey negatives opposite them, far ones first", () => {
    const balls = gizmoBalls([0.2, -0.4, 0]);
    expect(balls.map((ball) => ball.label).sort()).toEqual(["-X", "-Y", "-Z", "X", "Y", "Z"]);
    for (const axis of ["X", "Y", "Z"]) {
      const positive = balls.find((ball) => ball.label === axis)!;
      const negative = balls.find((ball) => ball.label === `-${axis}`)!;
      expect(positive.color).toBeTruthy();
      expect(negative.color).toBeNull();
      expect(negative.x).toBeCloseTo(-positive.x, 6);
      expect(negative.y).toBeCloseTo(-positive.y, 6);
    }
    const depths = balls.map((ball) => ball.depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
  });
});

describe("image parallax", () => {
  it("is scroll-driven, gated on support, and composes with the hover zoom", () => {
    const block = parity.slice(parity.indexOf(".media-parallax"), parity.indexOf("@keyframes mediaIn"));
    expect(parity.slice(0, parity.indexOf(".media-parallax"))).toContain("@supports (animation-timeline: view())");
    expect(block).toMatch(/animation-timeline:\s*view\(\)/);
    expect(block).toMatch(/translate:\s*0 -5%/);
    expect(block).toMatch(/\.group:hover \.media-parallax\s*{\s*scale:\s*1\.155/);
    expect(reduced).toMatch(/\.media-parallax\s*{\s*scale:\s*none/);
  });

  it("keeps the card and frame out of the scroll-container chain", () => {
    const card = readFileSync("src/components/landing/ProjectCard.tsx", "utf8");
    expect(card).toContain("media-in relative aspect-[16/10] overflow-clip");
    expect(card).toMatch(/group block rounded-3xl overflow-clip/);
    expect(card).toContain("media-parallax object-cover");
  });
});
