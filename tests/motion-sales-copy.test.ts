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

  // Ostinato moved to the v1 curriculum (690 lessons, founder decisions
  // K3-K9, 2026-11-01). Guitar (240 lessons) and ear training (50 lessons)
  // are open; voice and piano follow. Guitar level 1 (40 lessons) and ear
  // training level 1 (25 lessons) are free, and paid lessons open with an
  // Ostinato membership only: Motion+ is not in its store submission
  // (founder-approved ear-training copy, 2026-11-03).
  it("states Ostinato's open guitar and ear training courses, v1 size and store membership in TR and EN", () => {
    const project = projects.find((p) => p.slug === "ostinato")!;
    for (const text of [project.short.en, project.description.en]) {
      expect(text).toMatch(/guitar .*240 lessons/i);
      expect(text).toMatch(/ear training with 50/);
      expect(text).toMatch(/grows to 690 lessons/);
      expect(text).toMatch(/Guitar level 1 \(40 lessons\) and ear training level 1 \(25 lessons\) are free/);
      expect(text).toMatch(/[Vv]oice and piano are coming soon/);
      expect(text).not.toMatch(/four courses/i);
      expect(text).toMatch(/Ostinato membership through the App Store and Google Play/);
      expect(text).not.toMatch(/Motion\+|155|not recorded/);
    }
    for (const text of [project.short.tr, project.description.tr]) {
      expect(text).toMatch(/Gitar.*240 ders/);
      expect(text).toMatch(/kulak eğitimi.*50 dersle gelir/);
      expect(text).toMatch(/690 derse büyüyor/);
      expect(text).toMatch(/kulak eğitiminin ilk seviyesi \(25 ders\)/);
      expect(text).not.toMatch(/dört kurs/i);
      expect(text).toMatch(/Ostinato üyeliğiyle App Store ve Google Play üzerinden/);
      expect(text).not.toMatch(/Motion\+|155|kaydedilmez/);
    }
  });
});
