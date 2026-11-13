import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeOutPath, buildDraft, classify, parseTitle, slugify, type MergedPr } from "../scripts/lib/release-notes-draft";
import { runReleaseNotesDraft } from "../scripts/lib/release-notes-cli";

const repo = path.resolve(import.meta.dirname, "..");
const pr = (number: number, title: string, mergedAt = "2026-11-10T10:00:00Z"): MergedPr => ({ number, title, mergedAt, url: `https://github.com/kocakkmustafa/yulalab-web/pull/${number}` });
const NOW = new Date("2026-11-11T09:30:00Z");

describe("classification", () => {
  it.each(["feat", "fix", "perf"])("%s is a user-visible candidate", (t) => expect(classify(pr(1, `${t}(WEB-P0-09): x`)).kind).toBe("visible"));
  it.each(["ci", "chore", "test", "docs", "refactor", "build", "style"])("%s is internal with a reason", (t) => {
    const c = classify(pr(1, `${t}: x`));
    expect(c.kind).toBe("internal");
    expect(c.reason).toContain(t);
  });
  it("unprefixed titles are left for manual review, not silently dropped", () => {
    expect(classify(pr(1, "Update stuff")).kind).toBe("unknown");
    expect(classify(pr(1, "wip: x")).kind).toBe("unknown");
  });
  it("strips [skip netlify] and the prefix, extracts the ticket from the scope", () => {
    const p = parseTitle("fix(WEB-P0-06): Düzeltme [skip netlify]");
    expect(p).toMatchObject({ type: "fix", scope: "WEB-P0-06", subject: "Düzeltme", ticket: "WEB-P0-06" });
    expect(parseTitle("[skip netlify] feat: Yeni sayfa").subject).toBe("Yeni sayfa");
    expect(parseTitle("feat(i18n,WEB-P1-04)!: x")).toMatchObject({ ticket: "WEB-P1-04", breaking: true });
    expect(parseTitle("feat: no scope").ticket).toBeNull();
  });
  it("slugify is ascii kebab", () => expect(slugify("Çok güzel Şarkı: İlk sürüm!")).toBe("cok-guzel-sarki-ilk-surum"));
});

describe("draft rendering", () => {
  const prs = [pr(3, "feat(WEB-P0-09): Yeni bölüm [skip netlify]", "2026-11-09T08:00:00Z"), pr(4, "ci: pin tree", "2026-11-10T08:00:00Z"), pr(5, "fix(WEB-P0-06): Bug", "2026-11-10T12:00:00Z"), pr(5, "dup", "2026-11-10T12:00:00Z"), pr(6, "Random")];
  const draft = buildDraft({ prs, now: NOW, source: "input" });
  it("has draft frontmatter, notice and the founder-approval flag", () => {
    expect(draft.markdown.startsWith("---\nstatus: draft\napproval: kurucu-onayi-bekliyor\ngeneratedAt: 2026-11-11T09:30:00.000Z\n")).toBe(true);
    expect(draft.markdown).toContain("Taslaktır; yayına geçmesi için kurucu onayı gerekir");
    expect(draft.markdown).toContain("src/data/notes.ts'e ELLE kopyalanır");
    expect(draft.markdown).toContain("12 dilde messages/content-<dil>.json");
    expect(draft.fileName).toBe("2026-11-11.md");
  });
  it("lists candidates newest first, de-duplicated, with empty TODO(kurucu) tr/en fields", () => {
    expect(draft.visible.map((c) => c.pr.number)).toEqual([5, 3]);
    expect(draft.markdown).toContain("title: { tr: \"\", en: \"\" }, // TODO(kurucu)");
    expect(draft.markdown).toContain("body: { tr: \"\", en: \"\" }, // TODO(kurucu)");
    expect(draft.markdown).toContain("- Kaynak başlık: feat(WEB-P0-09): Yeni bölüm [skip netlify]");
    expect(draft.markdown).toContain("### PR #3 · WEB-P0-09");
  });
  it("does not generate any tr/en copy: every title/body string is empty", () => {
    const fields = [...draft.markdown.matchAll(/(?:title|body): \{ tr: "([^"]*)", en: "([^"]*)" \}/g)];
    expect(fields.length).toBe(4);
    for (const f of fields) { expect(f[1]).toBe(""); expect(f[2]).toBe(""); }
  });
  it("puts internal and unknown PRs in the skipped lists with reasons", () => {
    expect(draft.markdown).toContain("- #4 pin tree — ci: iç değişiklik");
    expect(draft.markdown).toContain("conventional-commit öneki yok");
  });
});

describe("tool never writes to app content", () => {
  const hash = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  const guarded = () => [path.join(repo, "src/data/notes.ts"), ...fs.readdirSync(path.join(repo, "messages")).map((f) => path.join(repo, "messages", f))];
  it("a run leaves notes.ts and messages/* byte-identical; output goes to --out or drafts/ of the given root", () => {
    const before = guarded().map(hash);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
    fs.writeFileSync(path.join(tmp, "prs.json"), JSON.stringify([pr(1, "feat: a")]));
    const res = runReleaseNotesDraft(["--input", "prs.json"], tmp, NOW);
    expect(res.exitCode).toBe(0);
    expect(fs.existsSync(path.join(tmp, "drafts/release-notes/2026-11-11.md"))).toBe(true);
    const res2 = runReleaseNotesDraft(["--input", path.join(tmp, "prs.json"), "--out", path.join(tmp, "custom.md")], tmp, NOW);
    expect(res2.exitCode).toBe(0);
    expect(guarded().map(hash)).toEqual(before);
  });
  it("refuses outputs under src/, messages/ or public/", () => {
    for (const p of ["src/data/notes.ts", "messages/en.json", "public/x.md"]) expect(() => assertSafeOutPath(p, repo)).toThrow();
    expect(() => assertSafeOutPath("drafts/release-notes/a.md", repo)).not.toThrow();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
    fs.writeFileSync(path.join(tmp, "prs.json"), "[]");
    expect(runReleaseNotesDraft(["--input", "prs.json", "--out", "src/data/notes.ts"], tmp, NOW).exitCode).toBe(2);
  });
  it("--since uses gh (injected) and filters by date; missing gh gives a clear error", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
    const gh = () => JSON.stringify([pr(1, "feat: old", "2026-10-01T00:00:00Z"), pr(2, "feat: new", "2026-11-05T00:00:00Z")]);
    const ok = runReleaseNotesDraft(["--since", "2026-11-01"], tmp, NOW, gh);
    expect(ok.exitCode).toBe(0);
    const text = fs.readFileSync(ok.outFile!, "utf8");
    expect(text).toContain("PR #2");
    expect(text).not.toContain("PR #1");
    const noGh = runReleaseNotesDraft(["--since", "2026-11-01"], tmp, NOW, () => { throw Object.assign(new Error("x"), { code: "ENOENT" }); });
    expect(noGh.exitCode).toBe(2);
    expect(noGh.error).toContain("gh");
  });
  it("drafts/ is not referenced from src/ or public/", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?|mjs|json|md|html|txt|css|xml)$/.test(e.name) && /drafts\//.test(fs.readFileSync(p, "utf8"))) hits.push(p);
      }
    };
    walk(path.join(repo, "src")); walk(path.join(repo, "public"));
    expect(hits).toEqual([]);
    expect(fs.existsSync(path.join(repo, "src/drafts"))).toBe(false);
    expect(fs.existsSync(path.join(repo, "public/drafts"))).toBe(false);
  });
});
