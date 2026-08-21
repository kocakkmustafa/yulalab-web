import type { ExperienceMode, Vec3 } from "./types";

export type ProofLayoutPose = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

/**
 * Proof is a compact ledger, not the wide portfolio carousel. The mobile
 * 2x4 arrangement is deliberately separate because a portrait camera has
 * less than half the horizontal frustum of the desktop camera.
 */
export function proofLayoutPose(
  index: number,
  mode: ExperienceMode,
): ProofLayoutPose {
  if (mode === "mobile") {
    const column = index % 2;
    const row = Math.floor(index / 2);
    return {
      position: [(column - 0.5) * 0.8, (1.5 - row) * 0.74, -13.82 - row * 0.08],
      rotation: [(row - 1.5) * 0.012, 0, 0],
      scale: 0.19,
    };
  }

  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    position: [(column - 1.5) * 0.68, (0.5 - row) * 1.02, -13.82 - row * 0.12],
    rotation: [row === 0 ? -0.025 : 0.025, 0, 0],
    scale: 0.24,
  };
}
