/**
 * Locale maintenance audit — pure functions, no I/O, no side effects.
 * The CI gate stays scripts/verify-translations.ts; this module only reports.
 * The AST scan below is a deliberate re-implementation of that script's scan;
 * tests/locale-audit.test.ts locks the two to the same `requiredSourcePhrases`.
 */
import path from "node:path";
import ts from "typescript";

export type Flat = Record<string, string>;
export type SourceFile = { path: string; content: string };

export const SOURCE_LOCALES = ["tr", "en"] as const;

/** Sort without locale dependence so output is identical on every machine. */
export const byCode = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (items: Iterable<string>): string[] => [...items].sort(byCode);

export function isSourceLocale(locale: string): boolean {
  return (SOURCE_LOCALES as readonly string[]).includes(locale);
}

/** Flatten a nested namespace tree to dotted keys. Non-string leaves are rejected. */
export function flatten(value: unknown, prefix = ""): Flat {
  if (typeof value === "string") return { [prefix]: value };
  if (value && typeof value === "object") {
    const out: Flat = {};
    for (const [key, child] of Object.entries(value)) Object.assign(out, flatten(child, prefix ? `${prefix}.${key}` : key));
    return out;
  }
  throw new Error(`Non-string message leaf: ${prefix}`);
}

export const placeholders = (value: string): string[] => [...value.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).sort(byCode);
const samePlaceholders = (a: string, b: string) => JSON.stringify(placeholders(a)) === JSON.stringify(placeholders(b));

/**
 * Brand and technical terms that are legitimately identical in every language.
 * Case-sensitive whole-word/phrase matches; extend deliberately, not by guess.
 */
export const LANGUAGE_INDEPENDENT_TERMS: readonly string[] = [
  "Yula Lab", "YULA Lab", "Braavolabs", "LifeOS", "Burun Farkı", "Ostinato", "Lissom", "Gravita", "Choreia", "JabLab",
  "iOS", "iPhone", "iPad", "Android", "macOS", "Netlify", "Next.js", "Claude", "Anthropic", "GitHub",
  "App Store", "Google Play", "Supabase", "Instagram", "LinkedIn", "YouTube",
];

/**
 * A value counts as "language independent" (never waiting for human translation) when,
 * after removing {placeholders} and known brand phrases, every remaining word is:
 *   - letterless (numbers, punctuation, symbols), or
 *   - at most 2 letters, or
 *   - a URL, e-mail address or absolute path, or
 *   - an ALL-CAPS / digit token (acronym or product code, e.g. "AES-256", "KVKK"), or
 *   - a camelCase brand token (e.g. "iOS", "macOS"), or
 *   - a single capitalised or mixed token that carries a digit.
 * Anything containing an ordinary lowercase word ("Contact us") is NOT independent.
 */
export function isLanguageIndependent(value: string): boolean {
  let rest = value.replace(/\{[^{}]+\}/g, " ");
  for (const term of [...LANGUAGE_INDEPENDENT_TERMS].sort((a, b) => b.length - a.length)) rest = rest.split(term).join(" ");
  const words = rest.split(/\s+/).filter(Boolean);
  return words.every((word) => {
    if (!/\p{L}/u.test(word)) return true;
    if (/^(?:https?:|mailto:)/i.test(word) || /^\S+@\S+\.\S+$/.test(word) || word.startsWith("/")) return true;
    const letters = word.match(/\p{L}/gu)?.length ?? 0;
    if (letters <= 2) return true;
    if (/^[\p{Lu}\d][\p{Lu}\d\-+./_:]*$/u.test(word)) return true;
    if (/^\p{Ll}+\p{Lu}[\p{L}\d]*$/u.test(word)) return true;
    return /\d/.test(word) && /^[\p{L}\d\-+./_:]+$/u.test(word);
  });
}

export type CatalogueDiff = {
  missing: string[];
  extra: string[];
  placeholder: string[];
  emptyPattern: string[];
  pending: string[];
};

/** Compare one locale's flat catalogue with the English source. */
export function diffCatalogue(source: Flat, actual: Flat, locale: string): CatalogueDiff {
  const missing: string[] = [], placeholder: string[] = [], emptyPattern: string[] = [], pending: string[] = [];
  for (const [key, value] of Object.entries(source)) {
    const got = actual[key];
    if (typeof got !== "string") { missing.push(key); continue; }
    if (!samePlaceholders(value, got)) placeholder.push(key);
    if (Boolean(value.trim()) !== Boolean(got.trim())) emptyPattern.push(key);
    if (!isSourceLocale(locale) && got === value && !isLanguageIndependent(value)) pending.push(key);
  }
  const extra = Object.keys(actual).filter((key) => !(key in source));
  return { missing: sorted(missing), extra: sorted(extra), placeholder: sorted(placeholder), emptyPattern: sorted(emptyPattern), pending: sorted(pending) };
}

export type ContentDiff = { missing: string[]; stale: string[]; placeholder: string[]; pending: string[] };

