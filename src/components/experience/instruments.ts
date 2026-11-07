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

/** Stages that carry an oversized outlined title word, with how far into the
 *  stage the word stays (the gallery hands the screen to its panels early). */
const STAGE_WORD_SPAN: Partial<Record<ExperienceStage, { label: keyof ExperienceInstrumentCopy; until: number }>> = {
  portfolio: { label: "works", until: 0.16 },
  proof: { label: "proof", until: 0.3 },
  vision: { label: "vision", until: 1 },
  values: { label: "values", until: 0.55 },
};

export type StageWordFrame = {
  label: keyof ExperienceInstrumentCopy;
  /** 0–1, already folded with the stage's own overlay fade. */
  opacity: number;
  /** -0.5 … 0.5 of the drift; the word travels against the reading direction. */
  shift: number;
};

/**
 * The outlined stage word for a timeline frame: it fades in with the stage,
 * drifts across the screen with the stage's progress and is gone before the
 * stage's own content needs the room. A pure function of the frame, so capture
 * mode renders the exact same word at the exact same place.
 */
export function stageWordFrame(frame: TimelineFrame): StageWordFrame | null {
  const span = STAGE_WORD_SPAN[frame.stage];
  if (!span) return null;
  const local = Math.min(1, Math.max(0, frame.stageProgress / span.until));
  const envelope = span.until >= 1 ? 1 : 1 - smoothstep((local - 0.55) / 0.45);
  const opacity = Math.min(1, Math.max(0, frame.overlay[frame.stage])) * envelope;
  if (opacity <= 0.001) return null;
  return { label: span.label, opacity, shift: 0.5 - local };
}
