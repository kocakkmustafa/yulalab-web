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

  // The free part is the app's own count (2026-10-30 rewrite); the stat card
  // and the prose must name the same "free of total" pair.
  it.each(MOTION)("%s states its free lessons and store subscription in TR and EN", (slug) => {
    const project = projects.find((p) => p.slug === slug)!;
    const [free, total] = project.stats[0].value.split("/");
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
});
