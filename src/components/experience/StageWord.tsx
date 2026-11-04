"use client";

import type { CSSProperties } from "react";
import { stageWordFrame } from "./instruments";
import type { ExperienceInstrumentCopy, TimelineFrame } from "./types";
import styles from "./Experience.module.css";

type StageWordStyle = CSSProperties & { "--stage-word-opacity": number; "--stage-word-shift": number };

/**
 * Oversized outlined stage title (Projects, Records, Vision, Values) that
 * drifts behind the copy as a stage plays. Decorative: the stage's own
 * heading carries the meaning, so this stays out of the accessibility tree.
 */
export function StageWord({ frame, copy }: { frame: TimelineFrame; copy: ExperienceInstrumentCopy }) {
  const word = stageWordFrame(frame);
  if (!word) return null;
  const style: StageWordStyle = {
    "--stage-word-opacity": word.opacity,
    "--stage-word-shift": word.shift,
  };
  return (
    <div className={styles.stageWord} aria-hidden="true" data-stage-word={word.label} style={style}>
      <span>{copy[word.label]}</span>
    </div>
  );
}
