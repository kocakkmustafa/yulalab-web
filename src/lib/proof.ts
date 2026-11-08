import type { ClaimState, ProductPublicRecord } from "./types";
import { VERIFIED_CLAIM_STATES, isExpired, isPresentTenseEligible } from "./public-registry";

/**
 * What a claim or surface should look like on screen once its verification
 * window is taken into account.
 *
 * Y-P0-003 deliberately kept expiry out of the build gate (a claim nobody
 * re-checked for 24 hours is not a code regression, and failing CI on days
 * nobody deploys would train people to ignore it). That left the runtime
 * half unwritten — `isExpired`/`getSurfaceFreshness` existed and nothing
 * called them, tracked as an `it.todo`. This module is that half.
 *
 * The rule it encodes: a lapsed claim is NOT false, it is UNVERIFIED. So it
 * may not appear in the verified block — that block's entire meaning is "we
 * checked this", and roadmap §17 wants zero expired claims presented as
 * current. But it is not deleted either: silently dropping it shrinks the
 * page with nobody noticing that verification lapsed, and an invisible
 * failure is worse than a visible gap.
 */

export type PresentedClaim =
  | {
      kind: "verified";
      claim: ProductPublicRecord["claims"][number];
    }
  | {
      /**
       * Declared prototype/planned/unknown (or an explicit "not present
       * tense"). Belongs on a status/roadmap label, never in the claims
       * section — ClaimsSection renders only "verified" and "lapsed", so this
       * kind is withheld there by construction (CORE-P0-02 §5).
       */
      kind: "withheld";
      claim: ProductPublicRecord["claims"][number];
    }
  | {
      kind: "lapsed";
      claim: ProductPublicRecord["claims"][number];
      /** The date the verification window closed, so the gap is dateable. */
      expiredOn: string;
    };

export function presentClaims(record: ProductPublicRecord, now: Date): PresentedClaim[] {
  return record.claims.map((claim) => {
    // A planned/prototype/unknown claim is withheld whatever its window says:
    // "needs re-verification" would be the wrong thing to tell a reader about
    // something that was never claimed as true today.
    if (claim.claimState && !VERIFIED_CLAIM_STATES.includes(claim.claimState)) {
      return { kind: "withheld", claim };
    }
    if (claim.expiresAt && isExpired(claim.expiresAt, now)) {
      return { kind: "lapsed", claim, expiredOn: claim.expiresAt };
    }
    // Legacy claims that declared nothing keep the old behaviour (verified while
    // the window is open) — the build gate forces declaration, so this branch
    // cannot be reached by new data. Anything that DID declare a state must be
    // eligible, or it is withheld.
    const declared = claim.claimState !== undefined || claim.publishableAsPresentTense !== undefined;
    if (declared && !isPresentTenseEligible(claim, now)) {
      return { kind: "withheld", claim };
    }
    return { kind: "verified", claim };
  });
}

/**
 * The claim's state as a reader should see it. `stale` is derived here and
 * never stored: an expired window wins over whatever state was written.
 */
export function deriveClaimState(
  claim: ProductPublicRecord["claims"][number],
  now: Date,
): ClaimState | "stale" {
  if (claim.expiresAt && isExpired(claim.expiresAt, now)) return "stale";
  return claim.claimState ?? "unknown";
}

/** ProductPage uses this to qualify publication status while keeping links usable. */
export type PresentedSurface = {
  surface: ProductPublicRecord["surfaces"][number];
  /**
   * False once the verification window closes. The URL is still rendered —
   * a store link does not stop working because nobody re-checked it this
   * week. What expires is our assertion that the status is current.
   */
  statusConfirmed: boolean;
};

export function presentSurfaces(record: ProductPublicRecord, now: Date): PresentedSurface[] {
  return record.surfaces.map((surface) => ({
    surface,
    statusConfirmed: surface.expiresAt ? !isExpired(surface.expiresAt, now) : true,
  }));
}

/**
 * Lapsed CLAIMS only.
 *
 * Kept separate from surfaces on purpose. Store/status verification carries
 * a 24-hour window (roadmap §6), so a surface goes stale almost every day
 * unless someone re-checks it — while a quantitative claim has 30 days. A
 * counter that summed both and headed a section called "Verified claims"
 * announced "1 claim needs re-verification" on a product whose single claim
 * was fine and whose store status was a day old. Measured on real data:
 * LifeOS, 2026-08-19. An over-warning is its own dishonesty — it trains the
 * reader to ignore the marker that matters.
 */
export function countLapsedClaims(record: ProductPublicRecord, now: Date): number {
  return presentClaims(record, now).filter((c) => c.kind === "lapsed").length;
}

/** Lapsed surfaces only — belongs with availability/status, not with claims. */
export function countLapsedSurfaces(record: ProductPublicRecord, now: Date): number {
  return presentSurfaces(record, now).filter((s) => !s.statusConfirmed).length;
}

/** Everything that has outrun its verification. For health checks, not for a section header. */
export function countLapsed(record: ProductPublicRecord, now: Date): number {
  return countLapsedClaims(record, now) + countLapsedSurfaces(record, now);
}
