import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Y3 (2026-11-02): src/lib/localized.ts bundles the content catalogue of all
// twelve secondary locales (2.2 MB raw). A client component reaching it, even
// through a shared helper such as SourceStamp, put the whole map into the
// homepage bundle. Client components take server-resolved strings instead.
const SRC = path.join(process.cwd(), "src");
const CATALOGUE = path.join(SRC, "lib", "localized.ts");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const files = walk(SRC);
const sources = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));

function resolve(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.join(path.dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (sources.has(candidate)) return candidate;
  }
  return null;
}

/** Runtime imports only: `import type` is erased and never reaches a bundle. */
function runtimeImports(file: string): string[] {
  const source = sources.get(file) ?? "";
  return [...source.matchAll(/(?:^|\n)\s*(import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/g)]
    .filter((match) => !match[2])
    .map((match) => resolve(file, match[3]))
    .filter((file): file is string => file !== null);
}

/** The import path from `start` to the catalogue, or null when it is unreachable. */
function chainToCatalogue(start: string): string[] | null {
  const parent = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const file = queue.shift()!;
    if (file === CATALOGUE) {
      const chain: string[] = [];
      for (let at: string | null = file; at; at = parent.get(at) ?? null) chain.unshift(path.relative(process.cwd(), at));
      return chain;
    }
    for (const next of runtimeImports(file)) {
      if (!parent.has(next)) {
        parent.set(next, file);
        queue.push(next);
      }
    }
  }
  return null;
}

describe("client bundle", () => {
  it("keeps the content catalogue out of every client component's import graph", () => {
    const offenders = files
      .filter((file) => /^\s*["']use client["']/.test(sources.get(file)!))
      .map(chainToCatalogue)
      .filter((chain): chain is string[] => chain !== null)
      .map((chain) => chain.join(" -> "));
    expect(offenders).toEqual([]);
  });

  it("follows imports through shared helpers", () => {
    // The homepage regression went StaticExperience -> ExperienceOverlay ->
    // SourceStamp -> localized; the guard must see such indirect routes.
    const helper = path.join(SRC, "components", "__guard-helper.ts");
    const client = path.join(SRC, "components", "__guard-client.tsx");
    sources.set(helper, 'import { text } from "@/lib/localized";\nexport const label = text;\n');
    sources.set(client, '"use client";\nimport type { Locale } from "@/lib/localized";\nimport { label } from "./__guard-helper";\n');
    try {
      expect(chainToCatalogue(client)).toEqual([
        "src/components/__guard-client.tsx",
        "src/components/__guard-helper.ts",
        "src/lib/localized.ts",
      ]);
      sources.set(client, '"use client";\nimport type { Locale } from "./__guard-helper";\n');
      expect(chainToCatalogue(client)).toBeNull();
    } finally {
      sources.delete(helper);
      sources.delete(client);
    }
  });
});
