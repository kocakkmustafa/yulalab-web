import type { ExperienceClaim } from "@/components/experience/types";
import { evidenceKindLabel } from "@/components/common/SourceStamp";
import { text } from "@/lib/localized";
import { isClaimPresentable, isGateExempt } from "@/lib/public-registry";
import { presentClaims } from "@/lib/proof";
import type { Locale, ProductPublicRecord } from "@/lib/types";

/**
 * Registry claims as the home experience receives them (SEC-WEB-01).
 *
 * A claim whose verification window has closed at `now` is sent REDACTED:
 * no figure, statement, scope or source — only its dates and evidence kind,
 * flagged `withheld`, so the overlay can show a dated "window closed" marker
 * and the layout does not change. Prose and provenance for a presentable
 * claim still travel as one indivisible record.
 *
 * WEB-P0-03d: the kind comes from `presentClaims`. A claim it WITHHOLDS
 * (declared planned/prototype/unknown, or not eligible for the present tense)
 * never reaches the journey at all, so every count the overlay and the
 * journey derive from `claims.length` counts only claims that may be spoken.
 * Gate-exempt (Burun Farkı) claims keep their previous behaviour.
 */
export function toExperienceClaims(
  record: ProductPublicRecord,
  locale: Locale,
  now: Date,
): ExperienceClaim[] {
  const kinds = new Map(presentClaims(record, now).map((p) => [p.claim.id, p.kind]));
  return record.claims.filter((claim) => isGateExempt(claim) || kinds.get(claim.id) !== "withheld").map((claim) => {
    const presentable = isClaimPresentable(claim, now);
    return {
      id: claim.id,
      figure: presentable ? (claim.figures?.join(" · ") ?? null) : null,
      statement: presentable ? text(locale, claim.statementTr, claim.statementEn) : "",
      evidenceKind: claim.evidenceKind,
      evidenceLabel: evidenceKindLabel(claim.evidenceKind, locale),
      source: presentable ? claim.source : "",
      scope: presentable ? text(locale, claim.scopeTr, claim.scopeEn) : "",
      verifiedAt: claim.verifiedAt,
      expiresAt: claim.expiresAt,
      // Present only when set, so ungated claims (Burun Farkı) are byte-identical to before.
      ...(presentable ? {} : { withheld: true }),
    };
  });
}
