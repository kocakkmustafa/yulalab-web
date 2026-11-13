/** Argument handling + the only file write of notes:draft (to --out, never src/ or messages/). */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertSafeOutPath, buildDraft, parsePrList, type MergedPr } from "./release-notes-draft";

export type NotesResult = { message: string; error: string; exitCode: number; outFile?: string };
export type GhRunner = (args: string[]) => string;

const defaultGh: GhRunner = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

export function runReleaseNotesDraft(argv: readonly string[], root: string, now = new Date(), gh: GhRunner = defaultGh): NotesResult {
  let input: string | undefined, since: string | undefined, out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "--since" || a === "--out") {
      const v = argv[++i];
      if (v === undefined) return fail(`${a} değer ister`);
      if (a === "--input") input = v; else if (a === "--since") since = v; else out = v;
    } else return fail(`Bilinmeyen argüman: ${a}`);
  }
  if ((input === undefined) === (since === undefined)) return fail("Tam olarak biri gerekli: --input <json> ya da --since YYYY-MM-DD");
  if (since !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(since)) return fail("--since biçimi YYYY-MM-DD olmalı");

  let prs: MergedPr[];
  try {
    if (input !== undefined) prs = parsePrList(fs.readFileSync(path.resolve(root, input), "utf8"));
    else {
      let raw: string;
      try {
        raw = gh(["pr", "list", "--repo", "kocakkmustafa/yulalab-web", "--state", "merged", "--base", "main", "--json", "number,title,mergedAt,url", "--limit", "200"]);
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        return fail(code === "ENOENT" ? "`gh` bulunamadı: GitHub CLI kurun ya da --input <json> verin" : `gh pr list başarısız: ${(e as Error).message}`);
      }
      prs = parsePrList(raw).filter((pr) => pr.mergedAt.slice(0, 10) >= since!);
    }
  } catch (e) {
    return fail(`Girdi okunamadı: ${(e as Error).message}`);
  }

  const draft = buildDraft({ prs, now, since, source: input !== undefined ? "input" : "gh" });
  const outFile = path.resolve(root, out ?? path.join("drafts", "release-notes", draft.fileName));
  try { assertSafeOutPath(outFile, root); } catch (e) { return fail((e as Error).message); }
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, draft.markdown);
  return { message: `Taslak yazıldı: ${outFile} (${draft.visible.length} aday, ${draft.internal.length} iç, ${draft.unknown.length} belirsiz)\n`, error: "", exitCode: 0, outFile };
}
const fail = (error: string): NotesResult => ({ message: "", error, exitCode: 2 });
