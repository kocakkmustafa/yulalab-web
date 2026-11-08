import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ostinato } from "@/data/projects/ostinato";

const LOCALES = ["ar", "de", "es-419", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt-BR", "zh-Hans"];
const OLD_KEY = "Guitar from first sound to independent playing (60 lessons), and beginner foundations in piano and keyboard (25), ukulele (24), four-string bass (24) and voice (22).";
const courses = ostinato.features[0].description;
const description = ostinato.description;

describe("Ostinato Kurslar maddesi", () => {
  it("çürük sayıları ve uygulamada olmayan kursları içermez", () => {
    for (const t of [courses.tr, courses.en]) {
      expect(t).not.toMatch(/60 (ders|lessons)|\(60/i);
      expect(t).not.toMatch(/ukulele|bas\b|bass|\(24\)|\(22\)|\(25\)/i);
    }
  });

  it("description ile aynı sayıları söyler (240 ders/4 seviye, 50 ders/2 seviye)", () => {
    expect(description.tr).toContain("dört seviyede 240 ders");
    expect(description.tr).toContain("iki seviyede 50 ders");
    expect(courses.tr).toContain("dört seviyede 240 ders");
    expect(courses.tr).toContain("iki seviyede 50 ders");
    expect(description.en).toContain("240 lessons across four levels");
    expect(description.en).toContain("50 lessons across two levels");
    expect(courses.en).toContain("240 lessons across four levels");
    expect(courses.en).toContain("50 lessons across two levels");
  });

  it("şan ve piyanoyu yakında olarak belirtir", () => {
    expect(courses.tr).toMatch(/şan ve piyano yakında/);
    expect(courses.en).toMatch(/voice and piano are coming soon/);
  });

  it.each(LOCALES)("%s içerik dosyasında eski anahtar yok, yeni anahtar var", (locale) => {
    const raw = readFileSync(join(process.cwd(), "messages", `content-${locale}.json`), "utf8");
    const json = JSON.parse(raw) as Record<string, string>;
    expect(OLD_KEY in json).toBe(false);
    expect(raw).not.toContain("beginner foundations in piano");
    expect(json[courses.en]).toBeTypeOf("string");
  });
});
