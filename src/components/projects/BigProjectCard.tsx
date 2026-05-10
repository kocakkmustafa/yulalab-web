"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "@/components/common/icons";
import { StatusPill } from "@/components/common/StatusPill";
import { useReveal } from "@/components/common/useReveal";
import type { Locale, ProjectConfig } from "@/lib/types";

type Props = { project: ProjectConfig; index: number; total: number };

export function BigProjectCard({ project: p, index, total }: Props) {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
  const reveal = useReveal();

  return (
    <Link
      href={`/projects/${p.slug}`}
      ref={reveal.ref as React.RefObject<HTMLAnchorElement>}
      className={
        "group block rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 bg-white/[0.02] focusable card-hover " +
        reveal.className
      }
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{ background: p.brand.background }}
      >
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]"
          style={{
            background: p.brand.gradient,
            opacity: 0.85,
            transition: "transform 800ms var(--ease-soft)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display font-extrabold tracking-tightest leading-none select-none"
            style={{
              color: "rgba(0,0,0,0.55)",
              fontSize: "clamp(120px, 20vw, 220px)",
              fontFamily: p.brand.fontDisplay,
              textShadow: "0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            {p.monogram}
          </div>
        </div>
        <div className="absolute top-5 left-5">
          <StatusPill status={p.status} />
        </div>
        <div className="absolute top-5 right-5 font-mono text-[10.5px] tracking-widest uppercase text-white/80">
          0{index + 1} / 0{total}
        </div>
      </div>

      <div className="p-7 lg:p-9">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
          {p.category[locale]}
        </div>
        <h3
          className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tightest text-ink-50"
          style={{ fontFamily: p.brand.fontDisplay }}
        >
          {p.name}
        </h3>
        <p className="mt-2 text-[15.5px] text-ink-200">{p.tagline[locale]}</p>
        <p className="mt-4 text-[14.5px] text-ink-400 leading-relaxed max-w-[60ch]">
          {p.short[locale]}
        </p>

        <div className="mt-7 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 text-[13.5px]"
            style={{ color: p.brand.primary }}
          >
            <span className="arrow-nudge inline-flex">{tc("openPage")}</span>
            <ArrowRight size={14} strokeWidth={2} className="arrow-nudge" />
          </span>
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
            / projects / {p.slug}
          </div>
        </div>
      </div>
    </Link>
  );
}
