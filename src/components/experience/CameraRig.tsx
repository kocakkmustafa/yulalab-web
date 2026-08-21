"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { evaluateTimeline } from "./timeline";
import type { ExperienceMode } from "./types";

export type CameraRigProps = {
  progress: number;
  mode: ExperienceMode;
};

export function CameraRig({ progress, mode }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const target = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const pose = evaluateTimeline(progress, mode).camera;

    camera.position.set(...pose.position);
    target.set(...pose.target);
    camera.lookAt(target);

    if (camera instanceof PerspectiveCamera && camera.fov !== pose.fov) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
  }, -50);

  return null;
}
