import type { ProductPublicRecord, ProjectConfig, ProductLifecycle } from "@/lib/types";

/**
 * What the 3D portfolio band renders for one product.
 *
 * Derived from the public registry, not hand-authored per scene, so the
 * site's honesty rules ride along mechanically:
 * - `screenshot` is non-null ONLY when the registry records a real,
 *   provenance-stamped capture (research products therefore can never
 *   show one — tests/portfolio-cards.test.ts locks this);
 * - the capture date travels with the texture so the scene can stamp it.
 */
export type PortfolioCard = {
  slug: string;
  name: string;
  lifecycle: ProductLifecycle;
  /** Public asset path of the first recorded capture, or null → typographic card. */
  screenshot: string | null;
  /** ISO date of that capture; null exactly when `screenshot` is. */
  capturedAt: string | null;
  /** Product brand color lighting the stage while this card is focused. */
  brandPrimary: string;
  /** Brand gradient for typographic cards. */
  brandGradient: string | null;
  statusTr: string;
  statusEn: string;
  /** One-line product summary (ProjectConfig.short) for the focused-card panel. */
  shortTr: string;
  shortEn: string;
};

/** Neutral fallback when a registry product has no ProjectConfig (stage stays neutral rather than crashing). */
const NEUTRAL = "#9A9AA3";

const STATUS_LABELS: Record<ProductLifecycle, { tr: string; en: string }> = {
  live: { tr: "Canlı", en: "Live" },
  beta: { tr: "Beta", en: "Beta" },
  research: { tr: "Araştırma", en: "Research" },
  archived: { tr: "Arşiv", en: "Archived" },
};

const LIFECYCLE_ORDER: Record<ProductLifecycle, number> = {
  live: 0,
  beta: 0, // shipped surfaces share the front row; registry order breaks ties
  research: 1,
  archived: 2,
};

export function buildPortfolioCards(
  registry: ProductPublicRecord[],
  projectConfigs: ProjectConfig[],
): PortfolioCard[] {
  const bySlug = new Map(projectConfigs.map((p) => [p.slug, p]));

  return registry
    .filter((record) => record.lifecycle !== "archived")
    .map((record, index) => ({ record, index }))
    .sort(
      (a, b) =>
        LIFECYCLE_ORDER[a.record.lifecycle] - LIFECYCLE_ORDER[b.record.lifecycle] ||
        a.index - b.index,
    )
    .map(({ record }) => {
      const project = bySlug.get(record.slug);
      const shot = record.screenshots[0] ?? null;
      const labels = STATUS_LABELS[record.lifecycle];
      return {
        slug: record.slug,
        name: record.name,
        lifecycle: record.lifecycle,
        screenshot: shot ? shot.path : null,
        capturedAt: shot ? shot.capturedAt : null,
        brandPrimary: project?.brand.primary ?? NEUTRAL,
        brandGradient: project?.brand.gradient ?? null,
        statusTr: labels.tr,
        statusEn: labels.en,
        shortTr: project?.short.tr ?? "",
        shortEn: project?.short.en ?? "",
      };
    });
}

/**
 * Which card the camera is centered on for a given scroll progress through
 * the band (0..1). Shared by the scene (camera/light) and the DOM info
 * panel so the two can never disagree about what is focused.
 */
export function activeCardIndex(progress: number, cardCount: number): number {
  if (cardCount === 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  // Rounded against (count-1), matching the camera's continuous track
  // (bandX = progress * spacing * (count-1)) — the panel names whichever
  // card the camera is NEAREST, never one it has already left behind.
  return Math.min(cardCount - 1, Math.round(clamped * (cardCount - 1)));
}
