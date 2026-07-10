"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  LINK_ICON,
  FEATURE_ICON,
} from "@/components/common/icons";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import { useReveal } from "@/components/common/useReveal";
import { EASE_OUT, HOVER_SPRING } from "@/lib/motion";
import type { Locale, ProjectConfig, ProjectLink } from "@/lib/types";

type Props = {
  project: ProjectConfig;
  others: ProjectConfig[];
};

type LiveLink = ProjectLink & { href: string };

/** Keep only real outbound links — drop null/empty/"#" placeholders. */
function liveLinks(links: ProjectLink[]): LiveLink[] {
  return links.filter(
    (l): l is LiveLink => typeof l.href === "string" && l.href.trim() !== "" && l.href !== "#"
  );
}

export function ProjectShowcase({ project, others }: Props) {
  const p = project;
  const links = liveLinks(p.links);
  const locale = useLocale() as Locale;
  const t = useTranslations("showcase");

  return (
    <div
      key={p.slug}
      className="page-enter relative min-h-screen"
      style={{
        background: p.brand.background,
        color: p.brand.foreground,
        fontFamily: p.brand.fontBody,
      }}
    >
      <ProjectMesh project={p} />

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-20">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[13px] font-mono tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity focusable"
          style={{ color: p.brand.foreground }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> {t("back")}
        </Link>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border pl-2 pr-3 py-1.5 text-[11px] font-mono tracking-widest uppercase"
              style={{
                borderColor: p.brand.foreground + "22",
                color: p.brand.foreground + "CC",
                background: p.brand.foreground + "06",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: p.brand.primary, boxShadow: `0 0 10px ${p.brand.primary}` }}
              />
              {p.category[locale]}
            </div>

            <h1
              className="mt-7 font-extrabold leading-[0.94] tracking-tightest text-[60px] sm:text-[88px] md:text-[110px] lg:text-[128px]"
              style={{ fontFamily: p.brand.fontDisplay, color: p.brand.foreground }}
            >
              {p.name}
            </h1>

            <p
              className="mt-7 text-[20px] md:text-[24px] leading-[1.3] max-w-[28ch]"
              style={{
                fontFamily: p.brand.fontDisplay,
                color: p.brand.foreground,
                opacity: 0.92,
                fontWeight: 500,
              }}
            >
              {p.tagline[locale]}
            </p>

            <p
              className="mt-5 max-w-[58ch] text-[15.5px] leading-[1.7]"
              style={{ color: p.brand.foreground + "BB" }}
            >
              {p.description[locale]}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-2.5">
              {links.slice(0, 1).map((l) => (
                <BrandPill key={l.kind} link={l} project={p} primary />
              ))}
              {links.slice(1).map((l) => (
                <BrandPill key={l.kind} link={l} project={p} />
              ))}
            </div>
          </div>

          <ProjectHeroCard project={p} />
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 border-y" style={{ borderColor: p.brand.foreground + "14" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {p.stats.map((s, i) => (
            <StatBlock key={s.label.tr} stat={s} project={p} index={i} />
          ))}
        </div>
      </section>

      {/* PITCH */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-8">
        <div
          className="font-mono text-[11px] tracking-widest uppercase mb-6"
          style={{ color: p.brand.foreground + "99" }}
        >
          {t("pitchEyebrow")}
        </div>
        <p
          className="max-w-3xl text-[26px] md:text-[34px] leading-[1.25] tracking-tight"
          style={{
            fontFamily: p.brand.fontDisplay,
            color: p.brand.foreground,
            opacity: 0.92,
          }}
        >
          {p.short[locale]}
        </p>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-8">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div
              className="font-mono text-[11px] tracking-widest uppercase mb-4"
              style={{ color: p.brand.foreground + "99" }}
            >
              {t("featuresEyebrow")}
            </div>
            <h2
              className="font-display text-4xl md:text-5xl font-semibold tracking-tightest"
              style={{ fontFamily: p.brand.fontDisplay, color: p.brand.foreground }}
            >
              {t("featuresTitle")}
            </h2>
          </div>
          <div
            className="hidden md:block font-mono text-[11px] tracking-widest uppercase"
            style={{ color: p.brand.foreground + "70" }}
          >
            {t("featuresCount")}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {p.features.map((f, i) => (
            <FeatureCard key={f.title.tr} feature={f} project={p} index={i} />
          ))}
        </div>
      </section>

      {/* VISION / MISSION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-8 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
        <div>
          <div
            className="font-mono text-[11px] tracking-widest uppercase mb-5"
            style={{ color: p.brand.foreground + "99" }}
          >
            {t("visionEyebrow")}
          </div>
          <p
            className="font-display text-2xl md:text-3xl leading-[1.3] tracking-tight"
            style={{ fontFamily: p.brand.fontDisplay, color: p.brand.foreground }}
          >
            {p.vision[locale]}
          </p>
        </div>
        <div>
          <div
            className="font-mono text-[11px] tracking-widest uppercase mb-5"
            style={{ color: p.brand.foreground + "99" }}
          >
            {t("missionEyebrow")}
          </div>
          <p
            className="font-display text-2xl md:text-3xl leading-[1.3] tracking-tight"
            style={{ fontFamily: p.brand.fontDisplay, color: p.brand.foreground }}
          >
            {p.mission[locale]}
          </p>
        </div>
      </section>

      {/* RESPONSIBLE PLAY (Burun Farkı only) */}
      {p.slug === "burunfarki" && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-4">
          <p
            className="font-mono text-[11px] tracking-widest uppercase"
            style={{ color: p.brand.foreground + "80" }}
          >
            {locale === "tr"
              ? "18+ · Analiz aracı, bahis değildir · Sorumlu oyun: Yeşilay 182 · yesilay.org.tr"
              : "18+ · Analytics tool, not betting · Responsible play: Yeşilay 182 · yesilay.org.tr"}
          </p>
        </section>
      )}

      {/* OTHER PROJECTS */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-32">
        <div
          className="font-mono text-[11px] tracking-widest uppercase mb-8"
          style={{ color: p.brand.foreground + "99" }}
        >
          {t("othersEyebrow")}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={`/projects/${o.slug}`}
              className="group flex items-center gap-5 rounded-2xl p-5 transition-all duration-300 focusable"
              style={{
                background: p.brand.foreground + "06",
                border: `1px solid ${p.brand.foreground}12`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = o.brand.primary + "55";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = p.brand.foreground + "12";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <ProjectMonogram project={o} size={64} radius={14} />
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono text-[10.5px] tracking-widest uppercase"
                  style={{ color: p.brand.foreground + "80" }}
                >
                  {o.category[locale]}
                </div>
                <div
                  className="mt-1 font-display text-2xl font-semibold tracking-tight truncate"
                  style={{ fontFamily: o.brand.fontDisplay, color: p.brand.foreground }}
                >
                  {o.name}
                </div>
                <div
                  className="text-[13px] mt-0.5 truncate"
                  style={{ color: p.brand.foreground + "99" }}
                >
                  {o.tagline[locale]}
                </div>
              </div>
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-full"
                style={{
                  border: `1px solid ${p.brand.foreground}20`,
                  color: o.brand.primary,
                }}
              >
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function ProjectMesh({ project: p }: { project: ProjectConfig }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute drift-a"
        style={{
          width: "70vw",
          height: "70vw",
          left: "-20vw",
          top: "-20vw",
          background: `radial-gradient(circle, ${p.brand.primary}26 0%, transparent 60%)`,
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute drift-b"
        style={{
          width: "60vw",
          height: "60vw",
          right: "-15vw",
          top: "5vw",
          background: `radial-gradient(circle, ${p.brand.secondary}1F 0%, transparent 60%)`,
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute drift-c"
        style={{
          width: "60vw",
          height: "60vw",
          left: "15vw",
          top: "20vw",
          background: `radial-gradient(circle, ${p.brand.accent}1F 0%, transparent 60%)`,
          filter: "blur(140px)",
        }}
      />
    </div>
  );
}

function BrandPill({
  link,
  project: p,
  primary = false,
}: {
  link: LiveLink;
  project: ProjectConfig;
  primary?: boolean;
}) {
  const tl = useTranslations("links");
  const Ic = LINK_ICON[link.kind] ?? ArrowUpRight;
  const label = tl(link.kind);

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className={
        "group inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-all duration-300 focusable border " +
        (primary ? "" : "hover:bg-white/[0.04]")
      }
      style={
        primary
          ? {
              background: p.brand.primary,
              color: p.brand.background,
              borderColor: p.brand.primary,
            }
          : { borderColor: p.brand.foreground + "22", color: p.brand.foreground }
      }
    >
      <Ic size={15} strokeWidth={1.8} />
      <span>{label}</span>
      <ArrowUpRight size={12} strokeWidth={2} className="arrow-nudge opacity-80" />
    </a>
  );
}

function StatBlock({
  stat,
  project: p,
  index,
}: {
  stat: ProjectConfig["stats"][number];
  project: ProjectConfig;
  index: number;
}) {
  const locale = useLocale() as Locale;
  const reveal = useReveal();
  return (
    <div
      ref={reveal.ref as React.RefObject<HTMLDivElement>}
      className={reveal.className}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div
        className="font-display font-bold tracking-tightest text-[44px] md:text-[56px] lg:text-[64px] leading-none tabular-nums"
        style={{ color: p.brand.foreground, fontFamily: p.brand.fontDisplay }}
      >
        {stat.value}
      </div>
      <div
        className="mt-3 font-mono text-[11px] tracking-widest uppercase"
        style={{ color: p.brand.foreground + "99" }}
      >
        {stat.label[locale]}
      </div>
    </div>
  );
}

function FeatureCard({
  feature: f,
  project: p,
  index,
}: {
  feature: ProjectConfig["features"][number];
  project: ProjectConfig;
  index: number;
}) {
  const locale = useLocale() as Locale;
  const Ic = FEATURE_ICON[f.icon ?? "Sparkles"];
  return (
    <motion.div
      className="rounded-2xl p-6"
      style={{
        background: p.brand.foreground + "08",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: p.brand.foreground + "15",
      }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: EASE_OUT, delay: Math.min(index, 5) * 0.06 },
      }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      whileHover={{ y: -3, borderColor: p.brand.primary + "55", transition: HOVER_SPRING }}
    >
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
        style={{
          background: p.brand.foreground + "08",
          border: `1px solid ${p.brand.foreground}12`,
        }}
      >
        <Ic size={19} strokeWidth={1.6} style={{ color: p.brand.foreground, opacity: 0.85 }} />
      </div>
      <h4
        className="mt-5 font-display text-lg font-semibold tracking-tight"
        style={{ color: p.brand.foreground, fontFamily: p.brand.fontDisplay }}
      >
        {f.title[locale]}
      </h4>
      <p
        className="mt-2 text-[14px] leading-relaxed"
        style={{ color: p.brand.foreground + "B0" }}
      >
        {f.description[locale]}
      </p>
    </motion.div>
  );
}

function ProjectHeroCard({ project: p }: { project: ProjectConfig }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[40px]"
        style={{ background: p.brand.gradient, opacity: 0.35, filter: "blur(60px)" }}
      />
      <div
        className="relative aspect-square rounded-3xl overflow-hidden border"
        style={{
          borderColor: p.brand.foreground + "1A",
          background: p.brand.background,
          boxShadow: p.brand.glow,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: p.brand.gradient, opacity: 0.92 }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display font-extrabold leading-none tracking-tightest select-none"
            style={{
              fontSize: "clamp(140px, 22vw, 280px)",
              color: "rgba(0,0,0,0.55)",
              fontFamily: p.brand.fontDisplay,
              textShadow: "0 2px 0 rgba(255,255,255,0.2)",
            }}
          >
            {p.monogram}
          </div>
        </div>
        <div
          className="absolute top-4 left-4 font-mono text-[10.5px] tracking-widest uppercase"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          {p.slug.toUpperCase()}
        </div>
        <div
          className="absolute bottom-4 right-4 font-mono text-[10.5px] tracking-widest uppercase"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          {p.monogram}
        </div>
      </div>
    </div>
  );
}
