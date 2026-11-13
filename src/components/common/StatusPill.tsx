"use client";

import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/lib/types";

/**
 * Founder decision 2026-11-09 ("Evet, rozet ekle", ADR-004 §7a): every card
 * carries a status pill. It supersedes the 2026-10-31 rule that live/beta
 * cards say nothing. `status` mirrors the public registry lifecycle
 * (tests/status-pill.test.tsx pins the mapping), so a pill can only say
 * "Live" / "Beta" where the registry does; no new claim is made here.
 */
export const STATUS_PILL_KEY: Record<ProjectStatus, "live" | "beta" | "comingSoon"> = {
  live: "live",
  beta: "beta",
  "coming-soon": "comingSoon",
  "in-development": "comingSoon",
};

export function StatusPill({ status }: { status: ProjectStatus; slug: string }) {
  const t = useTranslations("status");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase bg-ink-50/5 text-ink-200 border-white/10">
      <span aria-hidden="true" className="w-1 h-1 shrink-0 rounded-full bg-current" />
      {t(STATUS_PILL_KEY[status])}
    </span>
  );
}
