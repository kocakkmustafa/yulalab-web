/**
 * WEB-P1-01: pure schedule maths for the synthetic reminder preview.
 * Nothing here touches the clock, storage or network: the caller passes the
 * instant and the IANA time zone. The reminder is a calendar offset at a fixed
 * local wall-clock time, so a daylight-saving change between now and then does
 * not move it off 09:00 local time.
 */
export const REMINDER_OFFSETS = { day: 1, week: 7 } as const;
export type ReminderOffset = keyof typeof REMINDER_OFFSETS;
export const REMINDER_HOUR = 9;

type Wall = { y: number; m: number; d: number; h: number; mi: number };

/** Wall-clock parts of an instant in a time zone. */
function wallOf(at: number, timeZone: string): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  }).formatToParts(new Date(at));
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: n("year"), m: n("month"), d: n("day"), h: n("hour"), mi: n("minute") };
}

/** Offset (ms) of the zone from UTC at an instant, minute precision. */
function offsetAt(at: number, timeZone: string): number {
  const w = wallOf(at, timeZone);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi) - Math.floor(at / 60000) * 60000;
}

/**
 * Instant for a wall-clock time in a zone. A time that does not exist (spring
 * forward gap) lands just after the gap; an ambiguous one (fall back) takes
 * the first occurrence.
 */
export function zonedWallToInstant(w: Wall, timeZone: string): number {
  const guess = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi);
  const o1 = offsetAt(guess - 24 * 3600000, timeZone);
  const o2 = offsetAt(guess + 24 * 3600000, timeZone);
  const candidates = [...new Set([o1, o2])].map((o) => guess - o).sort((a, b) => a - b);
  for (const c of candidates) {
    const back = wallOf(c, timeZone);
    if (back.y === w.y && back.m === w.m && back.d === w.d && back.h === w.h && back.mi === w.mi) return c;
  }
  // Gap: shift forward by the gap length (the usual wall-clock convention).
  return candidates[candidates.length - 1];
}

export type ReminderPlan = { at: Date; offset: ReminderOffset };

/** Reminder instant: `now` plus the calendar offset, at 09:00 local in `timeZone`. */
export function planReminder(now: Date, offset: ReminderOffset, timeZone: string): ReminderPlan {
  const w = wallOf(now.getTime(), timeZone);
  const target = new Date(Date.UTC(w.y, w.m - 1, w.d + REMINDER_OFFSETS[offset]));
  const at = zonedWallToInstant(
    { y: target.getUTCFullYear(), m: target.getUTCMonth() + 1, d: target.getUTCDate(), h: REMINDER_HOUR, mi: 0 },
    timeZone,
  );
  return { at: new Date(at), offset };
}

/** Human date and time for the plan, in the given locale and zone. */
export function formatReminder(plan: ReminderPlan, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full", timeStyle: "short" }).format(plan.at);
}
