"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { interpolateViewportCamera, segmentProgress, smoothstep } from "./timeline";
import { openingShared } from "./opening";
import type { ExperienceMode } from "./types";

export type CameraRigProps = {
  progress: number;
  mode: ExperienceMode;
};

export function CameraRig({ progress, mode }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const viewportWidth = useThree((state) => state.size.width);
  const invalidate = useThree((state) => state.invalidate);
  const target = useMemo(() => new Vector3(), []);
  // W1D-F H1-d: desktop pointer parallax (REA section 5): target = pointer ndc * 0.5, the offset eases toward
  // it with min(3 * dt, 1), and it fades out again before the proof stage. Not on touch layouts.
  const pointer = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (mode !== "desktop") return undefined;
    const onMove = (event: MouseEvent) => {
      pointer.current.x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointer.current.y = -((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      invalidate();
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [invalidate, mode]);

  useFrame((_state, delta) => {
    const pose = interpolateViewportCamera(progress, viewportWidth, mode);
    const state = pointer.current;
    const weight = mode === "desktop" ? 1 - smoothstep(segmentProgress(progress, 0.4, 0.5)) : 0;
    const ease = Math.min(3 * Math.min(delta, 0.1), 1);
    state.offsetX += (state.x * 0.5 * weight - state.offsetX) * ease;
    state.offsetY += (state.y * 0.5 * weight - state.offsetY) * ease;
    if (Math.abs(state.x * 0.5 * weight - state.offsetX) + Math.abs(state.y * 0.5 * weight - state.offsetY) > 0.002) invalidate();

    // W8-39: the opening is one scene dolly (glass and wordmark together): the camera stays on the hero pose and the
    // view narrows/widens by the shared opening scale (0.05 -> 1.16 -> 1.0), so no separate glass or text motion.
    const openScale = progress < 0.085 ? openingShared.scale : 1;
    camera.position.set(pose.position[0] + state.offsetX, pose.position[1] + state.offsetY, pose.position[2]);
    target.set(...pose.target);
    camera.lookAt(target);

    const effectiveFov = Math.abs(openScale - 1) < 1e-4
      ? pose.fov
      : Math.min(170, (Math.atan(Math.tan((pose.fov * Math.PI) / 360) / Math.max(0.02, openScale)) * 360) / Math.PI);

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - effectiveFov) > 1e-4) {
      camera.fov = effectiveFov;
      camera.updateProjectionMatrix();
    }
  }, -50);

  return null;
}
