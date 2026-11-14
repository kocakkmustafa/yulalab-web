import type { UniverseItem } from "@/components/universe/ProductUniverse";
import type { ProjectConfig } from "@/lib/types";

const STORE_NAME = { appstore: "App Store", playstore: "Google Play" } as const;

/**
 * Closed-test / pre-release listings are never shown as a public store link.
 * Anchored to the host (and path) so a public listing that merely contains
 * "appdistribution" in a query (`id=com.appdistribution.x`) is kept.
 */
export const CLOSED_TEST_HREF = new RegExp(
  "^(?:https?:)?//(?:[^/?#]*\\.)?(?:" +
    "testflight\\.apple\\.com(?:[/?#]|$)" +
    "|beta\\.itunes\\.apple\\.com(?:[/?#]|$)" +
    "|appdistribution\\.firebase\\.(?:google\\.)?(?:com|dev)(?:[/?#]|$)" +
    "|play\\.google\\.com/(?:apps/(?:test|internaltest)|store/apps/testing)" +
    ")",
  "i",
);

type StoreKind = "appstore" | "playstore";

const isStoreKind = (kind: string): kind is StoreKind => kind === "appstore" || kind === "playstore";

/** Coming-soon / in-development products carry no store-availability claim. */
export function isComingSoon(project: ProjectConfig): boolean {
  return project.status === "coming-soon" || project.status === "in-development";
}

/** True when the href is a public destination (not a closed-test / beta listing). */
export function isPublicHref(href: string | null | undefined): href is string {
  return Boolean(href) && !CLOSED_TEST_HREF.test(href as string);
}

/**
 * First public link of a kind. Closed-test links are skipped, and a store kind
 * yields nothing while the product is coming soon.
 */
export function firstPublicLink(project: ProjectConfig, kind: string): string | undefined {
  if (isStoreKind(kind) && isComingSoon(project)) return undefined;
  return project.links.find((l) => l.kind === kind && isPublicHref(l.href))?.href ?? undefined;
}

/** Public store links (first per store), optionally without the primary CTA kind; empty while coming soon. */
export function storeLinksOf(
  project: ProjectConfig,
  exceptKind?: string,
): { kind: StoreKind; href: string }[] {
  return (["appstore", "playstore"] as const)
    .filter((kind) => kind !== exceptKind)
    .flatMap((kind) => {
      const href = firstPublicLink(project, kind);
      return href ? [{ kind, href }] : [];
    });
}

/**
 * Store slots for the row card (WEB-P0-07d): products that ship through the
 * stores get both slots. A slot links to the real public listing; without one
 * it is drawn as "coming soon". A product with no store listing that is not
 * itself coming soon (a web product) gets no slots.
 */
export function storeSlotsOf(project: ProjectConfig): UniverseItem["storeSlots"] {
  if (!project.kind.includes("mobile")) return undefined;
  const comingSoon = isComingSoon(project);
  const links = storeLinksOf(project);
  if (!comingSoon && links.length === 0) return undefined;
  return (["appstore", "playstore"] as const).map((kind) => ({
    kind,
    name: STORE_NAME[kind],
    href: links.find((l) => l.kind === kind)?.href,
  }));
}
