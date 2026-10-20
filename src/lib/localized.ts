import de from "../../messages/content-de.json";
import fr from "../../messages/content-fr.json";
import es from "../../messages/content-es-419.json";
import pt from "../../messages/content-pt-BR.json";
import ja from "../../messages/content-ja.json";
import ar from "../../messages/content-ar.json";

const CONTENT: Record<string, Record<string, string>> = { de, fr, "es-419": es, "pt-BR": pt, ja, ar };
/** Literal source copy and catalogue keys stay visible to the existing claim checks. */
export function text(locale: string, tr: string, en: string, values?: Record<string, string | number>): string {
  const selected = locale === "tr" ? tr : locale === "en" ? en : (CONTENT[locale]?.[en] ?? en);
  if (!values) return selected;
  return selected.replace(/\{([^{}]+)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token,
  );
}
export function localized(value: { tr: string; en: string }, locale: string): string {
  return text(locale, value.tr, value.en);
}
