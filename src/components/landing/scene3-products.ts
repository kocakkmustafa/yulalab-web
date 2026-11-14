import type { ProductPublicRecord } from "@/lib/types";
import { presentClaims } from "@/lib/proof";
import { isComingSoon } from "@/lib/store-slots";
import type { ProjectConfig } from "@/lib/types";

/** The three flagship cells of scene 3 (WEB-P0-03d), in the order the scene shows them. */
export const FLAGSHIP_SLUGS = ["braavolabs", "lifeos", "ostinato"] as const;
export type FlagshipSlug = (typeof FLAGSHIP_SLUGS)[number];

/**
 * What the demo slot of a cell honestly is. `real` = a test of the real
 * product runs in the slot; `example` = a written example / simulation (the
 * Braavolabs plan example on its product page); `soon` = nothing to try yet.
 * No cell is `real` today: a flagship is `real` only when someone adds a real
 * product test here on purpose.
 */
export type DemoSlot = "real" | "example" | "soon";

const REAL_PRODUCT_TEST: ReadonlySet<FlagshipSlug> = new Set();
const EXAMPLE_DEMO: ReadonlySet<FlagshipSlug> = new Set(["braavolabs"]);

export function demoSlotOf(slug: FlagshipSlug, project: ProjectConfig): DemoSlot {
  // A coming-soon product has nothing to try, whatever else is written.
  if (isComingSoon(project)) return "soon";
  if (REAL_PRODUCT_TEST.has(slug)) return "real";
  return EXAMPLE_DEMO.has(slug) ? "example" : "soon";
}

/**
 * `verified` only while at least one claim passes `presentClaims` (open
 * window and eligible for the present tense); `lapsed` when claims exist but
 * every window closed (the date of the latest closing is returned); `none`
 * when the record carries no speakable claim (nothing, or only withheld).
 */
export type ProofBadge =
  | { state: "verified"; count: number }
  | { state: "lapsed"; expiredOn: string }
  | { state: "none" };

export function proofBadgeOf(record: ProductPublicRecord | undefined, now: Date): ProofBadge {
  if (!record) return { state: "none" };
  const presented = presentClaims(record, now);
  const verified = presented.filter((p) => p.kind === "verified");
  if (verified.length > 0) return { state: "verified", count: verified.length };
  const lapsed = presented.flatMap((p) => (p.kind === "lapsed" ? [p.expiredOn] : []));
  if (lapsed.length > 0) return { state: "lapsed", expiredOn: lapsed.sort().at(-1) as string };
  return { state: "none" };
}
