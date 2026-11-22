import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { heroSlot } from "../src/components/experience/hero-slot";
import { WORDMARK_SDF_SIZE, WORDMARK_SLOT } from "../src/components/experience/wordmark-sdf-meta";

const SDF_PATH = path.join(process.cwd(), "public/experience/yula-wordmark-sdf.bin");

describe("W8-14 YULA wordmark SDF", () => {
  it("is a single-channel R8 field of the declared size and within the 4 MB texture budget", () => {
    const bytes = statSync(SDF_PATH).size;
    expect(bytes).toBe(WORDMARK_SDF_SIZE.width * WORDMARK_SDF_SIZE.height);
    expect(bytes).toBeLessThanOrEqual(4 * 1024 * 1024);
  });

  it("has inside (>0.5), outside (<0.5) and a soft edge band, with an empty Y slot", () => {
    const data = readFileSync(SDF_PATH);
    const { width, height } = WORDMARK_SDF_SIZE;
    let inside = 0;
    let band = 0;
    for (const v of data) {
      if (v > 140) inside += 1;
      else if (v > 115) band += 1;
    }
    expect(inside / data.length).toBeGreaterThan(0.03);
    expect(band).toBeGreaterThan(1000);
    // Slot centre (fraction of the plane from its centre) must be far outside the letters.
    const sx = Math.round((0.5 + WORDMARK_SLOT.x) * width);
    const sy = Math.round((0.5 - WORDMARK_SLOT.y) * height);
    expect(data[sy * width + sx]).toBeLessThan(60);
  });

  it("hero slot comes from the baked meta", () => {
    expect(heroSlot).toEqual(WORDMARK_SLOT);
  });
});
