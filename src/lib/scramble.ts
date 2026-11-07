/**
 * Decode ("scramble") text effect, as a pure function of progress so the
 * loader can drive it from its own deterministic clock and capture mode can
 * render an exact frame.
 *
 * Every character starts as a stand-in drawn from the text's OWN glyphs (so
 * Arabic stays Arabic, Japanese stays Japanese) and resolves left to right in
 * reading order. Whitespace never scrambles, so line breaks and word widths
 * stay put while the text decodes.
 */

const RESOLVE_SPREAD = 0.82;

/** Characters of `text` as code points (keeps surrogate pairs together). */
function glyphs(text: string): string[] {
  return Array.from(text);
}

/** Unique non-space glyphs of the text; the pool stand-ins are drawn from. */
export function scramblePool(text: string): string[] {
  const pool: string[] = [];
  for (const glyph of glyphs(text)) {
    if (/\s/u.test(glyph) || pool.includes(glyph)) continue;
    pool.push(glyph);
  }
  return pool;
}

/** Small integer hash: the same (index, tick) always picks the same glyph. */
function hash(index: number, tick: number): number {
  let h = (index + 1) * 374_761_393 + (tick + 1) * 668_265_263;
  h = (h ^ (h >>> 13)) * 1_274_126_177;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The visible string at `progress` (0 = fully scrambled, 1 = the text).
 * `tick` changes the stand-in glyphs between frames.
 */
export function scrambleFrame(text: string, progress: number, tick: number): string {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 1;
  if (p >= 1) return text;
  const chars = glyphs(text);
  const pool = scramblePool(text);
  if (pool.length < 2) return text;
  const count = chars.length;
  return chars
    .map((glyph, index) => {
      if (/\s/u.test(glyph)) return glyph;
      const resolveAt = (index / count) * RESOLVE_SPREAD + (1 - RESOLVE_SPREAD);
      if (p >= resolveAt) return glyph;
      return pool[hash(index, tick) % pool.length];
    })
    .join("");
}
