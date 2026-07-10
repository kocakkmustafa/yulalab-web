import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { ProjectCard } from "@/components/landing/ProjectCard";
import { projects } from "@/data/projects";

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
  return (
    <div className="page-enter">
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("eyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[80px]">
          <StaggerWords text={t("title")} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {t("intro")}
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.slug}
            project={p}
            variant="big"
            index={i}
            total={projects.length}
          />
        ))}
      </section>
    </div>
  );
}
