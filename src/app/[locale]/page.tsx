import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, ArrowRight } from "@/components/common/icons";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { YulaBanner } from "@/components/common/YulaBanner";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
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
      {/* HERO */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
        <HeroBackdrop />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <EyebrowChip>{t("eyebrow")}</EyebrowChip>

            <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[72px] lg:text-[80px] xl:text-[92px] max-w-[14ch]">
              <StaggerWords text={t("heroTitle")} />
            </h1>

            <p className="mt-7 max-w-[52ch] text-[16.5px] md:text-[17.5px] leading-[1.6] text-ink-300">
              {t("heroDescription")}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 rounded-full bg-ink-50 text-ink-900 pl-5 pr-4 py-3 text-[14px] font-medium hover:bg-ink-100 transition-colors focusable"
              >
                {tc("discoverProjects")}{" "}
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </Link>
              <Link
                href="/manifesto"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 text-ink-100 pl-5 pr-5 py-3 text-[14px] font-medium hover:border-white/30 hover:bg-white/[0.04] transition-colors focusable"
              >
                {tc("manifesto")}
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6 text-[12px] text-ink-400 font-mono tracking-widest uppercase">
              <span>{t("heroMeta.products")}</span>
              <span className="w-px h-3 bg-white/10" />
              <span>{t("heroMeta.studio")}</span>
              <span className="w-px h-3 bg-white/10" />
              <span>{t("heroMeta.place")}</span>
            </div>
          </div>

          {/* Banner card */}
          <div className="relative">
            <div className="relative tilt-r aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[28px] opacity-60"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(255,255,255,0.10), transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
              <YulaBanner />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-ink-400 px-1">
              <span>{t("bannerCardTopLabel")}</span>
              <span>{t("bannerCardBottomLabel")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* VISION / MISSION STRIP */}
      <section className="relative border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 items-start">
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              {t("visionEyebrow")}
            </div>
            <p className="font-display text-[22px] md:text-[24px] leading-[1.3] tracking-tight text-ink-100">
              {t("visionBody")}
            </p>
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-4">
              {t("missionEyebrow")}
            </div>
            <p className="font-display text-[22px] md:text-[24px] leading-[1.3] tracking-tight text-ink-100">
              {t("missionBody")}
            </p>
          </div>
          <div className="md:pt-6">
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
          </div>
        </div>
      </section>

      {/* PROJECTS PREVIEW */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-8 flex items-end justify-between gap-6">
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
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
