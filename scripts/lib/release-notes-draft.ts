/**
 * Release-note draft generator — pure functions. It classifies merged PR titles and renders
 * a Markdown draft with EMPTY tr/en fields. It never writes copy and never touches
 * src/data/notes.ts or messages/*: a human (the founder) approves and copies by hand.
 */
import path from "node:path";

export type MergedPr = { number: number; title: string; mergedAt: string; url: string };

export const VISIBLE_TYPES = ["feat", "fix", "perf"] as const;
export const INTERNAL_TYPES = ["ci", "chore", "test", "docs", "refactor", "build", "style"] as const;

export type ParsedTitle = { type: string | null; scope: string | null; subject: string; ticket: string | null; breaking: boolean };
export type Classified = ParsedTitle & { pr: MergedPr; kind: "visible" | "internal" | "unknown"; reason: string };

const TICKET = /WEB-[A-Z0-9]+(?:-[A-Z0-9]+)*/;

/** Strip `[skip netlify]`, split the conventional-commit prefix, pull the ticket from the scope. */
export function parseTitle(rawTitle: string): ParsedTitle {
  const title = rawTitle.replace(/\[skip[ -]netlify\]/gi, " ").replace(/\s+/g, " ").trim();
  const m = /^([A-Za-z]+)(?:\(([^)]*)\))?(!)?:\s*(.*)$/.exec(title);
  if (!m) return { type: null, scope: null, subject: title, ticket: TICKET.exec(title)?.[0] ?? null, breaking: false };
  const scope = m[2] ?? null;
  return {
    type: m[1].toLowerCase(), scope, subject: m[4].trim(), breaking: Boolean(m[3]),
    ticket: (scope ? TICKET.exec(scope)?.[0] : undefined) ?? TICKET.exec(m[4])?.[0] ?? null,
  };
}

export function classify(pr: MergedPr): Classified {
  const parsed = parseTitle(pr.title);
  const { type } = parsed;
  if (type && (VISIBLE_TYPES as readonly string[]).includes(type)) return { ...parsed, pr, kind: "visible", reason: `${type}: kullanıcıya görünür aday` };
  if (type && (INTERNAL_TYPES as readonly string[]).includes(type)) return { ...parsed, pr, kind: "internal", reason: `${type}: iç değişiklik, sürüm notu dışı` };
  return { ...parsed, pr, kind: "unknown", reason: type ? `tanınmayan önek "${type}": elle değerlendir` : "conventional-commit öneki yok: elle değerlendir" };
}

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u" };
/** Mechanical kebab-case from the source subject (a suggestion only; the founder edits it). */
export function slugify(subject: string): string {
  const s = subject.replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => TR_MAP[c] ?? c).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.split("-").slice(0, 6).join("-") || "note";
}

export type DraftInput = {
  prs: readonly MergedPr[];
  /** Deterministic clock for tests. */
  now: Date;
  since?: string;
  source: "input" | "gh";
};
export type Draft = { markdown: string; visible: Classified[]; internal: Classified[]; unknown: Classified[]; fileName: string };

const day = (iso: string) => iso.slice(0, 10);
const newestFirst = (a: Classified, b: Classified) => (a.pr.mergedAt < b.pr.mergedAt ? 1 : a.pr.mergedAt > b.pr.mergedAt ? -1 : b.pr.number - a.pr.number);
const q = (v: string) => JSON.stringify(v);

export const DRAFT_NOTICE = "Taslaktır; yayına geçmesi için kurucu onayı gerekir; onaydan sonra giriş src/data/notes.ts'e ELLE kopyalanır, İngilizce metin için 12 dilde messages/content-<dil>.json anahtarı eklenir (verify-translations).";

