"use client";

import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Color, CubeCamera, HalfFloatType, Scene, WebGLCubeRenderTarget } from "three";

type LightformerEnvironmentProps = {
  children: ReactNode;
  environmentIntensity: number;
  resolution: number;
};

/**
 * The scene's reflections come from a few Lightformers baked into a cube
 * map. This is drei's `<Environment frames={1}>` portal path (same render
 * target, camera range and clear behaviour), without the HDR, EXR and
 * gain-map loaders that drei's Environment module also ships.
 *
 * The bake clears to the renderer's current clear colour, which WorldTheme
 * moves between the dark and light worlds; drei re-baked on every React
 * render to follow it. Here the cube is re-baked only when that colour (or
 * the resolution) actually changes, which yields the same reflections.
 */
export function LightformerEnvironment({
  children,
  environmentIntensity,
  resolution,
}: LightformerEnvironmentProps) {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const [virtualScene] = useState(() => new Scene());
  const bake = useMemo(() => {
    const target = new WebGLCubeRenderTarget(resolution);
    target.texture.type = HalfFloatType;
    // drei mounts this camera at the virtual scene's origin; a parentless
    // camera at the origin renders the same six faces.
    return { target, camera: new CubeCamera(0.1, 1000, target) };
  }, [resolution]);
  const baked = useRef<{ target: WebGLCubeRenderTarget | null; color: Color; alpha: number }>({
    target: null,
    color: new Color(),
    alpha: -1,
  });
  const clearColor = useRef(new Color());

  useLayoutEffect(() => {
    const previous = scene.environment;
    scene.environment = bake.target.texture;
    invalidate();
    return () => {
      scene.environment = previous;
      bake.target.dispose();
    };
  }, [bake, invalidate, scene]);

  useLayoutEffect(() => {
    scene.environmentIntensity = environmentIntensity;
    invalidate();
  }, [environmentIntensity, invalidate, scene]);

  // After WorldTheme (-90) has set this frame's clear colour.
  useFrame(({ gl }) => {
    gl.getClearColor(clearColor.current);
    const alpha = gl.getClearAlpha();
    const last = baked.current;
    if (last.target === bake.target && last.alpha === alpha && last.color.equals(clearColor.current)) return;

    const autoClear = gl.autoClear;
    gl.autoClear = true;
    bake.camera.update(gl, virtualScene);
    gl.autoClear = autoClear;
    baked.current = { target: bake.target, color: last.color.copy(clearColor.current), alpha };
  }, -80);

  return createPortal(children, virtualScene);
}
