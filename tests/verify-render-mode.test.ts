import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SEC-WEB-01a — scripts/verify-render-mode.mjs must treat the home page and
 * /transparency as time-derived routes: a frozen one fails the check, a revalidating
 * one passes. Runs the real script against a fabricated prerender manifest.
 */
const SCRIPT = path.resolve(__dirname, "../scripts/verify-render-mode.mjs");

function run(routes: Record<string, number | false>) {
  const cwd = mkdtempSync(path.join(tmpdir(), "render-mode-"));
  mkdirSync(path.join(cwd, ".next"));
  const manifest = {
    routes: Object.fromEntries(
      Object.entries(routes).map(([r, s]) => [r, { initialRevalidateSeconds: s }]),
    ),
  };
  writeFileSync(path.join(cwd, ".next/prerender-manifest.json"), JSON.stringify(manifest));
  const res = spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

describe("verify-render-mode time-derived routes", () => {
  it("passes when home and /transparency revalidate", () => {
    const r = run({ "/tr": 3600, "/en": 3600, "/tr/transparency": 3600, "/en/transparency": 3600 });
    expect(r.code).toBe(0);
    expect(r.out).toContain("4 time-derived routes");
  });

  it("fails when the home page is a frozen prerender", () => {
    const r = run({ "/tr": false, "/tr/transparency": 3600 });
    expect(r.code).toBe(1);
    expect(r.out).toContain("✗ /tr →");
  });

  it("fails when /transparency is frozen", () => {
    const r = run({ "/tr": 3600, "/en/transparency": false });
    expect(r.code).toBe(1);
    expect(r.out).toContain("✗ /en/transparency");
  });

  it("fails when /transparency revalidates slower than an hour", () => {
    const r = run({ "/tr": 3600, "/tr/transparency": 86400 });
    expect(r.code).toBe(1);
  });
});
