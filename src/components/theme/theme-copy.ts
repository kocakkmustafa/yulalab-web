export type ThemeCopy = { label: string; light: string; dark: string; system: string; sessionOnly: string };

// Theme-owned copy: main locale catalogues are maintained independently.
export const THEME_COPY = {
  tr: { label: "Görünüm", light: "Açık", dark: "Koyu", system: "Sistem", sessionOnly: "Bu seçim bu sekmede geçerli." },
  en: { label: "Appearance", light: "Light", dark: "Dark", system: "System", sessionOnly: "This choice applies to this tab." },
  "es-419": { label: "Apariencia", light: "Claro", dark: "Oscuro", system: "Sistema", sessionOnly: "Esta selección se aplica a esta pestaña." },
  "pt-BR": { label: "Aparência", light: "Claro", dark: "Escuro", system: "Sistema", sessionOnly: "Esta escolha se aplica a esta aba." },
  de: { label: "Darstellung", light: "Hell", dark: "Dunkel", system: "System", sessionOnly: "Diese Auswahl gilt für diesen Tab." },
  fr: { label: "Apparence", light: "Clair", dark: "Sombre", system: "Système", sessionOnly: "Ce choix s’applique à cet onglet." },
  ja: { label: "外観", light: "ライト", dark: "ダーク", system: "システム", sessionOnly: "この設定はこのタブでのみ有効です。" },
  ar: { label: "المظهر", light: "فاتح", dark: "داكن", system: "النظام", sessionOnly: "يسري هذا الاختيار على علامة التبويب هذه." },
  it: { label: "Aspetto", light: "Chiaro", dark: "Scuro", system: "Sistema", sessionOnly: "Questa scelta si applica a questa scheda." },
  id: { label: "Tampilan", light: "Terang", dark: "Gelap", system: "Sistem", sessionOnly: "Pilihan ini berlaku untuk tab ini." },
  ko: { label: "테마", light: "라이트", dark: "다크", system: "시스템", sessionOnly: "이 설정은 현재 탭에만 적용됩니다." },
  pl: { label: "Wygląd", light: "Jasny", dark: "Ciemny", system: "System", sessionOnly: "Ten wybór dotyczy tej karty." },
  hi: { label: "थीम", light: "हल्का", dark: "गहरा", system: "सिस्टम", sessionOnly: "यह विकल्प केवल इस टैब पर लागू होता है।" },
  "zh-Hans": { label: "外观", light: "浅色", dark: "深色", system: "系统", sessionOnly: "此选择仅在此标签页中生效。" },
} as const satisfies Record<string, ThemeCopy>;

export function themeCopy(locale: string): ThemeCopy {
  if (!Object.prototype.hasOwnProperty.call(THEME_COPY, locale)) throw new Error("Unsupported theme locale");
  return THEME_COPY[locale as keyof typeof THEME_COPY];
}
