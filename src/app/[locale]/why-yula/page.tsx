import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { GlassSheen } from "@/components/common/GlassSheen";
import { StaggerWords } from "@/components/common/StaggerWords";
import { articleNotes } from "@/data/notes";
import { publicRegistry } from "@/data/public-registry";
import { EVIDENCE_LEVELS, evidenceCounts, lifecycleRows } from "@/lib/operating-system";
import { localized } from "@/lib/localized";
import type { Locale } from "@/lib/types";

/**
 * "Why YULA" (WEB-P0-09). Short and evidence-led: the portfolio and evidence
 * numbers are derived from the public registry, so this page cannot go stale
 * independently of it. The capital / outside-client sentences live only on
 * /studio and /transparency and are deliberately not repeated here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "whyYula" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: locale === "tr" ? "/why-yula" : `/${locale}/why-yula`,
      languages: localeAlternates("/why-yula"),
    },
  };
}

export default async function WhyYulaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WhyYula />;
}

function SourceList({ items, heading }: { items: string[]; heading: string }) {
  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
        {heading}
      </div>
      <ul className="mt-2 space-y-1 text-[13px] text-ink-300">
        {items.map((item) => (
          <li key={item}>
            <code className="font-mono text-[12px] [overflow-wrap:anywhere]">{item}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyYula() {
  const t = useTranslations("whyYula");
  const locale = useLocale() as Locale;
  const rows = lifecycleRows();
  const counts = evidenceCounts();
  const claimTotal = publicRegistry.reduce((n, r) => n + r.claims.length, 0);
  const sourcesHeading = t("sourcesHeading");
  const card = "rounded-2xl border border-hairline bg-surface p-7";
  const h2 = "font-display text-xl font-semibold tracking-tight text-ink-50";
  const body = "mt-2 text-[15px] leading-relaxed text-ink-300";

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("eyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[40px] sm:text-[56px] md:text-[68px]">
          <StaggerWords text={t("title")} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {t("intro")}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-24 space-y-8">
        <article data-testid="why-evidence" className={card}>
          <h2 className={h2}>{t("s1Title")}</h2>
          <p className={body}>{t("s1Body")}</p>
          <SourceList
            heading={sourcesHeading}
            items={["src/data/public-registry.ts", "/transparency", "/notes/how-we-verify-claims"]}
          />
        </article>

        <article data-testid="why-lifecycle" className={card}>
          <h2 className={h2}>{t("s2Title")}</h2>
          <p className={body}>{t("s2Body", { records: publicRegistry.length })}</p>
          <ul className="mt-4 space-y-2 text-[15px] text-ink-200">
            {rows.map((row) => (
              <li key={row.key} data-lifecycle={row.key}>
                <span className="font-semibold">
                  {text(locale, row.labelTr, row.labelEn)}: {row.count}
                </span>
                {row.count > 0 ? (
                  <span className="text-ink-300">
                    {" — "}
                    {publicRegistry
                      .filter((r) => r.lifecycle === row.key)
                      .map((r) => r.name)
                      .join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <SourceList
            heading={sourcesHeading}
            items={["src/data/public-registry.ts", "src/lib/operating-system.ts"]}
          />
        </article>

        <article data-testid="why-levels" className={card}>
          <h2 className={h2}>{t("s3Title")}</h2>
          <p className={body}>{t("s3Body", { claims: claimTotal })}</p>
          <ul className="mt-4 space-y-2 text-[15px] text-ink-200">
            {EVIDENCE_LEVELS.map((level) => (
              <li key={level.kind} data-evidence={level.kind}>
                <span className="font-semibold">
                  {text(locale, level.labelTr, level.labelEn)}: {counts[level.kind]}
                </span>
              </li>
            ))}
          </ul>
          <SourceList
            heading={sourcesHeading}
            items={["src/lib/types.ts", "src/lib/operating-system.ts"]}
          />
        </article>

        <article data-testid="why-reading" className={card}>
          <h2 className={h2}>{t("s4Title")}</h2>
          <p className={body}>{t("s4Body")}</p>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li>
              <Link href="/lab" className="link-wipe focusable">{t("linkLab")}</Link>
            </li>
            <li>
              <Link href="/transparency" className="link-wipe focusable">{t("linkTransparency")}</Link>
            </li>
            {articleNotes.map((note) => (
              <li key={note.slug}>
                <Link href={`/notes/${note.slug}`} className="link-wipe focusable">
                  {localized(note.title, locale)}
                </Link>
              </li>
            ))}
          </ul>
          <SourceList heading={sourcesHeading} items={["src/data/notes.ts"]} />
        </article>
      </section>
    </div>
  );
}
