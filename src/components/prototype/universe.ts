import { company } from "@/data/company";
import { localized } from "@/lib/localized";
import type { ProductPublicRecord, ProjectConfig, SurfaceKind } from "@/lib/types";
import { badgeKindFor, type Access, type UniverseEntry } from "./universe-core";

export * from "./universe-core";

/**
 * Pure logic of the prototype product universe (04-design E3): single
 * ordering source, two groups, status filter, badge mapping, access path.
 * Everything status-like is derived from the registry; nothing is invented.
 */

/** ADR-004 §8 #5: "Ana ürünler" = LifeOS, Braavolabs, Ostinato (in this order). */
export const MAIN_SLUGS = ["lifeos", "braavolabs", "ostinato"] as const;
/** Portfolio order (04-design E3 wireframe). */
export const PORTFOLIO_SLUGS = ["burunfarki", "gravita", "lissom", "jablab", "choreia"] as const;
export const UNIVERSE_ORDER: readonly string[] = [...MAIN_SLUGS, ...PORTFOLIO_SLUGS];

const SURFACE_LABEL: Record<SurfaceKind, string> = {
  web: "Web",
  ios: "App Store",
  android: "Google Play",
  desktop: "Desktop",
  cli: "CLI",
};

/** Real destinations only: surfaces confirmed live/beta in the registry. Otherwise "notify me" mailto. */
export function accessFor(record: ProductPublicRecord, project: Pick<ProjectConfig, "name" | "contactEmail">): Access {
  const links = record.surfaces
    .filter((s) => (s.status === "live" || s.status === "beta") && /^https:\/\//.test(s.url))
    .map((s) => ({ label: SURFACE_LABEL[s.kind], href: s.url }));
  if (links.length > 0) return { kind: "links", links };
  const to = project.contactEmail ?? company.contact.email;
  return { kind: "notify", href: `mailto:${to}?subject=${encodeURIComponent(`${project.name} — Notify me at launch`)}` };
}

export function buildUniverse(
  records: readonly ProductPublicRecord[],
  projects: readonly ProjectConfig[],
  locale: string,
): UniverseEntry[] {
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const ordered = [...records].sort((a, b) => {
    const ia = UNIVERSE_ORDER.indexOf(a.slug);
    const ib = UNIVERSE_ORDER.indexOf(b.slug);
    // Unknown slugs go last, in registry order, never dropped.
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const entries: UniverseEntry[] = [];
  for (const record of ordered) {
    const project = bySlug.get(record.slug);
    if (!project) continue; // no card without a ProjectConfig (as on /projects)
    entries.push({
      slug: record.slug,
      name: record.name,
      group: (MAIN_SLUGS as readonly string[]).includes(record.slug) ? "main" : "portfolio",
      lifecycle: record.lifecycle,
      badge: badgeKindFor(record.lifecycle),
      tagline: localized(project.tagline, locale),
      category: localized(project.category, locale),
      access: accessFor(record, project),
      privacyUrl: record.privacyUrl,
      supportUrl: record.supportUrl,
    });
  }
  return entries;
}

/** Claims whose expiry date has passed (lexicographic ISO compare, as the registry does). */
export function staleClaimCount(record: ProductPublicRecord, today: string): number {
  return record.claims.filter((c) => c.expiresAt < today).length;
}
