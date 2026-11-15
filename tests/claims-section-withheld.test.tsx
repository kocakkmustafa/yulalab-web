// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ClaimsSection } from "@/components/projects/ClaimsSection";
import { publicRegistry } from "@/data/public-registry";
import { presentClaims, type PresentedClaim } from "@/lib/proof";
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

  it("real Burun Farkı record (no gate exemption): lapsed claims render redacted, dated cards only", () => {
    const bf = publicRegistry.find((r) => r.slug === "burunfarki")!;
    const presented = presentClaims(bf, new Date("2026-11-15T12:00:00+03:00"));
    const { container } = render(
      <ClaimsSection
        presented={presented}
        locale="en"
        labels={{ heading: "Verified claims", lapsedHeading: "Needs renewal", lapsedNote: "note" }}
      />,
    );
    const text = container.textContent ?? "";
    for (const c of bf.claims) {
      expect(text).not.toContain(c.statementEn);
      expect(text).not.toContain(c.source);
    }
    for (const li of container.querySelectorAll("li")) expect(li.textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(container.querySelector("a")).toBeNull();
  });
});
