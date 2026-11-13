import type { ReactNode } from "react";

const RTL = new Set(["ar", "he", "fa", "ur"]);

/**
 * Product text that localized() returns in the page locale (translated for
 * non-TR/EN locales). Inside FallbackScope (lang="en") it must carry its own
 * language so it is not announced/shaped as English.
 */
export function LocalizedText({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <span lang={locale} dir={RTL.has(locale) ? "rtl" : undefined}>
      {children}
    </span>
  );
}
