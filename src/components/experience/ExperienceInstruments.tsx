"use client";

import type { CSSProperties } from "react";
import {
  composeGlyphRotation,
  eulerToQuaternion,
  formatQuaternionComponent,
  projectAxes,
  RULER_STAGES,
  rulerOffset,
} from "./instruments";
import type { TimelineFrame, Vec3 } from "./types";
import styles from "./Experience.module.css";

type RulerStyle = CSSProperties & { "--ruler-offset": number };

const AXIS_COLORS = { x: "#ff4d6d", y: "#4ade80", z: "#60a5fa" } as const;
const GIZMO_RADIUS = 34;

/**
 * Decorative instrument layer: a stage ruler on the leading edge and a live
 * readout of the glass glyph's orientation. Everything here mirrors state the
 * visitor already sees, so it stays aria-hidden and never takes pointer input.
 */
export function ExperienceInstruments({
  frame,
  glyphRotation,
}: {
  frame: TimelineFrame;
  glyphRotation: Vec3;
}) {
  const rotation = composeGlyphRotation(frame, glyphRotation);
  const quaternion = eulerToQuaternion(rotation);
  const axes = projectAxes(rotation);
  const glyphVisible = frame.stage === "hero" || frame.stage === "portfolio";

  return (
    <div className={styles.instruments} aria-hidden="true">
      <div className={styles.stageRuler}>
        {RULER_STAGES.map(({ stage, label }) => (
          <span
            key={stage}
            className={styles.rulerMark}
            data-active={frame.stage === stage ? "true" : "false"}
            style={{ "--ruler-offset": rulerOffset(stage) } as RulerStyle}
          >
            <i />
            <b dir="ltr">{label}</b>
          </span>
        ))}
        <span
          className={styles.rulerCursor}
          style={{ "--ruler-offset": frame.progress } as RulerStyle}
        />
      </div>

      {/* Latin instrument text and signed numbers keep LTR order in every locale. */}
      <div className={styles.glyphReadout} data-visible={glyphVisible ? "true" : "false"} dir="ltr">
        <p>Y-GLYPH QUATERNION</p>
        <p className={styles.glyphValues}>
          {quaternion.map((value, index) => (
            <span key={index}>{formatQuaternionComponent(value)}</span>
          ))}
        </p>
        <svg
          className={styles.glyphGizmo}
          viewBox={`${-GIZMO_RADIUS - 6} ${-GIZMO_RADIUS - 6} ${(GIZMO_RADIUS + 6) * 2} ${(GIZMO_RADIUS + 6) * 2}`}
        >
          <circle r={GIZMO_RADIUS} />
          <circle r={GIZMO_RADIUS - 6} />
          {axes.map(({ axis, x, y, depth }) => (
            <g key={axis} opacity={0.45 + Math.max(0, depth) * 0.55}>
              <line x1={0} y1={0} x2={x * (GIZMO_RADIUS - 8)} y2={y * (GIZMO_RADIUS - 8)} stroke={AXIS_COLORS[axis]} />
              <circle cx={x * (GIZMO_RADIUS - 8)} cy={y * (GIZMO_RADIUS - 8)} r={5} fill={AXIS_COLORS[axis]} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
