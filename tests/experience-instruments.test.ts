import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";

import {
  eulerToQuaternion,
  formatQuaternionComponent,
  projectAxes,
  RULER_STAGES,
  rulerOffset,
} from "@/components/experience/instruments";
import { STAGES } from "@/components/experience/timeline";
import type { Vec3 } from "@/components/experience/types";

const ROTATIONS: Vec3[] = [
  [0, 0, 0],
  [0.4, -1.1, 0.25],
  [-2.2, 0.7, 3.0],
  [Math.PI / 2, 0, -Math.PI / 3],
];

describe("glyph instrument math", () => {
  it("matches three.js for Euler XYZ → quaternion", () => {
    for (const rotation of ROTATIONS) {
      const expected = new Quaternion().setFromEuler(new Euler(...rotation, "XYZ"));
      const [x, y, z, w] = eulerToQuaternion(rotation);
      expect([x, y, z, w].map((v) => v.toFixed(6))).toEqual(
        [expected.x, expected.y, expected.z, expected.w].map((v) => v.toFixed(6)),
      );
    }
  });

  it("projects rotated axes like three.js and draws the nearest last", () => {
    for (const rotation of ROTATIONS) {
      const q = new Quaternion().setFromEuler(new Euler(...rotation, "XYZ"));
      const axes = projectAxes(rotation);
      for (const axis of axes) {
        const units: Record<"x" | "y" | "z", Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
        const unit = units[axis.axis];
        const v = new Vector3(...unit).applyQuaternion(q);
        expect(axis.x).toBeCloseTo(v.x, 6);
        expect(axis.y).toBeCloseTo(-v.y, 6);
        expect(axis.depth).toBeCloseTo(v.z, 6);
      }
      expect(axes.map((a) => a.depth)).toEqual([...axes.map((a) => a.depth)].sort((a, b) => a - b));
    }
  });

  it("formats a fixed-width readout", () => {
    expect(formatQuaternionComponent(0)).toBe(".00");
    expect(formatQuaternionComponent(-0.001)).toBe(".00");
    expect(formatQuaternionComponent(-0.92)).toBe("-.92");
    expect(formatQuaternionComponent(0.391)).toBe(".39");
    expect(formatQuaternionComponent(1)).toBe("1.0");
    expect(formatQuaternionComponent(-1.4)).toBe("-1.0");
    expect(formatQuaternionComponent(Number.NaN)).toBe(".00");
  });

  it("lists every timeline stage once, in timeline order", () => {
    const stages = RULER_STAGES.map((entry) => entry.stage);
    expect(new Set(stages)).toEqual(new Set(Object.keys(STAGES)));
    const offsets = stages.map(rulerOffset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });
});
