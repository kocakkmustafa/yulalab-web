import { localeAlternates } from "@/i18n/locales";
import { localized } from "@/lib/localized";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { GlassSheen } from "@/components/common/GlassSheen";
import { notFoundMetadata } from "@/lib/not-found-metadata";
import { articleNotes, getArticleBySlug, type ArticleNote } from "@/data/notes";
import type { Locale } from "@/lib/types";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    articleNotes.map((note) => ({ locale, slug: note.slug })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const note = getArticleBySlug(slug);
  if (!note) return notFoundMetadata(locale as Locale);
  return {
    title: localized(note.title, locale),
    description: localized(note.body, locale),
    alternates: {
      canonical: locale === "tr" ? `/notes/${slug}` : `/${locale}/notes/${slug}`,
      languages: localeAlternates(`/notes/${slug}`),
    },
  };
}

export default async function NoteArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const note = getArticleBySlug(slug);
  if (!note) notFound();
  return <Article note={note} />;
}

function Article({ note }: { note: ArticleNote }) {
  const t = useTranslations("notes");
  const locale = useLocale() as Locale;
  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("articleEyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.98] tracking-tightest text-[34px] sm:text-[46px] md:text-[56px]">
          <StaggerWords text={localized(note.title, locale)} />
        </h1>
        <time
          dateTime={note.date}
          className="mt-6 block font-mono text-[11px] tracking-widest uppercase text-ink-400"
        >
          {note.date}
        </time>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-12 space-y-5">
        {note.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-[16px] leading-[1.7] text-ink-300">
            {localized(paragraph, locale)}
          </p>
        ))}
      </section>

      <section
        data-testid="article-sources"
        className="max-w-3xl mx-auto px-6 lg:px-10 pb-24"
      >
        <div className="rounded-2xl border border-hairline bg-surface p-7">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            {t("sourcesHeading")}
          </h2>
          <ul className="mt-4 space-y-3 text-[14px] text-ink-300">
            {note.sources.map((source) => (
              <li key={source.ref}>
                <span>{source.label}</span>
                <br />
                <code className="font-mono text-[12px] text-ink-200 [overflow-wrap:anywhere]">
                  {source.ref}
                </code>
                <span className="font-mono text-[11px] text-ink-400">
                  {" · "}
                  {t("verifiedOn", { date: source.verifiedAt })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px]">
            <Link href="/transparency" className="link-wipe focusable">
              {t("seeTransparency")}
            </Link>
            {" · "}
            <Link href="/notes" className="link-wipe focusable">
              {t("backToNotes")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
