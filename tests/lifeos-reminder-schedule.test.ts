import { describe, expect, it } from "vitest";
import { formatReminder, planReminder, zonedWallToInstant } from "../src/components/projects/lifeos-reminder-schedule";

const iso = (d: Date) => d.toISOString();

describe("planReminder (WEB-P1-01)", () => {
  it("day and week land at 09:00 local on the calendar date, fixed clock", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    expect(iso(planReminder(now, "day", "Europe/Istanbul").at)).toBe("2026-11-16T06:00:00.000Z");
    expect(iso(planReminder(now, "week", "Europe/Istanbul").at)).toBe("2026-11-22T06:00:00.000Z");
    expect(iso(planReminder(now, "day", "UTC").at)).toBe("2026-11-16T09:00:00.000Z");
  });

  it("uses the zone's calendar day, not the UTC day, at the boundaries", () => {
    // 23:30 UTC on the 15th is already the 16th in Istanbul (UTC+3): +1 day is the 17th.
    const late = new Date("2026-11-15T23:30:00Z");
    expect(iso(planReminder(late, "day", "Europe/Istanbul").at)).toBe("2026-11-17T06:00:00.000Z");
    expect(iso(planReminder(late, "day", "UTC").at)).toBe("2026-11-16T09:00:00.000Z");
    // 00:00 and 23:59 local of one day give the same target.
    const a = planReminder(new Date("2026-11-14T21:00:00Z"), "day", "Europe/Istanbul").at;
    const b = planReminder(new Date("2026-11-15T20:59:00Z"), "day", "Europe/Istanbul").at;
    expect(iso(a)).toBe(iso(b));
  });

  it("rolls over month and year ends and a leap day", () => {
    expect(iso(planReminder(new Date("2026-12-31T10:00:00Z"), "day", "UTC").at)).toBe("2027-01-01T09:00:00.000Z");
    expect(iso(planReminder(new Date("2027-12-28T10:00:00Z"), "week", "UTC").at)).toBe("2028-01-04T09:00:00.000Z");
    expect(iso(planReminder(new Date("2028-02-28T10:00:00Z"), "day", "UTC").at)).toBe("2028-02-29T09:00:00.000Z");
    expect(iso(planReminder(new Date("2027-02-28T10:00:00Z"), "day", "UTC").at)).toBe("2027-03-01T09:00:00.000Z");
  });

  it("keeps 09:00 local across a spring-forward change (New York, 2026-03-08)", () => {
    const at = planReminder(new Date("2026-03-07T15:00:00Z"), "day", "America/New_York").at;
    // 09:00 EDT = 13:00Z (09:00 EST would be 14:00Z).
    expect(iso(at)).toBe("2026-03-08T13:00:00.000Z");
    const week = planReminder(new Date("2026-03-04T15:00:00Z"), "week", "America/New_York").at;
    expect(iso(week)).toBe("2026-03-11T13:00:00.000Z");
  });

  it("keeps 09:00 local across a fall-back change (Berlin, 2026-10-25)", () => {
    const at = planReminder(new Date("2026-10-24T10:00:00Z"), "day", "Europe/Berlin").at;
    // 09:00 CET = 08:00Z.
    expect(iso(at)).toBe("2026-10-25T08:00:00.000Z");
    const week = planReminder(new Date("2026-10-20T10:00:00Z"), "week", "Europe/Berlin").at;
    expect(iso(week)).toBe("2026-10-27T08:00:00.000Z");
  });

  it("handles a half-hour zone and a date-line zone", () => {
    expect(iso(planReminder(new Date("2026-11-15T12:00:00Z"), "day", "Asia/Kolkata").at)).toBe("2026-11-16T03:30:00.000Z");
    expect(iso(planReminder(new Date("2026-11-15T12:00:00Z"), "day", "Pacific/Kiritimati").at)).toBe("2026-11-16T19:00:00.000Z");
  });

  it("formats in the requested zone and locale", () => {
    const plan = planReminder(new Date("2026-11-15T12:00:00Z"), "day", "Europe/Istanbul");
    expect(formatReminder(plan, "en", "Europe/Istanbul")).toContain("November 16, 2026");
    expect(formatReminder(plan, "en", "Europe/Istanbul")).toMatch(/9:00\s?AM/);
    expect(formatReminder(plan, "tr", "Europe/Istanbul")).toContain("16 Kasım 2026");
  });
});

describe("zonedWallToInstant gaps and overlaps", () => {
  it("a wall time inside a spring-forward gap shifts forward by the gap", () => {
    // 02:30 on 2026-03-08 does not exist in New York; 03:30 EDT = 07:30Z.
    expect(iso(new Date(zonedWallToInstant({ y: 2026, m: 3, d: 8, h: 2, mi: 30 }, "America/New_York")))).toBe("2026-03-08T07:30:00.000Z");
  });
  it("an ambiguous fall-back wall time takes the first occurrence", () => {
    // 01:30 on 2026-11-01 happens twice in New York; first is EDT = 05:30Z.
    expect(iso(new Date(zonedWallToInstant({ y: 2026, m: 11, d: 1, h: 1, mi: 30 }, "America/New_York")))).toBe("2026-11-01T05:30:00.000Z");
  });
});
