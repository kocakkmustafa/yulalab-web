import { segmentProgress, smoothstep, STAGES } from "./timeline";
import type { ExperienceInstrumentCopy, ExperienceStage, TimelineFrame, Vec3 } from "./types";

/**
 * The glyph's rendered orientation: the timeline pose plus the visitor's drag,
 * which hands back to the timeline as the hero scrolls away. YulaGlyph renders
 * this and the HUD reads it, so the readout can never disagree with the glass.
 */
export function composeGlyphRotation(frame: TimelineFrame, interactionRotation: Vec3): Vec3 {
  const interactionMix = 1 - smoothstep(segmentProgress(frame.progress, 0.025, 0.075));
  return [
    frame.glyph.rotation[0] + interactionRotation[0] * interactionMix,
    frame.glyph.rotation[1] + interactionRotation[1] * interactionMix,
    frame.glyph.rotation[2],
  ];
}

export type Quaternion = readonly [x: number, y: number, z: number, w: number];

/** Same convention as three.js Euler order "XYZ" → Quaternion. */
export function eulerToQuaternion([x, y, z]: Vec3): Quaternion {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}

/** "-.92" / ".00" / "1.0": the fixed-width readout used by the HUD. */
export function formatQuaternionComponent(value: number): string {
  if (!Number.isFinite(value)) return ".00";
  const clamped = Math.max(-1, Math.min(1, value));
  if (Math.abs(clamped) >= 0.995) return clamped < 0 ? "-1.0" : "1.0";
  const digits = Math.abs(clamped).toFixed(2).slice(1);
  return clamped < -0.005 ? `-${digits}` : digits;
}

export type ProjectedAxis = { axis: "x" | "y" | "z"; x: number; y: number; depth: number };

/**
 * Screen-space tips of the rotated unit axes (y up, orthographic), sorted
 * back to front so the nearest axis is drawn last.
 */
export function projectAxes(rotation: Vec3): ProjectedAxis[] {
  const [qx, qy, qz, qw] = eulerToQuaternion(rotation);
  const rotate = (v: Vec3): Vec3 => {
    const tx = 2 * (qy * v[2] - qz * v[1]);
    const ty = 2 * (qz * v[0] - qx * v[2]);
    const tz = 2 * (qx * v[1] - qy * v[0]);
    return [
      v[0] + qw * tx + (qy * tz - qz * ty),
      v[1] + qw * ty + (qz * tx - qx * tz),
      v[2] + qw * tz + (qx * ty - qy * tx),
    ];
  };

  return (
    [
      ["x", [1, 0, 0]],
      ["y", [0, 1, 0]],
      ["z", [0, 0, 1]],
    ] as const
  )
    .map(([axis, unit]) => {
      const [x, y, z] = rotate(unit as Vec3);
      return { axis, x, y: -y, depth: z };
    })
    .sort((a, b) => a.depth - b.depth);
}

export const RULER_STAGES: readonly { stage: ExperienceStage; label: keyof ExperienceInstrumentCopy }[] = [
  { stage: "hero", label: "top" },
  { stage: "portfolio", label: "works" },
  { stage: "proof", label: "proof" },
  { stage: "crossing", label: "crossing" },
  { stage: "mission", label: "mission" },
  { stage: "vision", label: "vision" },
  { stage: "values", label: "values" },
  { stage: "closing", label: "contact" },
];

/** Fraction of the ruler (0 top, 1 bottom) where a stage begins. */
export function rulerOffset(stage: ExperienceStage): number {
  return STAGES[stage][0];
}
