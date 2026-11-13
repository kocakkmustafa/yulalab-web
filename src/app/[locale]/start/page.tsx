import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/i18n/locales";
import { GatesPage } from "@/components/landing/GatesPage";
import type { Locale } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "start" });
  return {
    title: t("metaTitle"),
    description: t("lede"),
    alternates: {
      canonical: locale === "tr" ? "/start" : `/${locale}/start`,
      languages: localeAlternates("/start"),
    },
  };
}

export default async function StartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GatesPage locale={locale as Locale} />;
}
