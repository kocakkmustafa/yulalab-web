import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Same pattern as K9 in scripts/release/live-readback.py, plus a `docs/` path
// (the ADR-003 leak). Only string values are scanned: comments and import
// paths are not shipped text. `source:` provenance fields are skipped: the
// registry keeps repo paths there on purpose and ExperienceOverlay renders a
// claim source only when it is an http(s) URL (K9 guard).
const INTERNAL = /\b(scratch|ventures|knowledge|holding)\/[\w.-]+|\b[\w-]+\.md\b|\bdocs\/[\w.-]+\/[\w.-]+/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function stringValues(src: string): string[] {
  const out: string[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (/^(\/\/|\/\*|\*|import\b|export .* from\b|source:)/.test(line)) continue;
    for (const m of line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
      out.push(m[1] ?? m[2] ?? m[3] ?? "");
    }
  }
  return out;
}

function leaves(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(leaves);
  if (v && typeof v === "object") return Object.values(v).flatMap(leaves);
  return [];
}

describe("no internal repository path in shipped text (K9)", () => {
  it("src/data string values", () => {
    const bad: string[] = [];
    for (const f of walk("src/data").filter((p) => /\.tsx?$/.test(p))) {
      for (const s of stringValues(readFileSync(f, "utf8"))) {
        const m = INTERNAL.exec(s);
        if (m) bad.push(`${f}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("messages/*.json values", () => {
    const bad: string[] = [];
    for (const f of readdirSync("messages").filter((n) => n.endsWith(".json"))) {
      for (const s of leaves(JSON.parse(readFileSync(join("messages", f), "utf8")))) {
        const m = INTERNAL.exec(s);
        if (m) bad.push(`${f}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("landing components render no docs/ or src/ path literal", () => {
    const bad: string[] = [];
    for (const f of walk("src/components/landing").filter((p) => p.endsWith(".tsx"))) {
      for (const s of stringValues(readFileSync(f, "utf8"))) {
        if (/\bdocs\/[\w.-]+\/|^src\/|\bsrc\/[\w.-]+\/[\w.-]+\.tsx?\b/.test(s)) bad.push(`${f}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
