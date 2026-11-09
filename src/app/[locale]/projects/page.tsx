import { localeAlternates } from "@/i18n/locales";
import { localized } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { ProjectCard } from "@/components/landing/ProjectCard";
import { projects } from "@/data/projects";
import { groupProducts } from "@/lib/product-index";
import { GlassSheen } from "@/components/common/GlassSheen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projectsIndex" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: locale === "tr" ? "/projects" : `/${locale}/projects`,
      languages: localeAlternates("/projects"),
    },
  };
}

export default async function ProjectsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectsIndex />;
}

function ProjectsIndex() {
  const t = useTranslations("projectsIndex");
  const locale = useLocale();

  // One order for every surface: PRODUCT_ORDER (src/lib/product-index.ts).
  // The `projects` array is already in that order; grouping only splits
  // "Ana ürünler" from "Portföy" and keeps both in the one grid.
  const groups = groupProducts(projects);
  const ordered = [...groups.featured, ...groups.portfolio];

  return (
    <div className="page-enter relative project-index">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("eyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[80px]">
          <StaggerWords text={t("title")} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {t("intro")}
        </p>
      </section>

      {/* Founder decision 2026-10-31: one grid of finished products, no
          publication grouping. Order follows PRODUCT_ORDER; an app not in a
          store yet carries only its "Coming soon" pill. Publication evidence lives on /transparency. */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ordered.map((p, i) => (
            <ProjectCard
              key={p.slug}
              project={p}
              copy={{
                category: localized(p.category, locale),
                tagline: localized(p.tagline, locale),
                short: localized(p.short, locale),
              }}
              variant="big"
              index={i}
              total={ordered.length}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
