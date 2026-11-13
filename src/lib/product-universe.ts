import type { ProjectStatus } from "@/lib/types";

/**
 * Pure logic of the product universe (/projects, WEB-UX-05b, 04-design §E3).
 * Kept free of React so the filter, the deep link and the summary are
 * testable on their own.
 *
 * The three filter buckets are the same three words the status pill says
 * (StatusPill.STATUS_PILL_KEY): "in-development" folds into "soon", exactly
 * as the pill does, so a filter can never promise something the pill denies.
 */
export type UniverseFilter = "all" | "live" | "beta" | "soon";

export const UNIVERSE_FILTERS: readonly UniverseFilter[] = ["all", "live", "beta", "soon"];

/** Query parameter of the deep link: `/projects?katman=<slug>`. */
export const LAYER_PARAM = "katman";

export function statusBucket(status: ProjectStatus): Exclude<UniverseFilter, "all"> {
  if (status === "live") return "live";
  if (status === "beta") return "beta";
  return "soon";
}

export function matchesFilter(status: ProjectStatus, filter: UniverseFilter): boolean {
  return filter === "all" || statusBucket(status) === filter;
}

export type StatusSummary = { live: number; beta: number; soon: number };

/** Counts come from the catalogue the page renders, never from typed numbers. */
export function summariseStatus(items: readonly { status: ProjectStatus }[]): StatusSummary {
  const out: StatusSummary = { live: 0, beta: 0, soon: 0 };
  for (const item of items) out[statusBucket(item.status)] += 1;
  return out;
}

/** The slug in `?katman=`, or null when absent or not one of `slugs`. */
export function parseLayer(search: string, slugs: readonly string[]): string | null {
  const value = new URLSearchParams(search).get(LAYER_PARAM);
  return value && slugs.includes(value) ? value : null;
}

/** `search` with `katman` set to `slug` (or removed when null); other params stay. */
export function withLayer(search: string, slug: string | null): string {
  const params = new URLSearchParams(search);
  if (slug) params.set(LAYER_PARAM, slug);
  else params.delete(LAYER_PARAM);
  const out = params.toString();
  return out ? `?${out}` : "";
}
