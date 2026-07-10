"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "@/components/common/icons";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import { StatusPill } from "@/components/common/StatusPill";
import { EASE_OUT, HOVER_SPRING } from "@/lib/motion";
import type { Locale, ProjectConfig } from "@/lib/types";

const MotionLink = motion.create(Link);

export function ProjectCard({ project }: { project: ProjectConfig }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;

  return (
    <MotionLink
      href={`/projects/${project.slug}`}
      className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] focusable"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      whileHover={{ y: -4, borderColor: project.brand.primary + "4D", transition: HOVER_SPRING }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
    >
      <div className="flex items-start justify-between">
        <ProjectMonogram project={project} size={56} radius={12} />
        <StatusPill status={project.status} />
      </div>

      <div className="mt-7 font-mono text-[11px] tracking-widest uppercase text-ink-400">
        {project.category[locale]}
      </div>
      <h3
        className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink-50"
        style={{ fontFamily: project.brand.fontDisplay }}
      >
        {project.name}
      </h3>
      <p className="mt-2 text-[15px] text-ink-300 leading-relaxed">
        {project.tagline[locale]}
      </p>

      <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[13px] text-ink-200">{t("explore")}</span>
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 group-hover:border-white/20 transition-colors"
          style={{ color: project.brand.primary }}
        >
          <ArrowRight size={14} strokeWidth={2} className="arrow-nudge" />
        </span>
      </div>
    </MotionLink>
  );
}
