"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "@/components/common/icons";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import { StatusPill } from "@/components/common/StatusPill";
import { useReveal } from "@/components/common/useReveal";
import type { Locale, ProjectConfig } from "@/lib/types";

export function ProjectCard({ project }: { project: ProjectConfig }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const reveal = useReveal();

  return (
    <Link
      href={`/projects/${project.slug}`}
      ref={reveal.ref as React.RefObject<HTMLAnchorElement>}
      className={
        "group card-hover relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] focusable " +
        reveal.className
      }
      style={{
        transition:
          "transform 250ms var(--ease-soft), border-color 250ms var(--ease-soft), background-color 250ms var(--ease-soft), opacity 600ms var(--ease-soft)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = project.brand.primary + "4D";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
      }}
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
    </Link>
  );
}