export function buildDraft(input: DraftInput): Draft {
  const seen = new Set<number>();
  const all = input.prs.filter((pr) => (seen.has(pr.number) ? false : (seen.add(pr.number), true))).map(classify).sort(newestFirst);
  const visible = all.filter((c) => c.kind === "visible");
  const internal = all.filter((c) => c.kind === "internal");
  const unknown = all.filter((c) => c.kind === "unknown");
  const dates = all.map((c) => day(c.pr.mergedAt)).sort();
  const generatedAt = input.now.toISOString();
  const fileName = `${day(generatedAt)}.md`;

  const out: string[] = [
    "---", "status: draft", "approval: kurucu-onayi-bekliyor", `generatedAt: ${generatedAt}`,
    `rangeFrom: ${input.since ?? dates[0] ?? ""}`, `rangeTo: ${dates[dates.length - 1] ?? ""}`,
    `source: ${input.source}`, `prCount: ${all.length}`, `candidateCount: ${visible.length}`, "---", "",
    "# Sürüm notu taslağı", "", `> ${DRAFT_NOTICE}`, "",
    "Araç metin yazmaz ve çevirmez: tr/en alanları bilerek boştur (`TODO(kurucu)`). Yalnız PR başlığı kaynak olarak durur.", "",
    `## Kullanıcıya görünür adaylar (${visible.length})`, "",
  ];
  if (!visible.length) out.push("Aday yok.", "");
  for (const c of visible) {
    out.push(
      `### PR #${c.pr.number}${c.ticket ? ` · ${c.ticket}` : ""}`, "",
      `- Kaynak başlık: ${c.pr.title.replace(/\s+/g, " ").trim()}`, `- Birleşme: ${c.pr.mergedAt}`, `- Bağlantı: ${c.pr.url}`, `- Tür: ${c.type}${c.breaking ? " (breaking)" : ""}`, "",
      "```ts", `// kaynak: PR #${c.pr.number}${c.ticket ? ` · ${c.ticket}` : ""} · ${c.pr.url}`, "{",
      `  slug: ${q(slugify(c.subject))}, // öneri; elle düzelt`, `  date: ${q(day(c.pr.mergedAt))},`,
      `  title: { tr: "", en: "" }, // TODO(kurucu)`, `  body: { tr: "", en: "" }, // TODO(kurucu)`, "},", "```", "",
    );
  }
  out.push(`## Atlananlar: iç değişiklik (${internal.length})`, "");
  if (!internal.length) out.push("Yok.");
  for (const c of internal) out.push(`- #${c.pr.number} ${c.subject}${c.ticket ? ` [${c.ticket}]` : ""} — ${c.reason}`);
  out.push("", `## Elle değerlendirilecek: önek yok/tanınmıyor (${unknown.length})`, "");
  if (!unknown.length) out.push("Yok.");
  for (const c of unknown) out.push(`- #${c.pr.number} ${c.pr.title.replace(/\s+/g, " ").trim()} — ${c.reason}`);
  out.push("");
  return { markdown: out.join("\n"), visible, internal, unknown, fileName };
}

/** Parse and validate the `--input` JSON array. */
export function parsePrList(json: string): MergedPr[] {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("PR listesi bir JSON dizisi olmalı");
  return data.map((item, i) => {
    const o = item as Record<string, unknown>;
    if (!o || typeof o.number !== "number" || typeof o.title !== "string" || typeof o.mergedAt !== "string" || typeof o.url !== "string") {
      throw new Error(`PR #${i}: {number,title,mergedAt,url} bekleniyor`);
    }
    return { number: o.number, title: o.title, mergedAt: o.mergedAt, url: o.url };
  });
}

/** Output must never land where the app reads content: src/, messages/, public/. */
export function assertSafeOutPath(outPath: string, root: string): void {
  const rel = path.relative(path.resolve(root), path.resolve(root, outPath));
  const top = rel.split(path.sep)[0];
  if (rel.startsWith("..") || path.isAbsolute(rel)) return; // outside the repo (e.g. tmp dir) is fine
  if (["src", "messages", "public"].includes(top)) throw new Error(`Çıktı ${top}/ altına yazılamaz: taslaklar yalnız drafts/ ya da repo dışında durur`);
}
