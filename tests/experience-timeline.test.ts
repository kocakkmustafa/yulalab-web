import { describe, expect, it } from "vitest";
import { Color, PerspectiveCamera, Vector3 } from "three";
import { proofLayoutPose } from "@/components/experience/layout";
import {
  resolveExperiencePalette,
  WORLD_DARK_COLOR,
  WORLD_LIGHT_COLOR,
} from "@/components/experience/theme";
import {
  CAMERA_TRACKS,
  CROSSING_BLADE,
  STAGES,
  evaluateTimeline,
  glyphDepthExtent,
  interpolateKeyframes,
  segmentProgress,
} from "@/components/experience/timeline";

describe("reference-faithful experience timeline", () => {
  it("keeps overlay text at WCAG AA contrast throughout both theme transitions", () => {
    const dark = new Color(WORLD_DARK_COLOR);
    const light = new Color(WORLD_LIGHT_COLOR);
    const luminance = (color: Color) =>
      0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;

    for (let step = 0; step <= 1_000; step += 1) {
      const mix = step / 1_000;
      const background = dark.clone().lerp(light, mix);
      const foreground = new Color(resolveExperiencePalette(mix).foreground);
      const brighter = Math.max(luminance(background), luminance(foreground));
      const darker = Math.min(luminance(background), luminance(foreground));
      const contrast = (brighter + 0.05) / (darker + 0.05);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    [0, "hero"],
    [0.085, "portfolio"],
    [0.505, "proof"],
    [0.575, "crossing"],
    [0.69, "mission"],
    [0.765, "vision"],
    [0.835, "values"],
    [0.955, "closing"],
    [1, "closing"],
  ] as const)("maps progress %s to %s", (progress, stage) => {
    expect(evaluateTimeline(progress, "desktop").stage).toBe(stage);
  });

  it("clamps invalid and out-of-range progress", () => {
    expect(evaluateTimeline(Number.NaN, "desktop").progress).toBe(0);
    expect(evaluateTimeline(-10, "desktop").progress).toBe(0);
    expect(evaluateTimeline(10, "desktop").progress).toBe(1);
    expect(segmentProgress(0.4, 0.5, 0.5)).toBe(0);
    expect(segmentProgress(0.6, 0.5, 0.5)).toBe(1);
  });

  it("gives all eight products an equal, stable focus slot", () => {
    const [start, end] = STAGES.portfolio;
    for (let index = 0; index < 8; index += 1) {
      const center = start + ((index + 0.5) / 8) * (end - start);
      const frame = evaluateTimeline(center, "desktop");
      expect(frame.productIndex).toBe(index);
      expect(frame.productProgress).toBeCloseTo(0.5, 6);
    }
  });

  it("keeps the complete Y volume behind the active card, then crosses once during proof", () => {
    const [start, end] = STAGES.portfolio;
    for (let step = 0; step <= 320; step += 1) {
      const progress = start + (step / 320) * (end - start - Number.EPSILON);
      const frame = evaluateTimeline(progress, "desktop");
      const activeCardDepth = -1.25 - frame.productIndex * 1.36;
      const glyphFront = frame.glyph.position[2] + glyphDepthExtent(
        frame.glyph.rotation,
        frame.glyph.scale,
      );
      expect(glyphFront).toBeLessThan(activeCardDepth - 0.1);
    }

    const beforeCross = evaluateTimeline(0.515, "desktop");
    const beforeCardDepth =
      (-1.25 - 7 * 1.36) + (-13.98 - (-1.25 - 7 * 1.36)) * beforeCross.world.proofMorph;
    const beforeFront = beforeCross.glyph.position[2] + glyphDepthExtent(
      beforeCross.glyph.rotation,
      beforeCross.glyph.scale,
    );
    expect(beforeFront).toBeLessThan(beforeCardDepth);

    const afterCross = evaluateTimeline(0.565, "desktop");
    const afterCardDepth =
      (-1.25 - 7 * 1.36) + (-13.98 - (-1.25 - 7 * 1.36)) * afterCross.world.proofMorph;
    const afterBack = afterCross.glyph.position[2] - glyphDepthExtent(
      afterCross.glyph.rotation,
      afterCross.glyph.scale,
    );
    expect(afterBack).toBeGreaterThan(afterCardDepth);

    let crossings = 0;
    let previousSide = -1;
    for (let step = 1; step <= 240; step += 1) {
      const progress = STAGES.proof[0] + (step / 240) * (STAGES.proof[1] - STAGES.proof[0]);
      const frame = evaluateTimeline(progress, "desktop");
      const cardDepth =
        (-1.25 - 7 * 1.36) + (-13.98 - (-1.25 - 7 * 1.36)) * frame.world.proofMorph;
      const side = Math.sign(frame.glyph.position[2] - cardDepth) || previousSide;
      if (side !== previousSide) crossings += 1;
      previousSide = side;
    }
    expect(crossings).toBe(1);
  });

  it("gives all eight proof cards an equal, stable focus slot", () => {
    const [start, end] = STAGES.proof;
    for (let index = 0; index < 8; index += 1) {
      const center = start + ((index + 0.5) / 8) * (end - start);
      const frame = evaluateTimeline(center, "desktop");
      expect(frame.proofIndex).toBe(index);
      expect(frame.proofProgress).toBeCloseTo(0.5, 6);
    }
  });

  it("gives all four values an equal focus slot", () => {
    const [start, end] = STAGES.values;
    for (let index = 0; index < 4; index += 1) {
      const center = start + ((index + 0.5) / 4) * (end - start);
      const frame = evaluateTimeline(center, "desktop");
      expect(frame.valueIndex).toBe(index);
      expect(frame.valueProgress).toBeCloseTo(0.5, 6);
    }
  });

  it("keeps camera vectors finite at every checkpoint", () => {
    for (let step = 0; step <= 100; step += 1) {
      const frame = evaluateTimeline(step / 100, "desktop");
      const values = [
        ...frame.camera.position,
        ...frame.camera.target,
        ...frame.glyph.position,
        ...frame.glyph.rotation,
        frame.camera.fov,
        frame.glyph.scale,
      ];
      expect(values.every(Number.isFinite)).toBe(true);
    }
  });

  it("uses a dedicated mobile camera track", () => {
    const desktop = evaluateTimeline(0.42, "desktop").camera;
    const mobile = evaluateTimeline(0.42, "mobile").camera;
    expect(mobile.position).not.toEqual(desktop.position);
    expect(mobile.target).not.toEqual(desktop.target);
    expect(mobile.fov).toBeGreaterThan(desktop.fov);
  });

  it("moves both cameras completely through the physical white blade during crossing", () => {
    const bladeExitZ = CROSSING_BLADE.centerZ - CROSSING_BLADE.halfDepth;

    for (const mode of ["desktop", "mobile"] as const) {
      let previousSide = Math.sign(
        evaluateTimeline(STAGES.crossing[0], mode).camera.position[2] - bladeExitZ,
      );
      let crossings = 0;

      for (let step = 1; step <= 320; step += 1) {
        const progress = STAGES.crossing[0] +
          (step / 320) * (STAGES.crossing[1] - STAGES.crossing[0]);
        const side = Math.sign(evaluateTimeline(progress, mode).camera.position[2] - bladeExitZ) || previousSide;
        if (side !== previousSide) crossings += 1;
        previousSide = side;
      }

      expect(crossings).toBe(1);
      expect(evaluateTimeline(STAGES.crossing[1], mode).camera.position[2]).toBeLessThan(
        bladeExitZ - 0.1,
      );
    }
  });

  it("fits the final proof ledger inside desktop and portrait camera frustums", () => {
    const cases = [
      { mode: "desktop" as const, aspect: 1440 / 900 },
      { mode: "mobile" as const, aspect: 390 / 844 },
    ];

    for (const { mode, aspect } of cases) {
      const frame = evaluateTimeline(STAGES.proof[1], mode);
      const camera = new PerspectiveCamera(frame.camera.fov, aspect, 0.05, 130);
      camera.position.set(...frame.camera.position);
      camera.lookAt(new Vector3(...frame.camera.target));
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      for (let index = 0; index < 8; index += 1) {
        const pose = proofLayoutPose(index, mode);
        const halfWidth = 3.9 / 2;
        const halfHeight = 2.65 / 2;
        for (const x of [-halfWidth, halfWidth]) {
          for (const y of [-halfHeight, halfHeight]) {
            const scaledY = y * pose.scale;
            const point = new Vector3(
              pose.position[0] + x * pose.scale,
              pose.position[1] + scaledY * Math.cos(pose.rotation[0]),
              pose.position[2] + scaledY * Math.sin(pose.rotation[0]),
            ).project(camera);
            expect(Math.abs(point.x)).toBeLessThanOrEqual(0.96);
            expect(Math.abs(point.y)).toBeLessThanOrEqual(0.96);
          }
        }
      }
    }
  });

  it("hits camera keyframe endpoints exactly", () => {
    for (const mode of ["desktop", "mobile"] as const) {
      const keys = CAMERA_TRACKS[mode];
      expect(interpolateKeyframes(keys, 0)).toEqual({
        position: keys[0].position,
        target: keys[0].target,
        fov: keys[0].fov,
      });
      expect(interpolateKeyframes(keys, 1)).toEqual({
        position: keys.at(-1)!.position,
        target: keys.at(-1)!.target,
        fov: keys.at(-1)!.fov,
      });
    }
  });

  it("keeps the complete closing Y in front of the camera and draws its outline", () => {
    const frame = evaluateTimeline(1, "desktop");
    expect(frame.glyph.position[2] - frame.camera.position[2]).toBeLessThan(-5);
    expect(frame.glyph.scale).toBeLessThanOrEqual(2);
    expect(frame.glyph.outlineMix).toBe(1);
    expect(frame.world.closingDraw).toBe(1);
  });

  it("crosses from dark to white monotonically, then returns to dark for values", () => {
    let previous = 0;
    for (let step = 0; step <= 100; step += 1) {
      const progress = STAGES.crossing[0] +
        (step / 100) * (STAGES.crossing[1] - STAGES.crossing[0]);
      const whiteMix = evaluateTimeline(progress, "desktop").world.whiteMix;
      expect(whiteMix).toBeGreaterThanOrEqual(previous);
      previous = whiteMix;
    }
    expect(previous).toBe(1);
    expect(evaluateTimeline(0.72, "desktop").world.themeMix).toBe(1);
    expect(evaluateTimeline(0.82, "desktop").world.themeMix).toBe(0);
    expect(evaluateTimeline(0.98, "desktop").world.themeMix).toBe(0);
  });
});
