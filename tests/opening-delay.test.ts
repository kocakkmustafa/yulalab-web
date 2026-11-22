import { describe, expect, it } from "vitest";
import { OPENING_DURATION_SECONDS, OPENING_LENS_DELAY_SECONDS, openingLinear } from "@/components/experience/opening";

describe("W8-5 opening lens delay", () => {
  it("keeps the lens dark until the delay passes and still ends with the opening clock", () => {
    expect(openingLinear(0)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS)).toBe(0);
    expect(openingLinear(OPENING_LENS_DELAY_SECONDS + 0.1)).toBeGreaterThan(0);
    expect(openingLinear(OPENING_DURATION_SECONDS)).toBe(1);
  });

  it("starts after the 4.0 s capture frame (loader opens at about 3.83 s)", () => {
    expect(3.83 + OPENING_LENS_DELAY_SECONDS).toBeGreaterThan(4.1);
    expect(OPENING_LENS_DELAY_SECONDS).toBeLessThan(0.4);
  });
});
