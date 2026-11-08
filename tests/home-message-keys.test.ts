import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_SCENES } from "@/components/landing/home-scenes";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

/**
 * Root cause guard for `IntlError: MISSING_MESSAGE` (WEB-P0-03a). The home
 * route reads three namespaces by literal key. A key that exists in only one
 * namespace (for example `status.comingSoon` read as `experience.comingSoon`)
 * throws MISSING_MESSAGE only in the locales whose catalogue lacks it, so the
 * check runs against every catalogue, not just tr/en.
 */
const root = path.resolve(import.meta.dirname, "..");
const catalogue = (locale: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));
const lookup = (tree: unknown, dotted: string): unknown =>
  dotted.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree);

const page = fs.readFileSync(path.join(root, "src/app/[locale]/page.tsx"), "utf8");
const used = new Set<string>();
for (const [, fn, key] of page.matchAll(/\b(t|tStatus)\("([^"]+)"/g)) {
  used.add(`${fn === "t" ? "experience" : "status"}.${key}`);
}
for (const scene of HOME_SCENES) {
  for (const leaf of ["label", "title", "message"]) used.add(`home.${scene.key}.${leaf}`);
}
used.add("home.navLabel");

describe("home route message keys", () => {
  it("reads at least the keys the route is known to use", () => {
    expect(used.size).toBeGreaterThan(60);
    expect(used.has("status.comingSoon")).toBe(true);
    expect(used.has("experience.comingSoon")).toBe(false);
  });

  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale}: every literal key exists`, () => {
      const tree = catalogue(locale);
      const missing = [...used].filter((key) => typeof lookup(tree, key) !== "string");
      expect(missing).toEqual([]);
    });
  }
});
