import { describe, expect, it } from "vitest";
import { OPENING_DURATION_SECONDS, OPENING_LENS_DELAY_SECONDS, openingLinear } from "@/components/experience/opening";

describe("W8-5 opening lens delay", () => {
  it("keeps the lens dark until the delay passes and still ends with the opening clock", () => {
    expect(openingLinear(0)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS + 0.1)).toBeGreaterThan(0);
    expect(openingLinear(OPENING_DURATION_SECONDS)).toBe(1);
  });

  it("W8-24: lens starts at 4.8-5.2 s (loader opens at about 3.83 s) and the eased curve settles near 5.8 s", () => {
    const start = 3.83 + OPENING_LENS_DELAY_SECONDS;
    expect(start).toBeGreaterThanOrEqual(4.8);
    expect(start).toBeLessThanOrEqual(5.2);
    const settled = 3.83 + OPENING_LENS_DELAY_SECONDS + 0.436 * (OPENING_DURATION_SECONDS - OPENING_LENS_DELAY_SECONDS);
    expect(Math.abs(settled - 5.8)).toBeLessThanOrEqual(0.2);
  });
});
