"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isLocale, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/locales";

type Props = { onNavigate?: () => void; compact?: boolean };

export function LocaleSwitcher({ onNavigate, compact = false }: Props) {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label htmlFor={id} className={`relative inline-flex min-w-0 items-center gap-2 text-xs ${compact ? "h-11 w-11 shrink-0 justify-center rounded-full border border-current text-inherit focus-within:outline focus-within:outline-2 focus-within:outline-offset-4" : "text-ink-200"}`}>
      <span className="sr-only">{t("language")}</span>
      {compact ? <span aria-hidden="true" dir="ltr" className="font-mono uppercase">{locale.split("-")[0]}</span> : null}
      <select
        id={id}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!isLocale(nextLocale) || nextLocale === locale) return;
          // Preserve page sections; private query values never cross locales.
          router.replace(`${pathname}${window.location.hash}`, { locale: nextLocale });
          onNavigate?.();
        }}
        className={compact ? "absolute inset-0 h-full w-full cursor-pointer opacity-0" : "focusable max-w-full rounded-full border border-white/15 bg-ink-900 px-3 py-2 text-[12px] text-ink-50"}
      >
        {SUPPORTED_LOCALES.map((language) => (
          <option key={language} value={language} lang={language} dir={language === "ar" ? "rtl" : "ltr"}>
            {LOCALE_LABELS[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
