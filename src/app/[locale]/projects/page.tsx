import { localeAlternates } from "@/i18n/locales";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { ProjectCard } from "@/components/landing/ProjectCard";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { partitionForIndex } from "@/lib/product-index";
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

  // Lifecycle comes from the registry; the card still renders from
  // ProjectConfig. Two sources is the known Y-P0-003 debt — reading the
  // grouping from the registry at least keeps "what is shipped" answered in
  // one place while the merge waits for its own slice.
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const partition = partitionForIndex(publicRegistry);
  const toConfigs = (records: typeof partition.primary) =>
    records.map((r) => bySlug.get(r.slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const ordered = [...toConfigs(partition.primary), ...toConfigs(partition.research)];

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
          publication grouping. Order still follows the registry partition
          (released first); an app not in a store yet carries only its
          "Coming soon" pill. Publication evidence lives on /transparency. */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ordered.map((p, i) => (
            <ProjectCard
              key={p.slug}
              project={p}
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
