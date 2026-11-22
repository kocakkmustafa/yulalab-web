export type LoaderFrame = {
  progress: number;
  flat: number;
  depth: number;
  reveal: number;
  flash: number;
  exit: number;
};

const MAX_VISIBLE_FRAME_DELTA_MS = 100;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function easeOutQuad(value: number): number {
  const x = clamp01(value);
  return 1 - (1 - x) * (1 - x);
}

export const LOADER_TEXT_DELAY_MS = 300;
export const LOADER_TEXT_CHAR_MS = 40;
const SCRAMBLE_ALPHABET = "YULA";

export type LoaderCharState = {
  char: string;
  opacity: number;
};

/**
 * W8 T2: single-line character-by-character scramble in the reference cadence
 * (300 ms initial delay, 40 ms per character, unrevealed glyphs at 0.3 opacity).
 */
export function resolveLoaderChars(text: string, elapsedMs: number): LoaderCharState[] {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (safeElapsed < LOADER_TEXT_DELAY_MS) {
    return Array.from(text, (ch) => ({ char: ch, opacity: 0 }));
  }
  const tick = Math.floor(safeElapsed / 32);
  return Array.from(text, (ch, index) => {
    if (ch.trim() === "") {
      return { char: ch, opacity: 0 };
    }
    const revealAt = LOADER_TEXT_DELAY_MS + index * LOADER_TEXT_CHAR_MS;
    if (safeElapsed >= revealAt) {
      return { char: ch, opacity: 1 };
    }
    const glyphIndex = Math.abs((index * 7 + tick * 3 + 1) % SCRAMBLE_ALPHABET.length);
    return { char: SCRAMBLE_ALPHABET[glyphIndex], opacity: 0.3 };
  });
}

/**
 * W8 T4: normalized sigmoid(6) curve used by the 3.0 s circular lens & camera opening.
 */
export function openingSigmoid(value: number): number {
  const x = clamp01(value);
  const s = (t: number) => 1 / (1 + Math.exp(-6 * (t * 2 - 1)));
  const s0 = s(0);
  const s1 = s(1);
  return (s(x) - s0) / (s1 - s0);
}

/**
 * Pure opening phase contract used by both runtime animation and deterministic
 * capture. Construction lines draw first, the thin Y outline appears mid-card,
 * flash stays zero (W8 T3: pure black loader), and exit fades with power2.out.
 */
export function resolveLoaderFrame(value: number): LoaderFrame {
  const progress = clamp01(value);
  return {
    progress,
    flat: smoothstep(progress / 0.45),
    depth: smoothstep((progress - 0.18) / 0.46),
    reveal: smoothstep((progress - 0.45) / 0.4),
    flash: 0,
    exit: easeOutQuad((progress - 0.9) / 0.1),
  };
}

/**
 * Browser RAF pauses or throttles in a background tab. Clamp the first frame
 * after resuming and ignore frames that are still hidden so background time
 * can never consume the WebGL readiness timeout.
 */
export function resolveVisibleFrameDelta(
  now: number,
  previous: number | null,
  visibility: DocumentVisibilityState,
): number {
  if (
    visibility !== "visible"
    || previous === null
    || !Number.isFinite(now)
    || !Number.isFinite(previous)
  ) {
    return 0;
  }

  return Math.min(
    MAX_VISIBLE_FRAME_DELTA_MS,
    Math.max(0, now - previous),
  );
}

const SCENE_IDLE_TIMEOUT_MS = 400;

/**
 * Runs `start` once the document has loaded and the main thread has a gap,
 * so the 3D bundle downloads and compiles behind the opening card instead of
 * competing with hydration. Returns a cancel function.
 */
export function scheduleAfterLoad(start: () => void, target: Window = window): () => void {
  let idle: number | null = null;
  let timer: number | null = null;
  const request = () => {
    if (typeof target.requestIdleCallback === "function") {
      idle = target.requestIdleCallback(start, { timeout: SCENE_IDLE_TIMEOUT_MS });
    } else {
      timer = target.setTimeout(start, 0);
    }
  };
  if (target.document.readyState === "complete") request();
  else target.addEventListener("load", request, { once: true });
  return () => {
    target.removeEventListener("load", request);
    if (idle !== null) target.cancelIdleCallback(idle);
    if (timer !== null) target.clearTimeout(timer);
  };
}
