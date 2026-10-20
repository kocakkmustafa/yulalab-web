import { localeAlternates } from "@/i18n/locales";
import { text } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { GlassSheen } from "@/components/common/GlassSheen";
import { caseStudies } from "@/data/case-studies";
import { publicRegistry } from "@/data/public-registry";
import { publishableCaseStudies } from "@/lib/case-studies";
import { registryFigure } from "@/lib/figure-match";
import type { Locale } from "@/lib/types";

/**
 * Time-dependent: publishableCaseStudies() withdraws a case whose own
 * verification window has closed, or whose source claim has lapsed. Frozen
 * at build, that gate would never fire in production — a withdrawn case
 * would stay published until somebody happened to deploy.
 */
export const revalidate = 900;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = locale === "tr";
  return {
    title: text(locale, "Vaka çalışmaları", "Case studies"),
    description: text(locale, "Kanıtlanabilir sonuçları olan, izni yazılı vaka çalışmaları.", "Case studies with provable outcomes and written permission."),
    alternates: {
      canonical: tr ? "/case-studies" : `/${locale}/case-studies`,
      languages: localeAlternates("/case-studies"),
    },
  };
}

export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Index />;
}

function Index() {
  const locale = useLocale() as Locale;
  const published = publishableCaseStudies(caseStudies, publicRegistry);

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-32 lg:px-10 lg:pt-40">
        <EyebrowChip>{text(locale, "Vaka çalışmaları", "Case studies")}</EyebrowChip>
        <h1 className="mt-7 font-display text-[40px] font-extrabold leading-[0.96] tracking-tightest text-ink-50 sm:text-[56px] md:text-[68px]">
          {text(locale, "Anlatmadan önce kanıtlarız.", "We prove it before we tell it.")}
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {text(locale, "Bir vaka çalışması bu sitenin yapabileceği en güçlü iddiadır. Bu yüzden yayına girme koşulları editoryal değil, yapısaldır.", "A case study is the strongest claim this site can make. So what lets one appear here is structural, not editorial.")}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 lg:px-10">
        {published.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-surface-inset p-7">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
              {text(locale, "Şu an yayında vaka çalışması yok.", "No case study is published yet.")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
              {text(locale, "Bu bir eksiklik değil, kuralın sonucu: sıradaki iki aday (LifeOS ve Braavolabs) için gereken ön koşullar henüz karşılanmadı — LifeOS'un gelir iddiası doğrulanmadı, Braavolabs'ın ücretli pilot sonucu yok. Koşullar karşılanmadan buraya bir hikâye koymayız.", "That is the rule working, not a gap: the preconditions for the next two candidates (LifeOS and Braavolabs) are not met — LifeOS has no verified revenue claim, and Braavolabs has no paid-pilot result. We do not put a story here before the conditions hold.")}
            </p>
            <div className="mt-6 border-t border-hairline pt-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                {text(locale, "Bir vakanın taşıması gerekenler", "What a case must carry")}
              </div>
              <ul className="mt-3 grid gap-2 text-[14px] leading-relaxed text-ink-300 sm:grid-cols-2">
                {([text(locale, "Yazılı izin ve kapsamı", "Written permission and its scope"), text(locale, "Başlangıç durumu", "Baseline"), text(locale, "Kısıt", "Constraint"), text(locale, "Karar kaydı", "Decision log"), text(locale, "Gerçek artefakt (kod/commit/ölçüm)", "A real artifact (code/commit/measurement)"), text(locale, "Kayıtlı bir iddiaya bağlı sonuç", "An outcome tied to a recorded claim"), text(locale, "Ne başarısız oldu", "What failed"), text(locale, "Geçerlilik tarihi", "Validity date")]
                ).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-ink-500">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-400">
                {text(locale, "Bu liste süs değil: eksik bir vaka testte değil, build'de düşer.", "This list is not decoration: an incomplete case fails the build, not merely a test.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {published.map((study) => (
              <Link
                key={study.slug}
                href={`/case-studies/${study.slug}`}
                className="focusable block rounded-2xl border border-hairline bg-surface p-7 transition-colors hover:bg-surface-raised"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                  {study.verifiedAt}
                </div>
                <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-ink-50">
                  {text(locale, study.titleTr, study.titleEn)}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
                  {text(locale, study.outcome.metricTr, study.outcome.metricEn)} —{" "}
                  {registryFigure(
                    publicRegistry
                      .find((r) => r.slug === study.productSlug)
                      ?.claims.find((c) => c.id === study.outcome.claimId),
                    study.outcome.figure,
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
