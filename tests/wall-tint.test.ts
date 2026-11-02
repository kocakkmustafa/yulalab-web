import { describe, expect, it } from "vitest";
import { resolveWallTint, WALL_TINTS } from "@/components/experience/theme";

describe("resolveWallTint", () => {
  it("keeps the hero and gallery in neutral light", () => {
    for (const progress of [0, 0.085, 0.3, 0.45]) {
      expect(resolveWallTint(progress)).toEqual([...WALL_TINTS.neutral]);
    }
  });

  it("leaves the gallery in petrol and reaches night blue before the blade", () => {
    const petrol = resolveWallTint(0.52);
    WALL_TINTS.petrol.forEach((value, channel) => expect(petrol[channel]).toBeCloseTo(value, 6));
    const night = resolveWallTint(0.58);
    WALL_TINTS.night.forEach((value, channel) => expect(night[channel]).toBeCloseTo(value, 6));
  });

  it("returns to neutral once the white room has taken over", () => {
    for (const progress of [0.66, 0.8, 1]) {
      expect(resolveWallTint(progress)).toEqual([...WALL_TINTS.neutral]);
    }
  });

  it("changes continuously in both scroll directions", () => {
    let previous = resolveWallTint(0.44);
    for (let step = 1; step <= 240; step += 1) {
      const current = resolveWallTint(0.44 + step * 0.001);
      current.forEach((value, channel) => expect(Math.abs(value - previous[channel])).toBeLessThan(0.05));
      previous = current;
    }
  });
});
