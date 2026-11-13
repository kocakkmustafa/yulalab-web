import type { Locale } from "@/lib/types";
import { text } from "@/lib/localized";
import type { PresentedClaim } from "@/lib/proof";
import { SourceStamp } from "./SourceStamp";

/**
 * One public claim, with its provenance attached.
 *
 * A lapsed claim renders here too, deliberately, but ONLY as a dated marker
 * (SEC-WEB-01): its statement, scope and source link are not shown, because
 * a lapsed claim may not be narrated in the present tense. Dropping the card
 * would make the block quietly shorter and nobody would learn that
 * verification lapsed. See src/lib/proof.ts and isClaimPresentable.
 */
export function ProofCard({
  presented,
  locale,
}: {
  presented: PresentedClaim;
  locale: Locale;
}) {
  const { claim } = presented;
  const lapsed = presented.kind === "lapsed";
  const statement = lapsed ? "" : text(locale, claim.statementTr, claim.statementEn);

  return (
    <li
      className="glass p-6 h-full"
      style={lapsed ? { borderColor: "rgba(251,191,36,0.28)" } : undefined}
    >
      {lapsed ? null : (
        <p className="text-[15px] leading-[1.7] text-ink-100">{statement}</p>
      )}
      <SourceStamp
        evidenceKind={claim.evidenceKind}
        verifiedAt={claim.verifiedAt}
        source={lapsed ? "" : claim.source}
        scope={lapsed ? undefined : text(locale, claim.scopeTr, claim.scopeEn)}
        locale={locale}
        expiredOn={lapsed ? presented.expiredOn : undefined}
      />
    </li>
  );
}
