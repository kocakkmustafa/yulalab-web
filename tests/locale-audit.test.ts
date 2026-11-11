import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../src/i18n/locales";
import {
  buildReport, diffCatalogue, diffContent, extractRequiredPhrases, flatten, formatMarkdown, formatText, isLanguageIndependent,
} from "../scripts/lib/locale-audit";
import { loadInputs, runLocaleReport } from "../scripts/lib/locale-report-cli";

const repo = path.resolve(import.meta.dirname, "..");

describe("language-independent rule (brand / technical values are never 'pending')", () => {
  it.each(["YULA Lab", "iOS", "AES-256", "https://yulalab.com", "info@yulalab.com", "/tr/contact", "2026", "—", "KVKK", "LifeOS {count}", "v2"])("%s is independent", (v) => {
    expect(isLanguageIndependent(v)).toBe(true);
  });
  it.each(["Contact", "Contact us", "Privacy policy", "Back to contact", "YULA Lab team"])("%s needs a human translation", (v) => {
    expect(isLanguageIndependent(v)).toBe(false);
  });
});

describe("catalogue diff on synthetic fixtures", () => {
  const en = { "a.title": "Hello {name}", "a.body": "Body text", "a.brand": "YULA Lab", "a.empty": "", "b.only": "Only in en" };
  it("detects missing, extra, placeholder, empty-pattern and pending, sorted", () => {
    const de = { "a.title": "Hallo {who}", "a.body": "Body text", "a.brand": "YULA Lab", "a.empty": "x", "z.extra": "z", "c.extra": "c" };
    const d = diffCatalogue(en, de, "de");
    expect(d.missing).toEqual(["b.only"]);
    expect(d.extra).toEqual(["c.extra", "z.extra"]);
    expect(d.placeholder).toEqual(["a.title"]);
    expect(d.emptyPattern).toEqual(["a.empty"]);
    expect(d.pending).toEqual(["a.body"]); // brand value and empty value are not counted
  });
  it("never counts tr/en as pending", () => {
    expect(diffCatalogue(en, { ...en }, "tr").pending).toEqual([]);
    expect(diffCatalogue(en, { ...en }, "en").pending).toEqual([]);
  });
  it("content: missing, stale (orphan), placeholder and pending", () => {
    const d = diffContent(["Save {n}", "Hello world", "Gone soon", "YULA Lab"], { "Save {n}": "Speichern", "Hello world": "Hello world", "YULA Lab": "YULA Lab", "Old sentence": "Alter Satz" });
    expect(d.missing).toEqual(["Gone soon"]);
    expect(d.stale).toEqual(["Old sentence"]);
    expect(d.placeholder).toEqual(["Save {n}"]);
    expect(d.pending).toEqual(["Hello world"]);
  });
  it("flatten walks nested trees and rejects non-string leaves", () => {
    expect(flatten({ a: { b: "x" }, c: "y" })).toEqual({ "a.b": "x", c: "y" });
    expect(() => flatten({ a: 1 })).toThrow();
  });
  it("output is deterministic regardless of input key order", () => {
    const mk = (order: string[]) => buildReport({ locales: ["en", "de"], messages: { en: { k1: "A one", k2: "B two" }, de: Object.fromEntries(order.map((k) => [k, "x"])) }, content: { de: {} }, required: ["z", "a"] });
    const a = formatText(mk(["k1", "x2", "x1"]), { list: true, max: 20 });
    const b = formatText(mk(["x1", "k1", "x2"]), { list: true, max: 20 });
    expect(a).toBe(b);
    expect(a).toContain("k2"); // missing key is listed
  });
  it("--max truncates with '… +N daha'", () => {
    const en2 = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`k${i}`, `Text ${i}`]));
    const r = buildReport({ locales: ["en", "fr"], messages: { en: en2, fr: {} }, content: { fr: {} }, required: [] });
    expect(formatText(r, { list: true, max: 2 })).toContain("… +3 daha");
    expect(formatMarkdown(r, { list: true, max: 2 })).toContain("… +3 daha");
  });
});

