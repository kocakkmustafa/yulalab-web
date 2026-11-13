import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { projects } from "@/data/projects";

const root = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const MOTION = ["gravita", "lissom", "jablab", "ostinato", "choreia"];

// The first release sells subscriptions (user decision 2026-10-23); camera
// coaching stays closed. These were the "sales closed" phrasings per locale.
const RETIRED = /paid sales|ücretli satış|kostenpflichtiger Verkauf|ventes payantes|ventas (?:de pago|pagadas)|vendas pagas|有料販売|البيع المدفوع|المبيعات المدفوعة|vendite a pagamento|유료 판매|penjualan berbayar|płatna sprzedaż|भुगतान वाली बिक्री|付费销售|If subscriptions are enabled|Abonelikler açılırsa|cannot start subscription purchases|satın alma başlatılamaz/i;

describe("Motion sales-open copy", () => {
  it.each(SUPPORTED_LOCALES)("%s messages carry no retired sales-closed claim", (locale) => {
    expect(read(`messages/${locale}.json`)).not.toMatch(RETIRED);
    if (locale !== "tr" && locale !== "en") {
      expect(read(`messages/content-${locale}.json`)).not.toMatch(RETIRED);
    }
  });

  it.each([
    "src/app/[locale]/support/page.tsx",
    "src/app/[locale]/privacy/motion/page.tsx",
    ...MOTION.map((slug) => `src/data/projects/${slug}.ts`),
  ])("%s carries no retired sales-closed claim", (rel) => {
    expect(read(rel)).not.toMatch(RETIRED);
  });

  // The free part is each app's own count in its candidate build (2026-10-30;
  // evidence scratch/2026-10-30-magaza-metinleri/site/EVIDENCE-GREP.txt).
  const FREE_OF_TOTAL: Record<string, [string, string]> = {
    jablab: ["39", "129"],
    gravita: ["44", "117"],
    lissom: ["47", "120"],
    choreia: ["33", "88"],
  };
  it.each(MOTION.filter((slug) => slug in FREE_OF_TOTAL))("%s states its free lessons and store subscription in TR and EN", (slug) => {
    const project = projects.find((p) => p.slug === slug)!;
    const [free, total] = FREE_OF_TOTAL[slug];
    for (const text of [project.short.en, project.description.en]) {
      expect(text).toMatch(new RegExp(`${free} of (?:the )?${total} lessons are free`));
      expect(text).toMatch(/subscription through the App Store and Google Play/);
      expect(text).toMatch(/[Cc]amera (?:(?:coaching|measurement|practice) is |is )?off/);
    }
    for (const text of [project.short.tr, project.description.tr]) {
      expect(text).toMatch(new RegExp(`${total} dersin ${free}'\\p{L}+ ücretsiz`, "u"));
      expect(text).toMatch(/App Store ve Google Play üzerinden/);
    }
  });

  // Ostinato counts follow ADR-002 (WEB-P0-10c, 2026-11-13): guitar 235 lessons
  // (+5 test), ear training 48 (+2 test), 283 open in total (+7 test). 690 is a
  // file count and 676 is not on main: neither is written on the site. Voice
  // and piano follow. Guitar level 1 (40 lessons) and ear
  // training level 1 (25 lessons) are free, and paid lessons open with an
  // Ostinato membership only: Motion+ is not in its store submission
  // (founder-approved ear-training copy, 2026-11-03).
  it("states Ostinato's open guitar and ear training courses, v1 size and store membership in TR and EN", () => {
    const project = projects.find((p) => p.slug === "ostinato")!;
    for (const text of [project.short.en, project.description.en]) {
      expect(text).toMatch(/[Gg]uitar .*235 lessons \(\+5 test lessons\)/);
      expect(text).toMatch(/ear training with 48(?: lessons)? \(\+2 test lessons\)/);
      expect(text).toMatch(/283 lessons open in total \(\+7 test lessons\)/);
      expect(text).not.toMatch(/\b(690|676|240)\b|grows to/);
      expect(text).toMatch(/Guitar level 1 \(40 lessons\) and ear training level 1 \(25 lessons\) are free/);
      expect(text).toMatch(/[Vv]oice and piano are coming soon/);
      expect(text).not.toMatch(/four courses/i);
      expect(text).toMatch(/Ostinato membership through the App Store and Google Play/);
      expect(text).not.toMatch(/Motion\+|155|not recorded/);
    }
    for (const text of [project.short.tr, project.description.tr]) {
      expect(text).toMatch(/Gitar.*235 dersle \(\+5 test dersi\)/);
      expect(text).toMatch(/kulak eğitimi.*48 dersle \(\+2 test dersi\) gelir/);
      expect(text).toMatch(/toplam 283 ders açık \(\+7 test dersi\)/);
      expect(text).not.toMatch(/\b(690|676|240)\b|büyüyor/);
      expect(text).toMatch(/kulak eğitiminin ilk seviyesi \(25 ders\)/);
      expect(text).not.toMatch(/dört kurs/i);
      expect(text).toMatch(/Ostinato üyeliğiyle App Store ve Google Play üzerinden/);
      expect(text).not.toMatch(/Motion\+|155|kaydedilmez/);
    }
  });
});
