/** Approved public interface locales. Form/mail intake remains a separate contract. */
export const SUPPORTED_LOCALES = ["tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe", en: "English", "es-419": "Español (Latinoamérica)",
  "pt-BR": "Português (Brasil)", de: "Deutsch", fr: "Français", ja: "日本語", ar: "العربية",
};
export const OG_LOCALES: Record<Locale, string> = {
  tr: "tr_TR", en: "en_US", "es-419": "es_419", "pt-BR": "pt_BR", de: "de_DE", fr: "fr_FR", ja: "ja_JP", ar: "ar_AR",
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.some((locale) => locale === value);
}
export function localePath(locale: string, path = "/"): string {
  const prefix = locale === "tr" ? "" : `/${locale}`;
  return `${prefix}${path === "/" ? "" : path}` || "/";
}
export function localeAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, localePath(locale, path)]));
}
