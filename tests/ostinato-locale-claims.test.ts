import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Ostinato henüz coming-soon: hiçbir dilde "açık/mevcut" iddiası ve eski ders sayıları olmamalı.
// 12 dilde (tr/en hariç) çeviri uydurulmaz; bu metinler EN yedektir (insan incelemesi bekler).
const LOCALES = ["ar", "de", "en", "es-419", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt-BR", "tr", "zh-Hans"];
const KEYS = ["a1Title", "a1Body", "pitch3Title", "pitch3Body"] as const;

function ostinato(locale: string): Record<string, string> {
  const raw = readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8");
  return JSON.parse(raw).product.ostinato;
}

describe("Ostinato — 14 dilde coming-soon uyumu", () => {
  it("eski ders sayılarını (690/676/240) hiçbir dilde taşımaz", () => {
    for (const locale of LOCALES) {
      const o = ostinato(locale);
      for (const key of KEYS) {
        expect(o[key], `${locale}.${key}`).not.toMatch(/\b(690|676|240)\b/);
      }
    }
  });

  it("a1Title tr/en dışında EN yedektir: 'açık/mevcut' iddiası taşımaz", () => {
    const en = ostinato("en").a1Title;
    for (const locale of LOCALES.filter((l) => l !== "tr" && l !== "en")) {
      expect(ostinato(locale).a1Title, locale).toBe(en);
    }
  });

  it("ana başlık/gövde anahtarları 14 dilde 235/48/283 sayılarıyla tutarlıdır", () => {
    for (const locale of LOCALES) {
      const body = `${ostinato(locale).a1Body} ${ostinato(locale).pitch3Body}`;
      expect(body, locale).toMatch(/235/);
      expect(body, locale).toMatch(/48/);
    }
  });
});
