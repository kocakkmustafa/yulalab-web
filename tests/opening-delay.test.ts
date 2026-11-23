import { describe, expect, it } from "vitest";
import { OPENING_DOLLY_END_SECONDS, OPENING_DURATION_SECONDS, OPENING_LENS_DELAY_SECONDS, openingLinear, openingScale } from "@/components/experience/opening";

describe("W8-5 opening lens delay", () => {
  it("keeps the lens dark until the delay passes and still ends with the opening clock", () => {
    expect(openingLinear(0)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS + 0.1)).toBeGreaterThan(0);
    expect(openingLinear(OPENING_DURATION_SECONDS)).toBe(1);
  });

  it("W8-24: lens starts at 4.8-5.2 s (loader opens at about 3.65 s) and the eased curve settles near 5.8 s", () => {
    const start = 3.65 + OPENING_LENS_DELAY_SECONDS;
    expect(start).toBeGreaterThanOrEqual(4.8);
    expect(start).toBeLessThanOrEqual(5.2);
    const settled = 3.65 + OPENING_LENS_DELAY_SECONDS + 0.65 * (OPENING_DURATION_SECONDS - OPENING_LENS_DELAY_SECONDS);
    expect(Math.abs(settled - 5.8)).toBeLessThanOrEqual(0.2);
  });

  it("W8-39: scene dolly 0.05 -> 1.03 (0.5 s) -> 1.16 (5.6-6.0 s) -> 1.0 (7.0 s), monotone up to the peak", () => {
    const at = (page: number) => openingScale(page - 3.65);
    expect(at(4.0)).toBeCloseTo(0.05, 2);
    expect(at(4.88)).toBeCloseTo(0.05, 2);
    expect(at(5.38)).toBeCloseTo(1.03, 1);
    expect(at(5.6)).toBeGreaterThan(1.1);
    expect(at(6.0)).toBeGreaterThan(1.1);
    expect(Math.max(...Array.from({ length: 400 }, (_, i) => openingScale(i * 0.01)))).toBeLessThanOrEqual(1.165);
    expect(at(7.0)).toBeCloseTo(1, 2);
    expect(openingScale(OPENING_DOLLY_END_SECONDS + 5)).toBe(1);
    for (let t = 1.23; t < 1.97; t += 0.02) expect(openingScale(t + 0.02)).toBeGreaterThanOrEqual(openingScale(t));
  });
});
