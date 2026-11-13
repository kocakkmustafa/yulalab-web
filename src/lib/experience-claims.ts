import type { ExperienceClaim } from "@/components/experience/types";
import { evidenceKindLabel } from "@/components/common/SourceStamp";
import { text } from "@/lib/localized";
import { isClaimPresentable } from "@/lib/public-registry";
import type { Locale, ProductPublicRecord } from "@/lib/types";

/**
 * Registry claims as the home experience receives them (SEC-WEB-01).
 *
 * A claim whose verification window has closed at `now` is sent REDACTED:
 * no figure, statement, scope or source — only its dates and evidence kind,
 * flagged `withheld`, so the overlay can show a dated "window closed" marker
 * and the layout does not change. Prose and provenance for a presentable
 * claim still travel as one indivisible record.
 */
export function toExperienceClaims(
  record: ProductPublicRecord,
  locale: Locale,
  now: Date,
): ExperienceClaim[] {
  return record.claims.map((claim) => {
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