/** Compare content-<locale>.json (key = English source phrase) with the phrases the source tree requires. */
export function diffContent(required: ReadonlySet<string> | readonly string[], actual: Record<string, unknown>): ContentDiff {
  const need = new Set(required);
  const missing: string[] = [], placeholder: string[] = [], pending: string[] = [];
  for (const key of need) {
    const got = actual[key];
    if (typeof got !== "string" || !got.trim()) { missing.push(key); continue; }
    if (!samePlaceholders(key, got)) placeholder.push(key);
    else if (got === key && !isLanguageIndependent(key)) pending.push(key);
  }
  const stale = Object.keys(actual).filter((key) => !need.has(key));
  return { missing: sorted(missing), stale: sorted(stale), placeholder: sorted(placeholder), pending: sorted(pending) };
}

/* ---------- source scan (mirror of verify-translations' AST scan) ---------- */

const TECHNICAL_EN = new Set(["en", "tr", "en-GB", "en_US", "opacity-60"]);

/** Same exclusions as verify-translations: TR/EN backend contracts are not catalogue copy. */
export function isExcludedSource(file: string): boolean {
  const s = path.sep;
  return file.endsWith(`${s}i18n${s}locales.ts`) || file.endsWith(`${s}data${s}privacy-copy.ts`) || file.includes(`${s}server${s}`)
    || file.endsWith(`${s}lib${s}studio.ts`) || file.endsWith(`${s}data-request${s}verify${s}route.ts`);
}

