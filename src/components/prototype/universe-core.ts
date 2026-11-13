import type { ProductLifecycle } from "@/lib/types";

/** Client-safe core of the prototype universe (no content catalogue / company imports). */

export type BadgeKind = "live" | "beta" | "soon" | "archived";
export type UniverseGroup = "main" | "portfolio";
export type StatusFilter = "all" | BadgeKind;
export const STATUS_FILTERS: readonly StatusFilter[] = ["all", "live", "beta", "soon"];

export type AccessLink = { label: string; href: string };
export type Access =
  | { kind: "links"; links: AccessLink[] }
  | { kind: "notify"; href: string };

export type UniverseEntry = {
  slug: string;
  name: string;
  group: UniverseGroup;
  lifecycle: ProductLifecycle;
  badge: BadgeKind;
  tagline: string;
  category: string;
  access: Access;
  privacyUrl: string;
  supportUrl: string;
};

/** Registry lifecycle -> badge. "research" is honestly "Coming soon". */
export function badgeKindFor(lifecycle: ProductLifecycle): BadgeKind {
  switch (lifecycle) {
    case "live":
      return "live";
    case "beta":
      return "beta";
    case "research":
      return "soon";
    case "archived":
      return "archived";
  }
}

export function groupUniverse(entries: readonly UniverseEntry[]): Record<UniverseGroup, UniverseEntry[]> {
  return {
    main: entries.filter((e) => e.group === "main"),
    portfolio: entries.filter((e) => e.group === "portfolio"),
  };
}

export function filterUniverse(entries: readonly UniverseEntry[], filter: StatusFilter): UniverseEntry[] {
  return filter === "all" ? [...entries] : entries.filter((e) => e.badge === filter);
}

export function parseFilter(value: string | undefined): StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value ?? "") ? (value as StatusFilter) : "all";
}

/** Counts derived from the registry; never typed by hand. */
export function summarize(entries: readonly UniverseEntry[]): Record<BadgeKind, number> & { total: number } {
  const out = { live: 0, beta: 0, soon: 0, archived: 0, total: entries.length };
  for (const e of entries) out[e.badge] += 1;
  return out;
}
