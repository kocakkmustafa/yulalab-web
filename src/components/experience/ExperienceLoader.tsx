"use client";

import { useEffect, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ExperienceCopy } from "./types";
import { resolveLoaderChars, resolveLoaderFrame } from "./loader";
import styles from "./Experience.module.css";

type ExperienceLoaderProps = {
  lines: ExperienceCopy["loader"];
  tagline?: string;
  progress: number;
  /** Fast-forwards the drawing phase; the exit and the scene hand-off are unchanged. */
  onSkip?: () => void;
};

type LoaderStyle = CSSProperties & {
  "--loader-progress": number;
  "--loader-reveal": number;
  "--loader-flat": number;
  "--loader-depth": number;
  "--loader-exit": number;
};

/**
 * Pure black architectural construction loader in the reference grammar:
 * thin drafting rays, thin Y emblem outline, and a single character-resolved line.
 */
export function ExperienceLoader({ lines, tagline, progress, onSkip }: ExperienceLoaderProps) {
  const t = useTranslations("experience");
  useEffect(() => {
    if (!onSkip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const frame = resolveLoaderFrame(progress);
  const clamped = frame.progress;
  const activeLine = Math.min(lines.length - 1, Math.floor(clamped * lines.length));
  const elapsedMs = clamped <= 0.9
    ? (clamped / 0.9) * 3_200
    : 3_200 + ((clamped - 0.9) / 0.1) * 750;
  const displayLine = tagline ?? lines[lines.length - 1] ?? lines[0] ?? "";
  const chars = resolveLoaderChars(displayLine, elapsedMs);

  const style: LoaderStyle = {
    "--loader-progress": clamped,
    "--loader-reveal": frame.reveal,
    "--loader-flat": frame.flat,
    "--loader-depth": frame.depth,
    "--loader-exit": frame.exit,
  };

  return (
    <div
      className={styles.loader}
      style={style}
      data-yula-loader="true"
      data-loader-progress={clamped.toFixed(3)}
    >
      <svg
        className={styles.loaderBackdropLines}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="yula-loader-hfade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="16%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="84%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className={styles.loaderDraftRays}>
          {/* Parallel construction rays extending along the Y arms across the full frame */}
          <path d="M298 -40L972 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M312 -40L986 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M352 -40L1026 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M1142 -40L468 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M1128 -40L454 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M1088 -40L414 940" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M480 0V900" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M960 0V900" pathLength="1" vectorEffect="non-scaling-stroke" />
        </g>
        <g className={styles.loaderDraftRules} stroke="url(#yula-loader-hfade)">
          <path d="M140 212H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M140 356H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M140 536H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M140 582H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M140 594H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
          <path d="M140 612H1300" pathLength="1" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <div className={styles.loaderField} aria-hidden="true">
        <svg className={styles.loaderBlueprint} viewBox="0 0 1000 700">
          <g className={styles.loaderCircles}>
            <circle cx="500" cy="350" r="248" vectorEffect="non-scaling-stroke" />
            <circle cx="500" cy="350" r="148" vectorEffect="non-scaling-stroke" />
            <path d="M500 92V608" pathLength="1" vectorEffect="non-scaling-stroke" />
          </g>
          <g className={styles.loaderGlyphOutline}>
            <path
              d="M318 148H402L500 288L598 148H682L544 344V556H456V344Z"
              pathLength="1"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M336 160H395L500 310L605 160H664L532 348V544H468V348Z"
              pathLength="1"
              vectorEffect="non-scaling-stroke"
            />
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
        <p className={styles.loaderLine} aria-hidden="true">
          {chars.map((item, index) => (
            <span key={index} style={{ opacity: item.opacity }}>
              {item.char}
            </span>
          ))}
        </p>
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
