"use client";

import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/lib/types";

/**
 * Founder decision 2026-10-31: product cards introduce finished products and
 * state no publication status. Only an app that is not in a store yet says
 * "Coming soon"; publication evidence lives on /transparency.
 */
export function StatusPill({ status }: { status: ProjectStatus; slug: string }) {
  const t = useTranslations("status");
  if (status === "live" || status === "beta") return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase bg-ink-50/5 text-ink-200 border-white/10">
      <span aria-hidden="true" className="w-1 h-1 shrink-0 rounded-full bg-current" />
      {t("comingSoon")}
    </span>
  );
}
