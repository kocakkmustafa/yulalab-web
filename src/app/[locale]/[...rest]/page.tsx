import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

const ORIGIN = "https://yulalab.com";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const localized = copy[locale];
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

export default async function LocaleAwareNotFound({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  notFound();
}