function literal(node: ts.Node): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => `{${span.expression.getText()}}${span.literal.text}`).join("");
  return undefined;
}
const propName = (item: ts.PropertyAssignment) => item.name.getText().replace(/^["']|["']$/g, "");
const prop = (node: ts.ObjectLiteralExpression, name: string) =>
  node.properties.find((item): item is ts.PropertyAssignment => ts.isPropertyAssignment(item) && propName(item) === name);

/** English phrase -> first file that needs it, from `text(locale, tr, en)` calls and `{tr,en}` / `xTr`+`xEn` objects. */
export function extractRequiredPhrases(files: readonly SourceFile[]): Map<string, string> {
  const required = new Map<string, string>();
  const add = (tr: ts.Node, en: ts.Node, file: string) => {
    const a = literal(tr), b = literal(en);
    if (a !== undefined && b !== undefined && Boolean(b.trim()) && !TECHNICAL_EN.has(b) && !b.startsWith("/") && !/^(?:https?:|mailto:)/.test(b) && !b.startsWith("{ORIGIN}")) required.set(b, file);
  };
  for (const file of files) {
    if (isExcludedSource(file.path)) continue;
    const ast = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText() === "text" && node.arguments.length >= 3) add(node.arguments[1], node.arguments[2], file.path);
      if (ts.isObjectLiteralExpression(node)) {
        const tr = prop(node, "tr"), en = prop(node, "en");
        if (tr && en) add(tr.initializer, en.initializer, file.path);
        for (const item of node.properties) {
          if (!ts.isPropertyAssignment(item)) continue;
          const name = propName(item);
          if (name.endsWith("Tr")) { const peer = prop(node, `${name.slice(0, -2)}En`); if (peer) add(item.initializer, peer.initializer, file.path); }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return required;
}

/* ---------- report ---------- */

export type AuditInput = {
  locales: readonly string[];
  /** Flat message catalogues by locale; `null` = file absent. Must contain "en". */
  messages: Record<string, Flat | null>;
  /** Content dictionaries by locale (only non-TR/EN); `null`/absent = file absent. */
  content: Record<string, Record<string, unknown> | null | undefined>;
  required: ReadonlySet<string> | readonly string[];
};

export type LocaleRow = {
  locale: string;
  messages: CatalogueDiff & { fileMissing: boolean };
  content: (ContentDiff & { fileMissing: boolean }) | null;
  totals: { missing: number; extra: number; mismatch: number; pending: number };
};
export type AuditReport = {
  requiredSourcePhrases: number;
  messageLeaves: number;
  rows: LocaleRow[];
  totals: { missing: number; extra: number; mismatch: number; pending: number };
};

export function buildReport(input: AuditInput): AuditReport {
  const en = input.messages.en;
  if (!en) throw new Error("English source catalogue (messages/en.json) is required");
  const need = [...input.required];
  const rows = input.locales.map((locale): LocaleRow => {
    const cat = input.messages[locale];
    const messages = { ...diffCatalogue(en, cat ?? {}, locale), fileMissing: cat == null };
    const raw = isSourceLocale(locale) ? undefined : input.content[locale];
    const content = isSourceLocale(locale) ? null : { ...diffContent(need, raw ?? {}), fileMissing: raw == null };
    const totals = {
      missing: messages.missing.length + (content?.missing.length ?? 0),
      extra: messages.extra.length + (content?.stale.length ?? 0),
      mismatch: messages.placeholder.length + messages.emptyPattern.length + (content?.placeholder.length ?? 0),
      pending: messages.pending.length + (content?.pending.length ?? 0),
    };
    return { locale, messages, content, totals };
  });
  const totals = { missing: 0, extra: 0, mismatch: 0, pending: 0 };
  for (const row of rows) for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += row.totals[k];
  return { requiredSourcePhrases: need.length, messageLeaves: Object.keys(en).length, rows, totals };
}

/** Strict mode fails on drift (missing/extra/stale/mismatch). Pending human translation never fails. */
export function strictViolations(report: AuditReport): number {
  return report.totals.missing + report.totals.extra + report.totals.mismatch;
}

/* ---------- formatting ---------- */

export type FormatOptions = { list: boolean; max: number };

const HEAD = ["Dil", "msg eksik", "msg fazla", "yer tutucu/boş", "msg bekleyen", "içerik eksik", "içerik eski", "içerik bekleyen", "toplam"];
function cells(row: LocaleRow): string[] {
  const c = row.content;
  const n = (v: number | undefined) => (v === undefined ? "-" : String(v));
  const total = row.totals.missing + row.totals.extra + row.totals.mismatch + row.totals.pending;
  return [row.locale, n(row.messages.missing.length), n(row.messages.extra.length), n(row.messages.placeholder.length + row.messages.emptyPattern.length + (c?.placeholder.length ?? 0)),
    n(row.messages.pending.length), n(c?.missing.length), n(c?.stale.length), n(c?.pending.length), String(total)];
}
function allCells(report: AuditReport): string[][] {
  const t = report.totals;
  return [...report.rows.map(cells), ["TOPLAM", "", "", "", "", "", "", "", String(t.missing + t.extra + t.mismatch + t.pending)]];
}

type Section = { title: string; items: string[] };
function sections(row: LocaleRow): Section[] {
  const m = row.messages, c = row.content;
  const list: Section[] = [
    { title: "messages: EKSİK anahtar", items: m.missing }, { title: "messages: FAZLA anahtar", items: m.extra },
    { title: "messages: yer tutucu uyuşmazlığı", items: m.placeholder }, { title: "messages: boş-desen uyuşmazlığı", items: m.emptyPattern },
    { title: "messages: İNSAN ÇEVİRİSİ BEKLİYOR", items: m.pending },
  ];
  if (c) list.push(
    { title: "content: EKSİK", items: c.missing }, { title: "content: ESKİ/FAZLA (yetim)", items: c.stale },
    { title: "content: yer tutucu uyuşmazlığı", items: c.placeholder }, { title: "content: İNSAN ÇEVİRİSİ BEKLİYOR", items: c.pending },
  );
  return list.filter((s) => s.items.length > 0);
}
const clip = (value: string) => { const one = value.replace(/\s+/g, " "); return one.length > 110 ? `${one.slice(0, 107)}...` : one; };
const shown = (items: string[], max: number) => ({ head: items.slice(0, max), rest: Math.max(0, items.length - max) });

export function formatText(report: AuditReport, opts: FormatOptions): string {
  const rows = allCells(report);
  const width = HEAD.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((v, i) => (i === 0 ? v.padEnd(width[i]) : v.padStart(width[i]))).join("  ");
  const out = [
    `Locale bakım raporu — ${report.rows.length} dil, ${report.messageLeaves} mesaj yaprağı, ${report.requiredSourcePhrases} kaynak cümle`,
    line(HEAD), width.map((w) => "-".repeat(w)).join("  "), ...rows.map(line),
  ];
  if (opts.list) {
    for (const row of report.rows) {
      const secs = sections(row);
      if (!secs.length) continue;
      out.push("", `== ${row.locale} ==`);
      for (const s of secs) {
        const { head, rest } = shown(s.items, opts.max);
        out.push(`${s.title} (${s.items.length})`, ...head.map((i) => `  - ${clip(i)}`));
        if (rest) out.push(`  … +${rest} daha`);
      }
    }
  }
  return out.join("\n") + "\n";
}

export function formatMarkdown(report: AuditReport, opts: FormatOptions): string {
  const esc = (v: string) => v.replace(/\|/g, "\\|").replace(/`/g, "'");
  const rows = allCells(report);
  const out = [
    "## Locale bakım raporu", "",
    `${report.rows.length} dil · ${report.messageLeaves} mesaj yaprağı · ${report.requiredSourcePhrases} kaynak cümle. Bilgilendirme amaçlıdır; kapı \`verify:translations\`.`, "",
    `| ${HEAD.join(" | ")} |`, `| ${HEAD.map((_, i) => (i === 0 ? "---" : "---:")).join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  if (opts.list) {
    for (const row of report.rows) {
      const secs = sections(row);
      if (!secs.length) continue;
      out.push("", `<details><summary>${row.locale}</summary>`, "");
      for (const s of secs) {
        const { head, rest } = shown(s.items, opts.max);
        out.push(`**${s.title}** (${s.items.length})`, "", ...head.map((i) => `- \`${esc(clip(i))}\``));
        if (rest) out.push(`- … +${rest} daha`);
        out.push("");
      }
      out.push("</details>");
    }
  }
  return out.join("\n") + "\n";
}

export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2) + "\n";
}
