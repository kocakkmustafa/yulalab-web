import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { localePath, normalizeLocale } from "@/i18n/locales";
import { THEME_BOOTSTRAP, THEME_COLORS } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeControl } from "@/components/theme/ThemeControl";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale()) ?? "tr";
  const t = await getTranslations({ locale, namespace: "notFound" });
  return {
    metadataBase: new URL("https://yulalab.com"),
    title: "404 · YULA Lab",
    description: t("title"),
    openGraph: {
      title: "404 · YULA Lab", description: t("title"),
      images: [{ url: "https://yulalab.com/opengraph-image", width: 1200, height: 630, alt: "YULA Lab" }],
    },
    twitter: { card: "summary_large_image", images: ["https://yulalab.com/opengraph-image"] },
  };
}

// Global 404s bypass the ordinary layout. Retain the selected locale and
// fixed appearance bootstrap rather than hard-coding Turkish/dark chrome.
export default async function GlobalNotFound() {
  const locale = normalizeLocale(await getLocale()) ?? "tr";
  const t = await getTranslations({ locale, namespace: "notFound" });
  const common = await getTranslations({ locale, namespace: "common" });
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content={THEME_COLORS.dark} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-ink-900 text-ink-50" style={{ minHeight: "100vh", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <NextIntlClientProvider locale={locale} messages={{}}>
          <ThemeProvider>
            <main className="grid min-h-screen place-items-center p-6 text-center">
              <div>
                <div className="mb-8"><ThemeControl /></div>
                <p className="mb-4 font-mono text-xs tracking-widest text-ink-300" dir="ltr">404 · YULA LAB</p>
                <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight sm:text-6xl">{t("title")}</h1>
                <Link href={localePath(locale)} className="focusable mt-8 inline-block rounded-full border border-hairline-strong px-5 py-3 text-sm">
                  {common("home")}
                </Link>
              </div>
            </main>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
