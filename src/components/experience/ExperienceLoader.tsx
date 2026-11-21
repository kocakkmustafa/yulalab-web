"use client";

import { useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ExperienceCopy } from "./types";
import { resolveLoaderFrame, resolveLoaderOpen } from "./loader";
import styles from "./Experience.module.css";

type ExperienceLoaderProps = {
  lines: ExperienceCopy["loader"];
  progress: number;
  /** Fast-forwards the drawing phase; the exit and the scene hand-off are unchanged. */
  onSkip?: () => void;
};

type LoaderStyle = CSSProperties & {
  "--loader-progress": number;
  "--loader-line": number;
  "--loader-iris": number;
  "--loader-exit": number;
};

/** The loader's drawing phase ends at this share of the progress (see LOADER_HOLD_PROGRESS in YulaExperience). */
const DRAW_SHARE = 0.9;
const DRAW_MS = 3_600;
/** The reference decodes its single line 40 ms per letter after a 300 ms delay. */
const LETTER_DELAY_MS = 300;
const LETTER_MS = 40;

/**
 * W8: the opening card in the reference's grammar. Pure black ground, one thin line that draws itself and one line of
 * text decoding letter by letter; no frame, no readout list, no percentage, no flash. The exit is a circular opening onto
 * the live scene. Timing lives in YulaExperience so capture mode can provide an exact frame.
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
  const drawMs = (Math.min(clamped, DRAW_SHARE) / DRAW_SHARE) * DRAW_MS;
  const text = lines[0] ?? "";
  const letters = Array.from(text);
  const visible = Math.max(0, Math.min(letters.length, Math.floor((drawMs - LETTER_DELAY_MS) / LETTER_MS)));
  const exit = resolveLoaderOpen(clamped);
  const style: LoaderStyle = {
    "--loader-progress": clamped,
    // The line draws over the first 70% of the card, then holds.
    "--loader-line": Math.min(1, drawMs / (DRAW_MS * 0.7)),
    // Iris radius as a share of the farthest-corner radius: closed (-8) to fully open (110).
    "--loader-iris": -8 + 118 * exit,
    "--loader-exit": exit,
  };

  return (
    <div
      className={styles.loader}
      style={style}
      data-yula-loader="true"
      data-loader-progress={clamped.toFixed(3)}
    >
      <div className={styles.loaderField} aria-hidden="true">
        <svg className={styles.loaderBlueprint} viewBox="0 0 1000 2" preserveAspectRatio="none">
          <path d="M0 1H1000" pathLength="1" />
        </svg>
        <p className={styles.loaderType}>
          {letters.map((letter, index) => (
            <span key={index} data-on={index < visible ? "true" : "false"}>{letter === " " ? " " : letter}</span>
          ))}
        </p>
      </div>

      <div
        className={styles.loaderReadout}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={styles.srOnly}>{text}</span>
      </div>
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          data-yula-loader-skip="true"
          className={`focusable ${styles.loaderSkip}`}
        >
          {t("loaderSkip")}
        </button>
      ) : null}
    </div>
  );
}

export default ExperienceLoader;
