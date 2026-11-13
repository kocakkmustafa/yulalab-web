import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const script = path.resolve(import.meta.dirname, "../scripts/quality/js-budget.mjs");
let root: string;

function chunk(name: string, size: number) {
  const file = path.join(root, name);
  mkdirSync(path.dirname(file), { recursive: true });
  // Pseudo-random bytes so gzip cannot collapse them.
  const buffer = Buffer.alloc(size);
  let seed = 7;
  for (let i = 0; i < size; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; buffer[i] = seed >> 16; }
  writeFileSync(file, buffer);
  return gzipSync(buffer, { level: 9 }).length;
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "js-budget-"));
  chunk("static/chunks/shared.js", 4000);
  chunk("static/chunks/app/[locale]/page.js", 2000);
  chunk("static/chunks/app/[locale]/projects/page.js", 1500);
  writeFileSync(path.join(root, "app-build-manifest.json"), JSON.stringify({
    pages: {
      "/[locale]/page": ["static/chunks/shared.js", "static/chunks/app/[locale]/page.js", "static/css/x.css"],
      "/[locale]/projects/page": ["static/chunks/shared.js", "static/chunks/app/[locale]/projects/page.js"],
    },
  }));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const run = (...args: string[]) => spawnSync("node", [script, "--root", root, ...args], { encoding: "utf8" });

describe("js-budget script", () => {
  it("passes with the default budget on a small fixture", () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("js-budget: geçti");
  });

  it("fails with exit 1 and names the exceeded route when the budget is cut", () => {
    const result = run("--max-home", "100", "--max-projects", "100000", "--max-total", "100000");
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/AŞILDI \/ ilk yük/);
    expect(result.stdout).toMatch(/ok\s+\/projects/);
    expect(result.stderr).toContain("bütçesi aşıldı");
  });

  it("fails when the total chunks budget is cut", () => {
    const result = run("--max-total", "100");
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/AŞILDI static\/chunks toplamı/);
  });

  it("fails with exit 1 when there is no build output", () => {
    const result = spawnSync("node", [script, "--root", path.join(root, "missing")], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("app-build-manifest.json yok");
  });
});
