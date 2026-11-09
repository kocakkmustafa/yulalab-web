import type { ProductLifecycle, ProductPublicRecord } from "./types";

/**
 * How the products index orders and groups what it shows.
 *
 * The index previously rendered all eight products in one flat grid, so a
 * research app with no store listing sat at the same visual weight as a
 * shipped one — which roadmap §1.3 forbids in the main proof section for a
 * good reason: a grid of eight cards reads as eight products, and five of
 * ours cannot be downloaded.
 */
const RANK: Record<ProductLifecycle, number> = {
  live: 0,
  beta: 1,
  research: 2,
  archived: 3,
};

export function lifecycleRank(lifecycle: ProductLifecycle): number {
  return RANK[lifecycle];
}

/**
 * The most recent date anyone confirmed something about this product.
 * Surfaces carry the freshest signal (store status is re-checked on a
 * 24-hour window); `updatedAt` is the fallback for a record that has no
 * surfaces yet, which is every research product.
 */
export function latestVerifiedAt(record: ProductPublicRecord): string {
  const dates = record.surfaces.map((s) => s.verifiedAt).filter(Boolean);
  if (dates.length === 0) return record.updatedAt;
  return dates.reduce((latest, d) => (d > latest ? d : latest));
}

export type IndexPartition = {
  /** Live and beta — what the site can actually prove ships. */
  primary: ProductPublicRecord[];
  /** Research — shown, but separately and labelled, never as shipped. */
  research: ProductPublicRecord[];
  /** Archived — out of the default view entirely (roadmap §6). */
  archived: ProductPublicRecord[];
};

export function partitionForIndex(records: readonly ProductPublicRecord[]): IndexPartition {
  const byPriority = [...records].sort((a, b) => {
    const rank = lifecycleRank(a.lifecycle) - lifecycleRank(b.lifecycle);
    if (rank !== 0) return rank;
    // ISO dates compare correctly as strings; newest verification first.
    return latestVerifiedAt(b).localeCompare(latestVerifiedAt(a));
  });

  return {
    primary: byPriority.filter((r) => r.lifecycle === "live" || r.lifecycle === "beta"),
    research: byPriority.filter((r) => r.lifecycle === "research"),
    archived: byPriority.filter((r) => r.lifecycle === "archived"),
  };
}

/**
 * The ONE product order for the site (ADR-004 §8 #5, WEB-UX-05a).
 *
 * The home journey, /projects and the `projects` array (footer, sitemap, product
 * pages) all read this list; `ProjectConfig.order` is superseded and no longer
 * consulted. "Featured" = the main products (LifeOS, Braavolabs, Ostinato);
 * grouping says nothing about shipping state — each card's own status pill
 * does (Ostinato reads "Coming soon" because the registry says research).
 */
export const PRODUCT_ORDER = [
  "lifeos",
  "braavolabs",
  "ostinato",
  "burunfarki",
  "gravita",
  "lissom",
  "jablab",
  "choreia",
] as const;

export const FEATURED_PRODUCT_COUNT = 3;

const POSITION = new Map<string, number>(PRODUCT_ORDER.map((slug, i) => [slug, i]));

/** Position in the canonical order; unknown slugs sort last, stably. */
export function productPosition(slug: string): number {
  return POSITION.get(slug) ?? PRODUCT_ORDER.length;
}

export function sortByProductOrder<T extends { slug: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => productPosition(a.slug) - productPosition(b.slug));
}

export type ProductGroups<T> = {
  /** "Ana ürünler" — LifeOS, Braavolabs, Ostinato. */
  featured: T[];
  /** "Portföy" — everything else, in canonical order. */
  portfolio: T[];
};

export function groupProducts<T extends { slug: string }>(items: readonly T[]): ProductGroups<T> {
  const sorted = sortByProductOrder(items);
  return {
    featured: sorted.filter((i) => productPosition(i.slug) < FEATURED_PRODUCT_COUNT),
    portfolio: sorted.filter((i) => productPosition(i.slug) >= FEATURED_PRODUCT_COUNT),
  };
}

/**
 * Order of the products handed to the 3D homepage scene (YulaExperience).
 * Identical to the pre-WEB-UX-05a order (main 069477c).
 * // scene order is a visual contract: experience/ positions/variants depend on it; do not reorder
 * (productPose, proofLayoutPose, ResearchWireframe variant use the index).
 * Every other surface uses PRODUCT_ORDER.
 */
export const SCENE_PRODUCT_ORDER = [
  "braavolabs",
  "burunfarki",
  "lifeos",
  "gravita",
  "lissom",
  "jablab",
  "ostinato",
  "choreia",
] as const;
