import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TARGET_URL_PATTERN, parseEventPayload } from "@/lib/analytics/events";

/**
 * The application rule and the database rule for a stored outbound URL must
 * be the same rule. When they drifted, the app accepted `@` and the CHECK
 * rejected it, so a legitimate URL passed validation and then failed as a
 * 503 at write time — the worst place to discover a disagreement.
 */
describe("target URL rule parity", () => {
  it("uses the exact same pattern in the validator and the CHECK constraint", () => {
    const migration = readFileSync(
      path.resolve(import.meta.dirname, "../db/migrations/0001_attribution.sql"),
      "utf8",
    );
    const match = migration.match(/target_url ~ '([^']+)'/);
    expect(match, "no target_url regex found in the migration").toBeTruthy();
    expect(match?.[1]).toBe(TARGET_URL_PATTERN);
  });
});

describe("percent- and plus-encoding cannot smuggle free text into a target", () => {
  function post(target: string) {
    return parseEventPayload({
      v: 1,
      event: "store_outbound",
      locale: "tr",
      page: "/projects/lifeos",
      product: "lifeos",
      session: "a".repeat(32),
      target,
      targetCategory: "store",
    });
  }

  it.each([
    ["a space-encoded name and email", "https://apps.apple.com/ad%20soyad%20kaan.kocak%40gmail.com"],
    ["a fully percent-encoded email", "https://apps.apple.com/%73%6f%6d%65%6f%6e%65%40%65%78%61%6d%70%6c%65%2e%63%6f%6d"],
    ["a plus-encoded name and phone", "https://apps.apple.com/kaan+kocak+05551112233"],
    ["a bare @ in the path", "https://apps.apple.com/kaan@example.com"],
  ])("rejects %s", (_label, target) => {
    const result = post(target);
    expect(result.ok).toBe(false);
  });

  it("still accepts an ordinary store URL", () => {
    expect(post("https://apps.apple.com/app/id6771527233").ok).toBe(true);
  });

  it("rejects, rather than 503s, a handle-style URL the database would refuse", () => {
    // youtube.com is on the allowlist because burunfarki.ts ships
    // https://youtube.com/@burunfarki. Before this rule the app said yes and
    // the CHECK said no.
    const result = post("https://youtube.com/@burunfarki");
    expect(result.ok).toBe(false);
  });
});
