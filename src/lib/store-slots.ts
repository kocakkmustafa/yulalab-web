import type { UniverseItem } from "@/components/universe/ProductUniverse";
import type { ProjectConfig } from "@/lib/types";

const STORE_NAME = { appstore: "App Store", playstore: "Google Play" } as const;

/** Closed-test / pre-release listings are never shown as a public store link. */
const CLOSED_TEST_HREF = /testflight\.apple\.com|play\.google\.com\/(?:apps\/(?:testing|internaltest)|store\/apps\/testing)|appdistribution|\/internaltest\b/i;

/**
 * Store slots for the row card (WEB-P0-07d): products that ship through the
 * stores get both slots. A slot links to the real public listing; without one
 * it is drawn as "coming soon". A product with no store listing that is not
 * itself coming soon (a web product) gets no slots.
 */
export function storeSlotsOf(project: ProjectConfig): UniverseItem["storeSlots"] {
  if (!project.kind.includes("mobile")) return undefined;
  const comingSoon = project.status === "coming-soon" || project.status === "in-development";
  const hrefOf = (kind: "appstore" | "playstore") => {
    const href = project.links.find((l) => l.kind === kind)?.href;
    return href && !CLOSED_TEST_HREF.test(href) ? href : undefined;
  };
  const appstore = hrefOf("appstore");
  const playstore = hrefOf("playstore");
  if (!comingSoon && !appstore && !playstore) return undefined;
  return [
    { kind: "appstore", name: STORE_NAME.appstore, href: comingSoon ? undefined : appstore },
    { kind: "playstore", name: STORE_NAME.playstore, href: comingSoon ? undefined : playstore },
  ];
}
