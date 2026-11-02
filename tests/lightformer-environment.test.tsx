// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { createElement } from "react";
import { Color, CubeCamera, Scene } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  frames: [] as Array<{ callback: (state: { gl: unknown }) => void; priority: number }>,
  invalidate: vi.fn(),
  scene: null as unknown as Scene,
}));

vi.mock("@react-three/fiber", () => ({
  createPortal: () => null,
  useFrame: (callback: (state: { gl: unknown }) => void, priority = 0) => {
    harness.frames.push({ callback, priority });
  },
  useThree: <T,>(selector: (state: { scene: Scene; invalidate: () => void }) => T) =>
    selector({ scene: harness.scene, invalidate: harness.invalidate }),
}));

import { LightformerEnvironment } from "@/components/experience/LightformerEnvironment";

function renderer(color: string) {
  const clear = new Color(color);
  return {
    autoClear: false,
    getClearAlpha: () => 1,
    getClearColor: (target: Color) => target.copy(clear),
    setColor: (next: string) => clear.set(next),
  };
}

function runFrame(gl: unknown) {
  const frame = harness.frames.at(-1);
  expect(frame?.priority).toBe(-80);
  frame?.callback({ gl });
}

afterEach(() => {
  harness.frames.length = 0;
  vi.restoreAllMocks();
});

describe("LightformerEnvironment", () => {
  it("bakes once per clear colour and resolution, like drei's per-render bake", () => {
    harness.scene = new Scene();
    const update = vi.spyOn(CubeCamera.prototype, "update").mockImplementation(() => {});
    const gl = renderer("#08070c");
    const props = { environmentIntensity: 0.85, resolution: 128, children: null };
    const view = render(createElement(LightformerEnvironment, props));

    expect(harness.scene.environment).not.toBeNull();
    expect(harness.scene.environmentIntensity).toBe(0.85);

    runFrame(gl);
    runFrame(gl);
    expect(update).toHaveBeenCalledTimes(1);
    expect(gl.autoClear).toBe(false);

    // WorldTheme moved to the light world: the cube's clear colour changed.
    gl.setColor("#e9ebec");
    runFrame(gl);
    expect(update).toHaveBeenCalledTimes(2);

    // Intensity is a scene uniform and never needs a new bake.
    view.rerender(createElement(LightformerEnvironment, { ...props, environmentIntensity: 1.2 }));
    runFrame(gl);
    expect(update).toHaveBeenCalledTimes(2);
    expect(harness.scene.environmentIntensity).toBe(1.2);

    const previousTexture = harness.scene.environment;
    view.rerender(createElement(LightformerEnvironment, { ...props, resolution: 64 }));
    expect(harness.scene.environment).not.toBe(previousTexture);
    runFrame(gl);
    expect(update).toHaveBeenCalledTimes(3);

    view.unmount();
    expect(harness.scene.environment).toBeNull();
  });
});
