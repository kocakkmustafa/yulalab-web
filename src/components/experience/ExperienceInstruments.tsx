"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  composeGlyphRotation,
  eulerToQuaternion,
  formatQuaternionComponent,
  projectAxes,
  RULER_STAGES,
  rulerOffset,
} from "./instruments";
import type { ExperienceInstrumentCopy, TimelineFrame, Vec3 } from "./types";
import styles from "./Experience.module.css";

type RulerStyle = CSSProperties & { "--ruler-offset": number };

const AXIS_COLORS = { x: "#ff4d6d", y: "#4ade80", z: "#60a5fa" } as const;
const GIZMO_RADIUS = 34;
const PITCH_LIMIT = 0.35;
const YAW_LIMIT = 0.65;

const clampTo = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Six balls as on a viewport gizmo: lettered positive axes, grey negatives, far ones first. */
export function gizmoBalls(rotation: Vec3) {
  return projectAxes(rotation)
    .flatMap(({ axis, x, y, depth }) => [
      { key: axis, label: axis.toUpperCase(), color: AXIS_COLORS[axis], x, y, depth, positive: true },
      { key: `-${axis}`, label: `-${axis.toUpperCase()}`, color: null, x: -x, y: -y, depth: -depth, positive: false },
    ])
    .sort((a, b) => a.depth - b.depth);
}

/**
 * Instrument layer: a stage ruler on the leading edge and a live readout of
 * the glass glyph's orientation. It mirrors state the visitor already sees and
 * the glyph has its own accessible control, so the layer stays aria-hidden.
 * With a pointer, the gizmo can be dragged to turn the glass and the readout
 * folds from its title, like a small tool panel.
 */
export function ExperienceInstruments({
  frame,
  glyphRotation,
  copy,
  onRotate,
}: {
  frame: TimelineFrame;
  glyphRotation: Vec3;
  copy: ExperienceInstrumentCopy;
  onRotate?: (rotation: Vec3) => void;
}) {
  const [folded, setFolded] = useState(false);
  const drag = useRef<{ x: number; y: number; rotation: Vec3 } | null>(null);
  const rotation = composeGlyphRotation(frame, glyphRotation);
  const quaternion = eulerToQuaternion(rotation);
  const balls = gizmoBalls(rotation);
  const glyphVisible = frame.stage === "hero" || frame.stage === "portfolio";
  // The status dot lights while the visitor's own drag still steers the glass.
  const steering = rotation.some((value, index) => Math.abs(value - frame.glyph.rotation[index]) > 0.001);
  const interactive = Boolean(onRotate) && frame.stage === "hero";

  const onGizmoDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, rotation: glyphRotation };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onGizmoMove = (event: PointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start || !onRotate) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    onRotate([clampTo(start.rotation[0] + dy * 0.01, PITCH_LIMIT), clampTo(start.rotation[1] + dx * 0.012, YAW_LIMIT), 0]);
  };
  const endDrag = () => {
    drag.current = null;
  };

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
            <b>{copy[label]}</b>
          </span>
        ))}
        <span
          className={styles.rulerCursor}
          style={{ "--ruler-offset": frame.progress } as RulerStyle}
        />
      </div>

      {/* Signed numbers keep LTR order in every locale; the label follows the page. */}
      <div className={styles.glyphReadout} data-visible={glyphVisible ? "true" : "false"} data-folded={folded ? "true" : "false"}>
        <p className={styles.glyphTitle}>
          {copy.glyph}
          {/* Pointer-only fold, like a tool panel; not in the tab order (the layer is aria-hidden). */}
          <button type="button" tabIndex={-1} className={styles.glyphFold} onClick={() => setFolded((value) => !value)}>
            <i />
            <i />
          </button>
        </p>
        <p className={styles.glyphValues} dir="ltr">
          <i className={styles.glyphStatus} data-live={steering ? "true" : "false"} />
          {quaternion.map((value, index) => (
            <span key={index}>{formatQuaternionComponent(value)}</span>
          ))}
        </p>
        <svg
          className={styles.glyphGizmo}
          data-interactive={interactive ? "true" : "false"}
          onPointerDown={onGizmoDown}
          onPointerMove={onGizmoMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          viewBox={`${-GIZMO_RADIUS - 6} ${-GIZMO_RADIUS - 6} ${(GIZMO_RADIUS + 6) * 2} ${(GIZMO_RADIUS + 6) * 2}`}
        >
          <circle r={GIZMO_RADIUS} />
          <circle r={GIZMO_RADIUS - 6} />
          {balls.map(({ key, label, color, x, y, depth, positive }) => {
            const cx = x * (GIZMO_RADIUS - 8);
            const cy = y * (GIZMO_RADIUS - 8);
            return (
              <g key={key} className={styles.gizmoBall} data-positive={positive ? "true" : "false"} opacity={0.5 + Math.max(0, depth) * 0.5}>
                {positive ? <line x1={0} y1={0} x2={cx} y2={cy} stroke={color ?? undefined} /> : null}
                <circle cx={cx} cy={cy} r={positive ? 6.5 : 5.5} fill={color ?? undefined} />
                <text x={cx} y={cy} dy="0.35em" textAnchor="middle">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
