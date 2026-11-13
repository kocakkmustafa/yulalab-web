/** Read-only loader + argument handling for scripts/locale-report.ts. Never writes. */
import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LOCALES } from "../../src/i18n/locales";
import {
  buildReport, extractRequiredPhrases, flatten, formatJson, formatMarkdown, formatText, isSourceLocale, strictViolations,
  type AuditInput, type SourceFile,
} from "./locale-audit";

function readJson(file: string): unknown | null {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as unknown) : null;
}
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []))
    .sort();
}

export function loadInputs(root: string, locales: readonly string[] = SUPPORTED_LOCALES): AuditInput {
  const messages: AuditInput["messages"] = {};
  const content: AuditInput["content"] = {};
  for (const locale of locales) {
    const cat = readJson(path.join(root, "messages", `${locale}.json`));
    messages[locale] = cat === null ? null : flatten(cat);
    if (!isSourceLocale(locale)) {
      const c = readJson(path.join(root, "messages", `content-${locale}.json`));
      content[locale] = c && typeof c === "object" && !Array.isArray(c) ? (c as Record<string, unknown>) : null;
    }
  }
  const files: SourceFile[] = walk(path.join(root, "src")).map((p) => ({ path: p, content: fs.readFileSync(p, "utf8") }));
  return { locales, messages, content, required: new Set(extractRequiredPhrases(files).keys()) };
}

export type CliResult = { output: string; error: string; exitCode: number };

export function runLocaleReport(argv: readonly string[], root: string): CliResult {
  const flags = { list: false, markdown: false, json: false, strict: false };
  let max = 20;
  let only: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") flags.list = true;
    else if (a === "--markdown") flags.markdown = true;
    else if (a === "--json") flags.json = true;
    else if (a === "--strict") flags.strict = true;
    else if (a === "--max" || a === "--locale") {
      const v = argv[++i];
      if (v === undefined) return { output: "", error: `${a} değer ister`, exitCode: 2 };
      if (a === "--max") { max = Number(v); if (!Number.isInteger(max) || max < 0) return { output: "", error: "--max negatif olmayan tam sayı olmalı", exitCode: 2 }; }
      else only = v;
    } else return { output: "", error: `Bilinmeyen argüman: ${a}`, exitCode: 2 };
  }
  if (only !== undefined && !(SUPPORTED_LOCALES as readonly string[]).includes(only)) {
    return { output: "", error: `Bilinmeyen dil: ${only} (${SUPPORTED_LOCALES.join(", ")})`, exitCode: 2 };
  }
  const input = loadInputs(root);
  const full = buildReport(input);
  const report = only ? { ...full, rows: full.rows.filter((r) => r.locale === only) } : full;
  if (only) {
    const t = { missing: 0, extra: 0, mismatch: 0, pending: 0 };
    for (const r of report.rows) for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += r.totals[k];
    report.totals = t;
  }
  const opts = { list: flags.list, max };
  const output = flags.json ? formatJson(report) : flags.markdown ? formatMarkdown(report, opts) : formatText(report, opts);
  return { output, error: "", exitCode: flags.strict && strictViolations(report) > 0 ? 1 : 0 };
}
