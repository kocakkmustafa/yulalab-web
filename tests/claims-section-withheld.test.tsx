// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ClaimsSection } from "@/components/projects/ClaimsSection";
import type { PresentedClaim } from "@/lib/proof";
import type { ProductClaim } from "@/lib/types";

// WEB-P0-04 review finding: a section holding only withheld claims rendered an
// empty heading, because the emptiness check counted all presented claims.

const claim: ProductClaim = {
  id: "planned-android",
  claimState: "planned",
  publishableAsPresentTense: false,
  statementTr: "Android sürümü planlanıyor.",
  statementEn: "An Android version is planned.",
  evidenceKind: "self-reported",
  source: "note",
  scopeTr: "kapsam",
  scopeEn: "scope",
  owner: "owner",
  verifiedAt: "2026-11-08",
  expiresAt: "2026-12-08",
};

describe("ClaimsSection with withheld claims", () => {
  it("renders nothing when every claim is withheld (no empty heading)", () => {
    const presented: PresentedClaim[] = [{ kind: "withheld", claim }];
    const { container } = render(
      <ClaimsSection
        presented={presented}
        locale="tr"
        labels={{ heading: "Doğrulanmış iddialar", lapsedHeading: "Yenilenmeli", lapsedNote: "not" }}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
