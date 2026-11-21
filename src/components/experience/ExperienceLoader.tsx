"use client";

import { useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ExperienceCopy } from "./types";
import { resolveLoaderFrame } from "./loader";
import { scrambleFrame } from "@/lib/scramble";
import styles from "./Experience.module.css";

type ExperienceLoaderProps = {
  lines: ExperienceCopy["loader"];
  progress: number;
  /** Fast-forwards the drawing phase; the exit and the scene hand-off are unchanged. */
  onSkip?: () => void;
};

type LoaderStyle = CSSProperties & {
  "--loader-progress": number;
  "--loader-reveal": number;
  "--loader-flat": number;
  "--loader-depth": number;
  "--loader-flash": number;
  "--loader-exit": number;
};

/**
 * A self-running architectural title card, not an interaction gate.
 * Timing lives in YulaExperience so capture mode can provide an exact frame.
 */
export function ExperienceLoader({ lines, progress, onSkip }: ExperienceLoaderProps) {
  const t = useTranslations("experience");
  useEffect(() => {
    if (!onSkip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onSkip();
    };
    // window, not document: a Doors panel or menu that handles Escape on the
    // document runs first and calls preventDefault, so one key does one thing.
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);
  const frame = resolveLoaderFrame(progress);
  const clamped = frame.progress;
  const activeLine = 0;
  // The active readout line decodes from its own glyphs as the card runs; the
  // stand-ins are a pure function of progress, so capture frames are exact.
  const lineProgress = Math.max(0, (clamped * 3600 - 300) / Math.max(1, lines[0].length * 40));
  const decodeTick = Math.floor(clamped * 240);
  const style: LoaderStyle = {
    "--loader-progress": clamped,
    "--loader-reveal": frame.reveal,
    "--loader-flat": frame.flat,
    "--loader-depth": frame.depth,
    "--loader-flash": frame.flash,
    "--loader-exit": frame.exit,
  };

  return (
    <div
      className={styles.loader}
      style={style}
      data-yula-loader="true"
      data-loader-progress={clamped.toFixed(3)}
    >
      <div className={styles.loaderField} aria-hidden="true">
        <svg className={styles.loaderBlueprint} viewBox="0 0 1000 700">
          <g className={styles.loaderAxes}>
            <path d="M80 350H920" pathLength="1" />
            <path d="M500 62V638" pathLength="1" />
            <circle cx="500" cy="350" r="248" pathLength="1" />
            <circle cx="500" cy="350" r="164" pathLength="1" />
            <path d="M250 184L750 516M750 184L250 516" pathLength="1" />
          </g>
          <g className={styles.loaderGlyphWire}>
            <path d="M318 162L500 348L682 162L613 112L500 230L387 112Z" />
            <path d="M435 328H565V588H435Z" />
            <path d="M500 348L613 230L548 178L500 230L452 178L387 230Z" />
          </g>
          <g className={styles.loaderGlyphDepth}>
            <path d="M318 162L500 348L682 162L613 112L500 230L387 112Z" />
            <path d="M435 328H565V588H435Z" />
          </g>
          <g className={styles.loaderGlyphGlass}>
            <path d="M318 162L500 348L682 162L613 112L500 230L387 112Z" />
            <path d="M435 328H565V588H435Z" />
          </g>
          <g className={styles.loaderTicks}>
            {Array.from({ length: 18 }, (_, index) => {
              const x = 95 + index * 47.65;
              return <path key={index} d={`M${x} 340V360`} />;
            })}
          </g>
        </svg>
      </div>

      <div
        className={styles.loaderReadout}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={styles.srOnly}>{lines[activeLine]}</span>
        <span aria-hidden="true">{scrambleFrame(lines[0], lineProgress, decodeTick)}</span>
      </div>
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          data-yula-loader-skip="true"
          className={styles.loaderSkip}
        >
          {t("loaderSkip")}
        </button>
      ) : null}
    </div>
  );
}

export default ExperienceLoader;
