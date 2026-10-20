import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { OG_LOCALES, localePath } from "@/i18n/locales";
import { text } from "@/lib/localized";
import { siteOrigin } from "@/lib/site-origin";

const ORIGIN = siteOrigin();

const copy = {
  tr: {
    title: "Sayfa bulunamadı.",
    description: "Aradığınız sayfa bulunamadı.",
    ogLocale: "tr_TR",
    canonical: `${ORIGIN}/`,
  },
  en: {
    title: "Page not found.",
    description: "The page you requested could not be found.",
    ogLocale: "en_US",
    canonical: `${ORIGIN}/en`,
  },
} as const;

export function notFoundMetadata(locale: Locale): Metadata {
  const localized = {
    title: text(locale, copy.tr.title, copy.en.title),
    description: text(locale, copy.tr.description, copy.en.description),
    ogLocale: OG_LOCALES[locale],
    canonical: `${ORIGIN}${localePath(locale)}`,
  };
  return {
    metadataBase: new URL(ORIGIN),
    title: localized.title,
    description: localized.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: localized.canonical,
    },
    openGraph: {
      type: "website",
      locale: localized.ogLocale,
      url: localized.canonical,
      siteName: "YULA Lab",
      title: localized.title,
      description: localized.description,
      images: [
        {
          url: `${ORIGIN}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "YULA Lab — product lab",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: localized.title,
      description: localized.description,
      images: [`${ORIGIN}/opengraph-image`],
    },
  };
}
