import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EVENT_NAMES, LOCALES, PAGE_PATTERN, TARGET_URL_PATTERN, parseEventPayload } from "@/lib/analytics/events";

/**
 * The application rule and the database rule for a stored outbound URL must
 * be the same rule. When they drifted, the app accepted `@` and the CHECK
 * rejected it, so a legitimate URL passed validation and then failed as a
 * 503 at write time — the worst place to discover a disagreement.
 */
const migration = readFileSync(
  path.resolve(import.meta.dirname, "../db/migrations/0001_attribution.sql"),
  "utf8",
);

describe("validator and CHECK constraint share one rule per column", () => {
  // Looped over both columns on purpose. The first version of this guard
  // covered target_url only, so when the `..` rule was added to the page
  // validator the CHECK silently fell behind — the same drift, in the
  // sibling column, under a test written to prevent exactly it.
  it.each([
    ["page_path", PAGE_PATTERN],
    ["target_url", TARGET_URL_PATTERN],
  ])("%s", (column, pattern) => {
    const match = migration.match(new RegExp(`${column} ~ '([^']+)'`));
    expect(match, `no ${column} regex found in the migration`).toBeTruthy();
    expect(match?.[1]).toBe(pattern);
  });

  it("also carries the page rules the regex cannot express", () => {
    // `//` and `..` are checked separately in the validator, so the CHECK
    // needs them separately too.
    expect(migration).toContain("page_path NOT LIKE '%//%'");
    expect(migration).toContain("page_path NOT LIKE '%..%'");
  });
});

/**
 * WEB-P1-03: event-name and locale vocabularies are also one rule shared with
 * the database. 0006 owns both CHECKs; the app lists must equal its lists in
 * both directions, so a name added on one side fails here, not as a 503.
 */
describe("0006 CHECK constraints equal the application vocabularies", () => {
  const funnel = readFileSync(
    path.resolve(import.meta.dirname, "../db/migrations/0006_funnel_events_locales.sql"),
    "utf8",
  );
  function listFor(constraint: string, column: string): string[] {
    const start = funnel.indexOf(`ADD CONSTRAINT ${constraint} CHECK (${column} IN`);
    expect(start, `no ${constraint} in 0006`).toBeGreaterThan(-1);
    const end = funnel.indexOf("));", start);
    return [...funnel.slice(start, end).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  it("event_name list equals EVENT_NAMES", () => {
    const sql = listFor("attributions_event_name_check", "event_name");
    expect([...sql].sort()).toEqual([...EVENT_NAMES].sort());
    expect(sql).toHaveLength(16);
  });

  it("locale list equals LOCALES (the 14 routing locales)", () => {
    const sql = listFor("attributions_locale_check", "locale");
    expect([...sql].sort()).toEqual([...LOCALES].sort());
    expect(sql).toHaveLength(14);
  });

  it("marks both constraints with the 0006 migration comment", () => {
    for (const name of ["attributions_event_name_check", "attributions_locale_check"]) {
      expect(funnel).toContain(`COMMENT ON CONSTRAINT ${name} ON attributions`);
    }
    expect(funnel.match(/yulalab:migration=0006:funnel-events-locales/g)).toHaveLength(2);
  });
});

describe("percent- and plus-encoding cannot smuggle free text into a target", () => {
  function post(target: string) {
    return parseEventPayload({
      v: 1,
      event: "store_outbound",
      locale: "tr",
      page: "/projects/lifeos",
      product: "lifeos",
      session: "a".repeat(32),
      target,
      targetCategory: "store",
    });
  }

  it.each([
    ["a space-encoded name and email", "https://apps.apple.com/ad%20soyad%20kaan.kocak%40gmail.com"],
    ["a fully percent-encoded email", "https://apps.apple.com/%73%6f%6d%65%6f%6e%65%40%65%78%61%6d%70%6c%65%2e%63%6f%6d"],
    ["a plus-encoded name and phone", "https://apps.apple.com/kaan+kocak+05551112233"],
    ["a bare @ in the path", "https://apps.apple.com/kaan@example.com"],
  ])("rejects %s", (_label, target) => {
    const result = post(target);
    expect(result.ok).toBe(false);
  });

  it("still accepts an ordinary store URL", () => {
    expect(post("https://apps.apple.com/app/id6771527233").ok).toBe(true);
  });

  it("rejects, rather than 503s, a handle-style URL the database would refuse", () => {
    // youtube.com is on the allowlist because burunfarki.ts ships
    // https://youtube.com/@burunfarki. Before this rule the app said yes and
    // the CHECK said no.
    const result = post("https://youtube.com/@burunfarki");
    expect(result.ok).toBe(false);
  });
});
