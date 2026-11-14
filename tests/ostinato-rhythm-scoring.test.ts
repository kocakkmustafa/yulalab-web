import { describe, expect, it } from "vitest";
import { GOOD_MS, PERFECT_MS, nearestBeat, rateDeviation, scoreRound } from "../src/components/projects/ostinato-rhythm-scoring";

describe("rateDeviation boundaries (WEB-P1-02)", () => {
  it("uses inclusive thresholds, sign-agnostic", () => {
    expect(rateDeviation(0)).toBe("perfect");
    expect(rateDeviation(PERFECT_MS)).toBe("perfect");
    expect(rateDeviation(-PERFECT_MS)).toBe("perfect");
    expect(rateDeviation(PERFECT_MS + 1)).toBe("good");
    expect(rateDeviation(-(PERFECT_MS + 1))).toBe("good");
    expect(rateDeviation(GOOD_MS)).toBe("good");
    expect(rateDeviation(-GOOD_MS)).toBe("good");
    expect(rateDeviation(GOOD_MS + 1)).toBe("miss");
    expect(rateDeviation(-(GOOD_MS + 1))).toBe("miss");
  });
  it("treats non-finite input as a miss", () => {
    expect(rateDeviation(Number.NaN)).toBe("miss");
    expect(rateDeviation(Infinity)).toBe("miss");
  });
});

describe("nearestBeat", () => {
  const beats = [1000, 1700, 2400];
  it("returns signed deviation (negative = early)", () => {
    expect(nearestBeat(1650, beats)).toEqual({ index: 1, deviationMs: -50 });
    expect(nearestBeat(1730, beats)).toEqual({ index: 1, deviationMs: 30 });
  });
  it("is null with no beats and picks the first on an exact tie", () => {
    expect(nearestBeat(5, [])).toBeNull();
    expect(nearestBeat(1350, beats)?.index).toBe(0);
  });
});

describe("scoreRound", () => {
  const beats = [1000, 1700, 2400, 3100];
  it("scores 100% for taps on every beat", () => {
    const r = scoreRound(beats, beats);
    expect(r).toMatchObject({ perfect: 4, good: 0, miss: 0, accuracyPct: 100 });
  });
  it("counts good as half a point and no tap as missed", () => {
    // beat0 perfect (+10), beat1 good (+100), beat2 missed (+300 -> nearest is beat2? 2700 is nearest to 2400/3100 tie) , beat3 untouched
    const r = scoreRound([1010, 1800], beats);
    expect(r.perBeat.map((b) => b.rating)).toEqual(["perfect", "good", "miss", "miss"]);
    expect(r).toMatchObject({ perfect: 1, good: 1, miss: 2, accuracyPct: 38 }); // 1.5 / 4 = 37.5 -> 38
  });
  it("keeps the closest tap per beat and ignores extras", () => {
    const r = scoreRound([1100, 1010, 995], beats);
    expect(r.perBeat[0]).toEqual({ rating: "perfect", deviationMs: -5 });
    expect(r.perfect).toBe(1);
  });
  it("is 0% with no taps and with no beats", () => {
    expect(scoreRound([], beats).accuracyPct).toBe(0);
    expect(scoreRound([1000], []).accuracyPct).toBe(0);
  });
});