describe("source scan", () => {
  it("finds text() calls and {tr,en} / xTr+xEn objects, skips technical and excluded files", () => {
    const f = (p: string, content: string) => ({ path: p, content });
    const found = extractRequiredPhrases([
      f("/r/src/a.tsx", 'const a = text(l, "Merhaba", "Hello"); const o = { tr: "Selam", en: "Hi {n}" }; const p = { titleTr: "Baslik", titleEn: "Title" }; const t = { tr: "x", en: "en" }; const u = { tr: "a", en: "/path" };'),
      f("/r/src/server/b.ts", 'const o = { tr: "x", en: "Server only" };'),
    ]);
    expect([...found.keys()].sort()).toEqual(["Hello", "Hi {n}", "Title"]);
  });
});

describe("CLI", () => {
  function fixture(drift: boolean): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "locale-audit-"));
    fs.mkdirSync(path.join(root, "messages")); fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "x.ts"), 'export const s = text(l, "Merhaba dünya", "Hello world");');
    fs.writeFileSync(path.join(root, "messages", "en.json"), JSON.stringify({ ns: { a: "Hello {x}" } }));
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      fs.writeFileSync(path.join(root, "messages", `${locale}.json`), JSON.stringify({ ns: { a: `Hi {x} ${locale}` } }));
      if (locale !== "tr") fs.writeFileSync(path.join(root, "messages", `content-${locale}.json`), JSON.stringify({ "Hello world": `Hallo ${locale}` }));
    }
    if (drift) fs.writeFileSync(path.join(root, "messages", "content-de.json"), JSON.stringify({ "Hello world": "Hallo", "Old": "Alt" }));
    return root;
  }
  it("strict exits 0 on a clean catalogue, 1 on drift; default is always 0", () => {
    const clean = fixture(false), drift = fixture(true);
    expect(runLocaleReport(["--strict"], clean).exitCode).toBe(0);
    expect(runLocaleReport(["--strict"], drift).exitCode).toBe(1);
    expect(runLocaleReport([], drift).exitCode).toBe(0);
    expect(runLocaleReport(["--strict", "--locale", "fr"], drift).exitCode).toBe(0);
  });
  it("rejects bad arguments with exit 2", () => {
    const root = fixture(false);
    expect(runLocaleReport(["--locale", "xx"], root).exitCode).toBe(2);
    expect(runLocaleReport(["--max", "-1"], root).exitCode).toBe(2);
    expect(runLocaleReport(["--wat"], root).exitCode).toBe(2);
  });
  it("--json is machine readable and --locale filters", () => {
    const parsed = JSON.parse(runLocaleReport(["--json", "--locale", "de"], fixture(true)).output) as { rows: { locale: string; content: { stale: string[] } }[] };
    expect(parsed.rows.map((r) => r.locale)).toEqual(["de"]);
    expect(parsed.rows[0].content.stale).toEqual(["Old"]);
  });
});

describe("real repository catalogue", () => {
  const report = buildReport(loadInputs(repo));
  it("reports all 14 locales; tr/en pending is 0 and has no content file", () => {
    expect(report.rows.map((r) => r.locale)).toEqual([...SUPPORTED_LOCALES]);
    for (const code of ["tr", "en"]) {
      const row = report.rows.find((r) => r.locale === code)!;
      expect(row.totals.pending).toBe(0);
      expect(row.content).toBeNull();
    }
  });
  it("has no message drift (verify-translations gate parity)", () => {
    for (const row of report.rows) {
      expect(row.messages.missing, row.locale).toEqual([]);
      expect(row.messages.extra, row.locale).toEqual([]);
      expect(row.content?.missing ?? [], row.locale).toEqual([]);
    }
  });
  it("requiredSourcePhrases equals verify-translations' own count", () => {
    const out = execFileSync(process.execPath, ["--import", "tsx", "scripts/verify-translations.ts"], { cwd: repo, encoding: "utf8", timeout: 30_000 });
    const gate = JSON.parse(out) as { requiredSourcePhrases: number; messageLeaves: number };
    expect(report.requiredSourcePhrases).toBe(gate.requiredSourcePhrases);
    expect(report.messageLeaves).toBe(gate.messageLeaves);
  }, 40_000);
});
