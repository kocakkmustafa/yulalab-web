const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

/**
 * Language marking for repository records that exist only in tr/en. When such
 * text is shown on a page in another locale it must say so (WCAG 3.1.2), and
 * in a right-to-left page it keeps its own left-to-right direction. On a page
 * in the record's own language nothing is added.
 */
export function recordLangAttrs(
  recordLang: string | undefined,
  locale: string,
): { lang?: string; dir?: "ltr" } {
  if (!recordLang || recordLang === locale) return {};
  return RTL_LOCALES.has(locale) ? { lang: recordLang, dir: "ltr" } : { lang: recordLang };
}
