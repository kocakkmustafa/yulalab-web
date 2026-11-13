import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { GlassSheen } from "@/components/common/GlassSheen";
import { StaggerWords } from "@/components/common/StaggerWords";
import { notes } from "@/data/notes";
import { caseStudies } from "@/data/case-studies";
import { publicRegistry } from "@/data/public-registry";
import { publishableCaseStudies } from "@/lib/case-studies";
import { portfolioCounts } from "@/lib/operating-system";
import type { Locale } from "@/lib/types";

/**
 * Lab hub (WEB-UX-05e, 04-design §E6). It only points at records that exist:
 * notes, the operating-system page and case studies. Nothing here is
 * invented; where a record set is empty the card says so in words.
 * Time-dependent like /case-studies (a case withdraws when its window closes).
 */
export const revalidate = 900;

const TITLE = { tr: "Laboratuvar", en: "Lab" } as const;
const LEDE = {
  tr: "Gerçek kararlar ve notlar; uydurma veri yok.",
  en: "Real decisions and notes; no invented data.",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: text(locale, TITLE.tr, TITLE.en),
    description: text(locale, LEDE.tr, LEDE.en),
    alternates: {
      canonical: locale === "tr" ? "/lab" : `/${locale}/lab`,
      languages: localeAlternates("/lab"),
    },
  };
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Lab />;
}

function Lab() {
  const locale = useLocale() as Locale;
  const latestNote = notes.reduce<string | null>(
    (latest, n) => (latest === null || n.date > latest ? n.date : latest),
    null,
  );
  const published = publishableCaseStudies(caseStudies, publicRegistry);
  const counts = portfolioCounts();

  const cardClass = "glass p-6 flex flex-col";
  const linkClass =
    "mt-5 inline-flex items-center gap-2 self-start text-[13.5px] text-ink-100 link-wipe focusable";

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{text(locale, TITLE.tr, TITLE.en)}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[56px] md:text-[68px]">
          <StaggerWords text={text(locale, TITLE.tr, TITLE.en)} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {text(locale, LEDE.tr, LEDE.en)}
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className={cardClass} data-testid="lab-notes" aria-labelledby="lab-notes-h">
          <h2 id="lab-notes-h" className="font-display text-xl font-semibold tracking-tight text-ink-50">
            {text(locale, "Notlar", "Notes")}
          </h2>
          {notes.length > 0 && latestNote ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300" data-testid="lab-notes-meta">
              {text(locale, "{count} giriş · son giriş {date}", "{count} entries · latest {date}", {
                count: notes.length,
                date: latestNote,
              })}
            </p>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300" data-testid="lab-notes-empty">
              {text(locale, "Henüz not yok.", "No notes yet.")}
            </p>
          )}
          <Link href="/notes" className={linkClass}>
            {text(locale, "Notlara git", "Open notes")}
            <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
          </Link>
        </article>

        <article className={cardClass} data-testid="lab-os" aria-labelledby="lab-os-h">
          <h2 id="lab-os-h" className="font-display text-xl font-semibold tracking-tight text-ink-50">
            {text(locale, "Nasıl çalışıyoruz", "How we work")}
          </h2>
          {counts.products > 0 ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300" data-testid="lab-os-meta">
              {text(
                locale,
                "{products} ürün kaydı · {claims} iddia · {surfaces} yüzey",
                "{products} product records · {claims} claims · {surfaces} surfaces",
                counts,
              )}
            </p>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
              {text(locale, "Henüz ürün kaydı yok.", "No product records yet.")}
            </p>
          )}
          <Link href="/operating-system" className={linkClass}>
            {text(locale, "Çalışma düzenine git", "See how we work")}
            <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
          </Link>
        </article>

        <article className={cardClass} data-testid="lab-cases" aria-labelledby="lab-cases-h">
          <h2 id="lab-cases-h" className="font-display text-xl font-semibold tracking-tight text-ink-50">
            {text(locale, "Vaka çalışmaları", "Case studies")}
          </h2>
          {published.length > 0 ? (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300" data-testid="lab-cases-meta">
              {text(locale, "{count} yayında vaka", "{count} published cases", { count: published.length })}
            </p>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300" data-testid="lab-cases-empty">
              {text(locale, "Vaka çalışmalarının kapsamı ve sınırları için", "For the scope and limits of case studies, see")}{" "}
              <Link href="/transparency" className="text-ink-100 link-wipe focusable">
                {text(locale, "Şeffaflık sayfasına bakın.", "the Transparency page.")}
              </Link>
            </p>
          )}
          <Link href="/case-studies" className={linkClass}>
            {text(locale, "Vaka çalışmalarına git", "Open case studies")}
            <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
          </Link>
        </article>
      </section>
    </div>
  );
}
