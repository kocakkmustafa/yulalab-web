"use client";

import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/lib/types";
import { STATUS_KEY } from "@/lib/types";

const TONE: Record<ProjectStatus, string> = {
  live: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  beta: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  "coming-soon": "bg-ink-50/5 text-ink-200 border-white/10",
  "in-development": "bg-ink-50/5 text-ink-200 border-white/10",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const t = useTranslations("status");
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase " +
        TONE[status]
      }
    >
      <span className="w-1 h-1 rounded-full bg-current" />
      {t(STATUS_KEY[status])}
    </span>
  );
}
