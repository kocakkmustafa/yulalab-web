import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { heroSlot } from "../src/components/experience/hero-slot";
import { flipSdfRows } from "../src/components/experience/wordmark-sdf-rows";
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

  it("W8-16: atlas top row is the letter top (U arms open upward) and the GL upload reverses rows", () => {
    const data = readFileSync(SDF_PATH);
    const { width, height } = WORDMARK_SDF_SIZE;
    // U = first ink column run of ULA. Count its ink above/below the vertical middle of the ink rows.
    const inkCol = (x: number) => {
      for (let y = 0; y < height; y += 1) if (data[y * width + x] > 128) return true;
      return false;
    };
    let x0 = 0;
    while (x0 < width && !inkCol(x0)) x0 += 1;
    let x1 = x0;
    while (x1 < width && inkCol(x1)) x1 += 1;
    let firstRow: number = height;
    let lastRow = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        if (data[y * width + x] > 128) {
          firstRow = Math.min(firstRow, y);
          lastRow = Math.max(lastRow, y);
        }
      }
    }
    const midY = Math.round((firstRow + lastRow) / 2);
    let top = 0;
    let bottom = 0;
    for (let y = firstRow; y <= lastRow; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        if (data[y * width + x] > 128) (y < midY ? (top += 1) : (bottom += 1));
      }
    }
    // The U has two arms on top and a closed bowl below: the file's upper half must hold less ink than the lower.
    expect(top).toBeGreaterThan(0);
    expect(bottom).toBeGreaterThan(top);
    const gl = new Uint8Array(width * height);
    flipSdfRows(new Uint8Array(data), gl, width, height);
    expect(gl.subarray(0, width)).toEqual(new Uint8Array(data.subarray((height - 1) * width)));
    expect(gl.subarray((height - 1) * width)).toEqual(new Uint8Array(data.subarray(0, width)));
  });
});
