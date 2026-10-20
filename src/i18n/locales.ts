/** Approved public interface locales. Form/mail intake remains a separate contract. */
export const SUPPORTED_LOCALES = [
  "tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar",
  "it", "ko", "id", "pl", "hi", "zh-Hans",
] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe", en: "English", "es-419": "Español (Latinoamérica)",
  "pt-BR": "Português (Brasil)", de: "Deutsch", fr: "Français", ja: "日本語", ar: "العربية",
  it: "Italiano", ko: "한국어", id: "Bahasa Indonesia", pl: "Polski", hi: "हिन्दी", "zh-Hans": "简体中文",
};
export const OG_LOCALES: Record<Locale, string> = {
  tr: "tr_TR", en: "en_US", "es-419": "es_419", "pt-BR": "pt_BR", de: "de_DE", fr: "fr_FR", ja: "ja_JP", ar: "ar_AR",
  it: "it_IT", ko: "ko_KR", id: "id_ID", pl: "pl_PL", hi: "hi_IN", "zh-Hans": "zh_CN",
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.some((locale) => locale === value);
}

/** Case aliases and explicitly Simplified Chinese tags only, never bare zh or Traditional regions/scripts. */
export function normalizeLocale(value: unknown): Locale | undefined {
  if (typeof value !== "string") return undefined;
  const lower = value.toLowerCase();
  const supported = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
  if (supported) return supported;
  if (["zh-cn", "zh-sg", "zh-hans-cn", "zh-hans-sg"].includes(lower)) return "zh-Hans";
  return undefined;
}

/** Prevent best-fit negotiation from silently turning unsupported Chinese scripts/regions into Simplified. */
export function filterUnsupportedChineseLanguages(header: string | null): string | null {
  if (header === null) return null;
  return header.split(",").filter((entry) => {
    const language = entry.trim().split(";", 1)[0];
    return !/^zh(?:-|$)/i.test(language) || normalizeLocale(language) === "zh-Hans";
  }).join(",");
}

export function localePath(locale: string, path = "/"): string {
  const canonical = normalizeLocale(locale) ?? "tr";
  const prefix = canonical === "tr" ? "" : `/${canonical}`;
  return `${prefix}${path === "/" ? "" : path}` || "/";
}
export function localeAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, localePath(locale, path)]));
}
