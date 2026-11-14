/**
 * Pure timing scoring for the Ostinato rhythm feel try-out (WEB-P1-02).
 * No DOM, no audio, no clock: times are plain milliseconds on one timeline.
 */
export type Rating = "perfect" | "good" | "miss";

/** |deviation| up to and including this is "perfect". */
export const PERFECT_MS = 60;
/** |deviation| up to and including this (and above PERFECT_MS) is "good". */
export const GOOD_MS = 120;
const POINTS: Record<Rating, number> = { perfect: 1, good: 0.5, miss: 0 };

export function rateDeviation(deviationMs: number): Rating {
  const d = Math.abs(deviationMs);
  if (!Number.isFinite(d)) return "miss";
  if (d <= PERFECT_MS) return "perfect";
  if (d <= GOOD_MS) return "good";
  return "miss";
}

/** Nearest beat to a tap; `deviationMs` is tap minus beat (negative = early). */
export function nearestBeat(tapMs: number, beats: readonly number[]): { index: number; deviationMs: number } | null {
  let best: { index: number; deviationMs: number } | null = null;
  for (let i = 0; i < beats.length; i++) {
    const deviationMs = tapMs - beats[i];
    if (best === null || Math.abs(deviationMs) < Math.abs(best.deviationMs)) best = { index: i, deviationMs };
  }
  return best;
}

export type BeatScore = { rating: Rating; deviationMs: number | null };
export type RoundScore = {
  perBeat: BeatScore[];
  perfect: number;
  good: number;
  miss: number;
  /** 0..100, whole percent: perfect = 1 point, good = half, missed = 0, over all beats. */
  accuracyPct: number;
};

/** Each tap goes to its nearest beat; a beat keeps its closest tap; no tap = missed. */
export function scoreRound(taps: readonly number[], beats: readonly number[]): RoundScore {
  const perBeat: BeatScore[] = beats.map(() => ({ rating: "miss", deviationMs: null }));
  for (const tap of taps) {
    const hit = nearestBeat(tap, beats);
    if (!hit) continue;
    const prev = perBeat[hit.index];
    if (prev.deviationMs === null || Math.abs(hit.deviationMs) < Math.abs(prev.deviationMs)) {
      perBeat[hit.index] = { rating: rateDeviation(hit.deviationMs), deviationMs: hit.deviationMs };
    }
  }
  const count = (r: Rating) => perBeat.filter((b) => b.rating === r).length;
  const perfect = count("perfect");
  const good = count("good");
  const miss = count("miss");
  const points = perfect * POINTS.perfect + good * POINTS.good;
  const accuracyPct = beats.length === 0 ? 0 : Math.round((points / beats.length) * 100);
  return { perBeat, perfect, good, miss, accuracyPct };
}
