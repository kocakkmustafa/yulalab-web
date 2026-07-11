import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, ArrowRight } from "@/components/common/icons";
import { Reveal } from "@/components/common/Reveal";
import { LandingHero } from "@/components/landing/LandingHero";
import { ProjectCard } from "@/components/landing/ProjectCard";
import { projects } from "@/data/projects";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <div className="page-enter">
      <LandingHero />

      {/* VISION / MISSION STRIP */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 items-start">
          <Reveal>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              {t("visionEyebrow")}
            </div>
            <p className="font-display text-[22px] md:text-[24px] leading-[1.3] tracking-tight text-ink-100">
              {t("visionBody")}
            </p>
          </Reveal>
          <Reveal delay={90}>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              {t("missionEyebrow")}
            </div>
            <p className="font-display text-[22px] md:text-[24px] leading-[1.3] tracking-tight text-ink-100">
              {t("missionBody")}
            </p>
          </Reveal>
          <Reveal delay={180} className="md:pt-6">
            <Link
              href="/manifesto"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[13.5px] font-medium hover:border-white/25 hover:bg-white/[0.04] transition-colors focusable"
            >
              {tc("readManifesto")}{" "}
              <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
            <div className="mt-4 text-[12.5px] text-ink-400 max-w-[28ch]">
              {t("manifestoNote")}
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROJECTS PREVIEW */}
      <section className="relative">
        <Reveal className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-8 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              {t("projectsEyebrow")}
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tightest text-ink-50">
              {t("projectsTitle")}
            </h2>
          </div>
          <Link
            href="/projects"
            className="hidden md:inline-flex group items-center gap-2 text-[13.5px] text-ink-200 link-wipe"
          >
            {tc("showAll")}{" "}
            <ArrowRight size={14} strokeWidth={2} className="arrow-nudge" />
          </Link>
        </Reveal>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
