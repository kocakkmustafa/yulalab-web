import { normalizeLocale, type Locale } from "@/i18n/locales";
import de from "../../messages/content-de.json";
import fr from "../../messages/content-fr.json";
import es from "../../messages/content-es-419.json";
import pt from "../../messages/content-pt-BR.json";
import ja from "../../messages/content-ja.json";
import ar from "../../messages/content-ar.json";

import it from "../../messages/content-it.json";
import ko from "../../messages/content-ko.json";
import id from "../../messages/content-id.json";
import pl from "../../messages/content-pl.json";
import hi from "../../messages/content-hi.json";
import zhHans from "../../messages/content-zh-Hans.json";

const CONTENT: Record<Exclude<Locale, "tr" | "en">, Record<string, string>> = {
  de, fr, "es-419": es, "pt-BR": pt, ja, ar, it, ko, id, pl, hi, "zh-Hans": zhHans,
};
/** Literal source copy and catalogue keys stay visible to the existing claim checks. */
export function text(locale: string, tr: string, en: string, values?: Record<string, string | number>): string {
  const canonical = normalizeLocale(locale);
  const selected = canonical === "tr" ? tr : canonical === "en" || !canonical ? en : (CONTENT[canonical][en] ?? en);
  if (!values) return selected;
  return selected.replace(/\{([^{}]+)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token,
  );
}
export function localized(value: { tr: string; en: string }, locale: string): string {
  return text(locale, value.tr, value.en);
}
