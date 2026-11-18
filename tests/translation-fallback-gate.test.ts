import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 }); // each case spawns tsx + parses the whole src tree

// WEB-10c-AI: verify-translations must reject a secondary-locale value that is still the English source
// (unless technical or allowlisted) and must reject stale allowlist entries. The script reads catalogues from
// process.cwd(), so we run it against a throwaway copy of messages/ + src/ + the allowlist.
const repo = path.resolve(import.meta.dirname, "..");
let sandbox = "";

function run(cwd: string) {
  return spawnSync(process.execPath, ["--import", "tsx", path.join(repo, "scripts/verify-translations.ts")], { cwd, encoding: "utf8", timeout: 60_000 });
}
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file: string, value: unknown) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

beforeAll(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "verify-translations-"));
  fs.cpSync(path.join(repo, "messages"), path.join(sandbox, "messages"), { recursive: true });
  fs.cpSync(path.join(repo, "src"), path.join(sandbox, "src"), { recursive: true });
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(sandbox, "node_modules"), "dir"); // `--import tsx` resolves from cwd
  fs.mkdirSync(path.join(sandbox, "scripts"));
  fs.copyFileSync(path.join(repo, "scripts/translation-same-as-en.json"), path.join(sandbox, "scripts/translation-same-as-en.json"));
});
afterAll(() => fs.rmSync(sandbox, { recursive: true, force: true }));

describe("EN-fallback gate in verify-translations", () => {
  it("passes on the committed catalogues and allowlist", () => {
    const result = run(sandbox);
    expect(result.stderr + result.stdout).toContain('"issues": []');
    expect(result.status).toBe(0);
  });

  it("flags a message that regressed to its English source", () => {
    const en = readJson(path.join(sandbox, "messages/en.json"));
    const ja = readJson(path.join(sandbox, "messages/ja.json"));
    const original = ja.contact.title;
    expect(original).not.toBe(en.contact.title);
    ja.contact.title = en.contact.title;
    writeJson(path.join(sandbox, "messages/ja.json"), ja);
    const result = run(sandbox);
    ja.contact.title = original;
    writeJson(path.join(sandbox, "messages/ja.json"), ja);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ja: contact.title is an untranslated English fallback");
  });

  it("flags a content phrase that regressed to its English key", () => {
    const file = path.join(sandbox, "messages/content-de.json");
    const content = readJson(file);
    const key = Object.keys(content).find((k) => /[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/.test(k) && content[k] !== k)!;
    const original = content[key];
    content[key] = key;
    writeJson(file, content);
    const result = run(sandbox);
    content[key] = original;
    writeJson(file, content);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("de: content");
    expect(result.stdout).toContain("is an untranslated English fallback");
  });

  it("flags a stale allowlist entry whose value is no longer English", () => {
    const file = path.join(sandbox, "scripts/translation-same-as-en.json");
    const allow = readJson(file);
    const original = JSON.parse(JSON.stringify(allow));
    allow.ja.messages.push("contact.title");
    writeJson(file, allow);
    const result = run(sandbox);
    writeJson(file, original);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ja: stale same-as-English allowlist entry contact.title");
  });
});
