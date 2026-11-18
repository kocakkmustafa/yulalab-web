import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

/**
 * WEB-P2-01d: the Lab's own key set, named, so the repo-wide fallback gate
 * (scripts/verify-translations.ts) cannot quietly stop covering it. In all
 * fourteen locales a Lab message equal to its English source is allowed only
 * when it is on the same-as-English allowlist (proper nouns, loanwords).
 */
const LAB_NAMESPACES = ["labDemos", "lifeosDemo", "ostinatoDemo", "braavolabsRunDemo", "braavolabsDemo"] as const;
const root = process.cwd();
const readJson = (file: string): Record<string, unknown> => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const leaves = (value: unknown, prefix: string): Record<string, string> =>
  typeof value === "string"
    ? { [prefix]: value }
    : Object.assign({}, ...Object.entries(value as object).map(([k, v]) => leaves(v, `${prefix}.${k}`)));
const labKeys = (cat: Record<string, unknown>) =>
  Object.assign({}, ...LAB_NAMESPACES.map((ns) => leaves(cat[ns], ns))) as Record<string, string>;
const technical = (v: string) => !/[A-Za-z]/.test(v.replace(/\{[^{}]+\}/g, ""));
const allow = readJson("scripts/translation-same-as-en.json") as Record<string, { messages?: string[]; content?: string[] }>;
const secondary = SUPPORTED_LOCALES.filter((l) => l !== "tr" && l !== "en");

/** English phrases the Lab page itself passes to `text(locale, tr, en)`. */
const pageSource = fs.readFileSync(path.join(root, "src/app/[locale]/lab/page.tsx"), "utf8");
const pagePhrases = [
  ...pageSource.matchAll(/text\(\s*locale,\s*"(?:[^"\\]|\\.)*",\s*"((?:[^"\\]|\\.)*)"/g),
  ...pageSource.matchAll(/^\s+en:\s*"((?:[^"\\]|\\.)*)",?$/gm),
].map((m) => m[1]);

describe("lab translations (14 locales)", () => {
  const en = labKeys(readJson("messages/en.json"));

  it("names a non-trivial Lab key set and covers every supported locale", () => {
    expect(Object.keys(en).length).toBeGreaterThan(100);
    expect(SUPPORTED_LOCALES).toHaveLength(14);
    expect(secondary).toHaveLength(12);
    expect(pagePhrases.length).toBeGreaterThanOrEqual(10);
  });

  it.each(secondary)("%s: no Lab message falls back to English unless allow-listed", (locale) => {
    const actual = labKeys(readJson(`messages/${locale}.json`));
    expect(Object.keys(actual).sort()).toEqual(Object.keys(en).sort());
    const allowed = new Set(allow[locale]?.messages ?? []);
    const fallbacks = Object.entries(en)
      .filter(([k, v]) => v.trim() && !technical(v) && actual[k] === v && !allowed.has(k))
      .map(([k]) => k);
    expect(fallbacks).toEqual([]);
    // an allow-listed Lab key must really be equal to English (no stale entries)
    for (const k of allowed) if (LAB_NAMESPACES.some((ns) => k.startsWith(`${ns}.`))) expect(actual[k], k).toBe(en[k]);
  });

  it.each(secondary)("%s: Lab page phrases are translated in the content catalogue", (locale) => {
    const content = readJson(`messages/content-${locale}.json`) as Record<string, string>;
    const allowed = new Set(allow[locale]?.content ?? []);
    const bad = pagePhrases.filter(
      (p) => !(typeof content[p] === "string" && content[p].trim()) || (content[p] === p && !technical(p) && !allowed.has(p)),
    );
    expect(bad).toEqual([]);
  });

  it("tr and en catalogues carry the same Lab keys", () => {
    expect(Object.keys(labKeys(readJson("messages/tr.json"))).sort()).toEqual(Object.keys(en).sort());
  });
});
