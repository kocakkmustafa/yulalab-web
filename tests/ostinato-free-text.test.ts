import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getProjectBySlug } from "@/data/projects";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

const project = getProjectBySlug("ostinato");
if (!project) throw new Error("ostinato project missing");

const freeFeature = project.features.find((f) => f.title.en === "Free part");
const STALE = /1[–-]12|ilk 8|first 8|first eight/i;

describe("Ostinato free-lesson copy matches app (guitar L1 = 40, ear L1 = 25)", () => {
  it("has a Free part feature", () => {
    expect(freeFeature).toBeDefined();
  });

  for (const lang of ["tr", "en"] as const) {
    it(`short (${lang}) states 40 + 25 and no stale ranges`, () => {
      const text = project.short[lang];
      expect(text).toContain("40");
      expect(text).toContain("25");
      expect(text).not.toMatch(STALE);
    });

    it(`description (${lang}) states 40 + 25 and no stale ranges`, () => {
      const text = project.description[lang];
      expect(text).toContain("40");
      expect(text).toContain("25");
      expect(text).not.toMatch(STALE);
    });

    it(`Free part feature (${lang}) states 40 + 25 and no stale ranges`, () => {
      const text = freeFeature!.description[lang];
      expect(text).toContain("40");
      expect(text).toContain("25");
      expect(text).not.toMatch(STALE);
    });
  }

  it("every content locale catalogue translates the Free part text and drops the stale key", () => {
    const en = freeFeature!.description.en;
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "tr" || locale === "en") continue;
      const file = path.join(process.cwd(), "messages", `content-${locale}.json`);
      const cat = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
      expect(cat[en], locale).toBeTruthy();
      expect(cat[en], locale).toMatch(/40/);
      expect(cat[en], locale).toMatch(/25/);
      for (const key of Object.keys(cat)) expect(key, locale).not.toMatch(STALE);
    }
  });
});
