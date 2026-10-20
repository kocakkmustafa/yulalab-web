import { describe, expect, it } from "vitest";
import { filterUnsupportedChineseLanguages, isLocale, LOCALE_LABELS, localeAlternates, localePath, normalizeLocale, OG_LOCALES, SUPPORTED_LOCALES } from "@/i18n/locales";
import { supportsLeadIntake } from "@/lib/forms/lead-submission";

// No server, browser, network or provider work. Routing/CSP acceptance is separate.
describe("fourteen-language public interface contract", () => {
  it("keeps exactly the approved public languages and complete discovery labels", () => {
    expect(SUPPORTED_LOCALES).toEqual(["tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar", "it", "ko", "id", "pl", "hi", "zh-Hans"]);
    expect(Object.keys(LOCALE_LABELS)).toEqual([...SUPPORTED_LOCALES]);
    expect(Object.keys(OG_LOCALES)).toEqual([...SUPPORTED_LOCALES]);
    expect(LOCALE_LABELS["zh-Hans"]).toBe("简体中文");
    expect(OG_LOCALES["zh-Hans"]).toBe("zh_CN");
  });

  it.each(SUPPORTED_LOCALES)("keeps %s Intl-valid without widening form intake", (locale) => {
    expect(Intl.getCanonicalLocales(locale)).toEqual([locale]);
    expect(Intl.DateTimeFormat.supportedLocalesOf([locale])).toHaveLength(1);
    expect(Intl.NumberFormat.supportedLocalesOf([locale])).toHaveLength(1);
    expect(normalizeLocale(locale)).toBe(locale);
    expect(isLocale(locale)).toBe(true);
    expect(supportsLeadIntake(locale)).toBe(locale === "tr" || locale === "en");
    expect(localeAlternates("/privacy")[locale]).toBe(localePath(locale, "/privacy"));
  });

  it.each(["ZH-HANS", "zh-CN", "zh-SG", "zh-Hans-CN", "zh-Hans-SG"])("normalizes only the explicit Simplified alias %s", (alias) => {
    expect(normalizeLocale(alias)).toBe("zh-Hans");
    expect(isLocale(alias)).toBe(false);
    expect(localePath(alias, "/privacy")).toBe("/zh-Hans/privacy");
  });

  it.each(["zh", "zh-Hant", "zh-TW", "zh-HK", "zh-MO", "zh-Hant-CN", "zh-Hant-TW", "zh-Hans-TW", "zh-Hans-HK", "xx", "es-MX", "pt-PT", "__proto__", "constructor", "../en", " en", "en/anything", null, undefined])("does not convert unsupported %s into Simplified Chinese or open intake", (unsupported) => {
    expect(normalizeLocale(unsupported)).toBeUndefined();
    expect(isLocale(unsupported)).toBe(false);
    expect(supportsLeadIntake(unsupported)).toBe(false);
  });

  it("keeps explicit Simplified language headers and excludes implicit Traditional best-fit matching", () => {
    expect(filterUnsupportedChineseLanguages("zh-TW,zh-Hant;q=0.9,en-GB;q=0.8,tr;q=0.7")).toBe("en-GB;q=0.8,tr;q=0.7");
    expect(filterUnsupportedChineseLanguages("zh-HK,zh-MO;q=0.9,zh;q=0.8")).toBe("");
    expect(filterUnsupportedChineseLanguages("zh-CN,zh-Hans;q=0.9,zh-SG;q=0.8,en;q=0.7")).toBe("zh-CN,zh-Hans;q=0.9,zh-SG;q=0.8,en;q=0.7");
    expect(filterUnsupportedChineseLanguages("tr-TR,en-US;q=0.9,fr-FR;q=0.8")).toBe("tr-TR,en-US;q=0.9,fr-FR;q=0.8");
    expect(filterUnsupportedChineseLanguages(null)).toBeNull();
  });

  it("preserves canonical TR/EN paths and safely bounds path-builder locale input", () => {
    expect(localePath("tr")).toBe("/");
    expect(localePath("en")).toBe("/en");
    expect(localePath("en", "/contact")).toBe("/en/contact");
    expect(localePath("xx", "/contact")).toBe("/contact");
  });
});
