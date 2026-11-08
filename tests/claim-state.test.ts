import { describe, expect, it } from "vitest";
import {
  isPresentTenseEligible,
  listUndeclaredLapsedClaims,
  validateClaimStateDeclared,
  validateRecord,
  validateRegistry,
} from "@/lib/public-registry";
import { deriveClaimState, presentClaims } from "@/lib/proof";
import { publicRegistry } from "@/data/public-registry";
import type { ProductClaim, ProductPublicRecord } from "@/lib/types";

// WEB-P0-04 — claim state, evidence method and the "planned never leaks into
// present tense" rules (ana talimat §8.5, CORE-P0-02 §2).

const NOW = new Date("2026-11-08T12:00:00Z");

function claim(overrides: Partial<ProductClaim> = {}): ProductClaim {
  return {
    id: "c1",
    statementTr: "Dokuz primitif vardır.",
    statementEn: "There are nine primitives.",
    evidenceKind: "source-code-verified",
    source: "ventures/x/src/a.ts",
    scopeTr: "kapsam",
    scopeEn: "scope",
    owner: "owner",
    verifiedAt: "2026-11-08",
    expiresAt: "2026-12-08",
    ...overrides,
  };
}

const sourceVerified: Partial<ProductClaim> = {
  claimState: "source_verified",
  verificationMethod: "source_review",
  buildOrCommit: "repo@abc1234",
  publishableAsPresentTense: true,
};

function record(claims: ProductClaim[], overrides: Partial<ProductPublicRecord> = {}): ProductPublicRecord {
  return {
    slug: "fixture",
    name: "Fixture",
    lifecycle: "live",
    surfaces: [
      {
        kind: "web",
        url: "https://example.com",
        status: "live",
        source: "https://example.com/status",
        verifiedAt: "2026-11-08",
        expiresAt: "2026-11-09",
      },
    ],
    primaryCta: { labelTr: "Gör", labelEn: "View", url: "https://example.com" },
    screenshots: [],
    claims,
    privacyUrl: "/privacy/fixture",
    supportUrl: "/support",
    updatedAt: "2026-11-08",
    ...overrides,
  };
}

const errorsFor = (c: ProductClaim, r?: Partial<ProductPublicRecord>) =>
  validateRecord(record([c], r));

describe("validateRecord — claim state consistency (WEB-P0-04)", () => {
  it("accepts a legacy claim with no state fields (back-compat for the JSON consumer)", () => {
    expect(errorsFor(claim())).toEqual([]);
  });

  it("accepts a fully declared source_verified claim", () => {
    expect(errorsFor(claim(sourceVerified))).toEqual([]);
  });

  describe("rule 1 — planned / prototype / unknown are never present tense", () => {
    for (const state of ["planned", "prototype", "unknown"] as const) {
      it(`rejects ${state} + publishableAsPresentTense: true`, () => {
        const errors = errorsFor(
          claim({
            claimState: state,
            publishableAsPresentTense: true,
            statementTr: "Planlanan özellik.",
            statementEn: "A planned feature.",
          }),
        );
        expect(errors.some((e) => new RegExp(`is ${state} but publishableAsPresentTense is true`).test(e))).toBe(true);
      });
    }

    it("accepts planned + publishableAsPresentTense: false with an honest statement", () => {
      expect(
        errorsFor(
          claim({
            claimState: "planned",
            publishableAsPresentTense: false,
            statementTr: "Android sürümü planlanıyor.",
            statementEn: "An Android version is planned.",
          }),
        ),
      ).toEqual([]);
    });
  });

  describe("rule 2 — production/beta need store or live evidence, a build and a matching surface", () => {
    const prod: Partial<ProductClaim> = {
      claimState: "production_verified",
      verificationMethod: "live_e2e",
      buildOrCommit: "site@abc1234",
      publishableAsPresentTense: true,
      evidenceKind: "measured",
    };

    it("accepts a complete production_verified claim on a live surface", () => {
      expect(errorsFor(claim(prod))).toEqual([]);
    });

    it("rejects production_verified backed only by a source read", () => {
      const errors = errorsFor(claim({ ...prod, verificationMethod: "source_review" }));
      expect(errors.some((e) => /requires verificationMethod store_build or live_e2e/.test(e))).toBe(true);
    });

    it("rejects production_verified without buildOrCommit", () => {
      const errors = errorsFor(claim({ ...prod, buildOrCommit: undefined }));
      expect(errors.some((e) => /requires buildOrCommit/.test(e))).toBe(true);
    });

    it("rejects production_verified when no surface is live", () => {
      const errors = errorsFor(claim(prod), {
        surfaces: [
          { kind: "web", url: "", status: "coming-soon", source: "", verifiedAt: "", expiresAt: "" },
        ],
      });
      expect(errors.some((e) => /requires a live surface/.test(e))).toBe(true);
    });

    it("lets beta_verified stand on a beta surface but not on a coming-soon one", () => {
      const beta = { ...prod, claimState: "beta_verified" as const };
      const betaSurface = {
        kind: "web" as const,
        url: "https://example.com",
        status: "beta" as const,
        source: "https://example.com/status",
        verifiedAt: "2026-11-08",
        expiresAt: "2026-11-09",
      };
      expect(errorsFor(claim(beta), { surfaces: [betaSurface] })).toEqual([]);
      const none = errorsFor(claim(beta), {
        surfaces: [{ ...betaSurface, status: "coming-soon", source: "", verifiedAt: "", expiresAt: "" }],
      });
      expect(none.some((e) => /requires a live or beta surface/.test(e))).toBe(true);
    });
  });

  describe("rule 3 — source_verified needs a source read, a commit and source-code-verified evidence", () => {
    it("rejects a mismatched verificationMethod", () => {
      const errors = errorsFor(claim({ ...sourceVerified, verificationMethod: "live_e2e" }));
      expect(errors.some((e) => /requires verificationMethod source_review or ci/.test(e))).toBe(true);
    });

    it("accepts ci as a source-level method", () => {
      expect(errorsFor(claim({ ...sourceVerified, verificationMethod: "ci" }))).toEqual([]);
    });

    it("rejects a self-reported evidenceKind", () => {
      const errors = errorsFor(claim({ ...sourceVerified, evidenceKind: "self-reported" }));
      expect(errors.some((e) => /requires evidenceKind source-code-verified/.test(e))).toBe(true);
    });

    it("rejects a missing buildOrCommit", () => {
      const errors = errorsFor(claim({ ...sourceVerified, buildOrCommit: "" }));
      expect(errors.some((e) => /requires buildOrCommit/.test(e))).toBe(true);
    });
  });

  it("rule 4 — verificationMethod none only with self-reported evidence", () => {
    const bad = errorsFor(claim({ verificationMethod: "none", evidenceKind: "measured" }));
    expect(bad.some((e) => /verificationMethod none requires evidenceKind self-reported/.test(e))).toBe(true);
    expect(errorsFor(claim({ verificationMethod: "none", evidenceKind: "self-reported" }))).toEqual([]);
  });

  it("rejects present tense with no declared state at all (fail closed)", () => {
    const errors = errorsFor(claim({ publishableAsPresentTense: true }));
    expect(errors.some((e) => /publishableAsPresentTense without a verified claimState/.test(e))).toBe(true);
  });

  describe("rule 6 — the text of a planned claim cannot read as present tense", () => {
    it("rejects a planned claim whose Turkish and English text assert the feature today", () => {
      const errors = errorsFor(
        claim({
          claimState: "planned",
          publishableAsPresentTense: false,
          statementTr: "Android sürümü App Store'da çalışır.",
          statementEn: "The Android version works in the store.",
        }),
      );
      expect(errors.filter((e) => /reads as present tense/.test(e))).toHaveLength(2);
    });
  });

  it("is TR/EN-parity safe: one record carries one state for both languages", () => {
    // statementTr/En live on the same claim object, so a locale cannot hold a
    // different state or flag than its sibling — pinned so a future split into
    // per-locale rows has to revisit this rule on purpose.
    const c = claim(sourceVerified);
    expect(Object.keys(c).filter((k) => /^(claimState|publishableAsPresentTense)(Tr|En)$/.test(k))).toEqual([]);
  });
});

describe("isPresentTenseEligible — fail closed", () => {
  it("is true only for an explicit verified state, an explicit true and an open window", () => {
    expect(isPresentTenseEligible(claim(sourceVerified), NOW)).toBe(true);
  });

  it("is false for an undeclared claim", () => {
    expect(isPresentTenseEligible(claim(), NOW)).toBe(false);
  });

  it("is false when the flag is missing or false", () => {
    expect(isPresentTenseEligible(claim({ ...sourceVerified, publishableAsPresentTense: undefined }), NOW)).toBe(false);
    expect(isPresentTenseEligible(claim({ ...sourceVerified, publishableAsPresentTense: false }), NOW)).toBe(false);
  });

  it("is false for planned/prototype/unknown even if the flag were true", () => {
    for (const claimState of ["planned", "prototype", "unknown"] as const) {
      expect(isPresentTenseEligible(claim({ claimState, publishableAsPresentTense: true }), NOW)).toBe(false);
    }
  });

  it("is false once the window has closed", () => {
    expect(isPresentTenseEligible(claim({ ...sourceVerified, expiresAt: "2026-11-07" }), NOW)).toBe(false);
  });

  it("stays true THROUGH the expiry day (same rule as isExpired)", () => {
    expect(isPresentTenseEligible(claim({ ...sourceVerified, expiresAt: "2026-11-08" }), NOW)).toBe(true);
  });
});

describe("deriveClaimState — stale is derived, never stored", () => {
  it("returns the stored state while the window is open", () => {
    expect(deriveClaimState(claim(sourceVerified), NOW)).toBe("source_verified");
  });

  it("returns stale once expiresAt has passed, whatever was stored", () => {
    expect(deriveClaimState(claim({ ...sourceVerified, expiresAt: "2026-11-07" }), NOW)).toBe("stale");
  });

  it("returns unknown for an undeclared, open claim", () => {
    expect(deriveClaimState(claim(), NOW)).toBe("unknown");
  });

  it("is not a storable state: no registry claim carries claimState \"stale\"", () => {
    for (const r of publicRegistry) {
      for (const c of r.claims) expect(c.claimState as string | undefined).not.toBe("stale");
    }
  });
});

describe("presentClaims — withheld claims never reach the verified block", () => {
  it("withholds a declared planned claim even inside its window", () => {
    const planned = claim({
      claimState: "planned",
      publishableAsPresentTense: false,
      statementTr: "Android sürümü planlanıyor.",
      statementEn: "An Android version is planned.",
    });
    const [p] = presentClaims(record([planned]), NOW);
    expect(p.kind).toBe("withheld");
  });

  it("presents an eligible claim as verified and a lapsed one as lapsed (stale wins)", () => {
    const ok = claim({ id: "ok", ...sourceVerified });
    const old = claim({ id: "old", ...sourceVerified, expiresAt: "2026-11-01" });
    const kinds = presentClaims(record([ok, old]), NOW).map((p) => p.kind);
    expect(kinds).toEqual(["verified", "lapsed"]);
  });

  it("withholds a claim that declares a verified state but turns present tense off", () => {
    const quiet = claim({ ...sourceVerified, publishableAsPresentTense: false });
    expect(presentClaims(record([quiet]), NOW)[0].kind).toBe("withheld");
  });
});

describe("validateClaimStateDeclared — the build gate", () => {
  it("fails an open-window claim that declares nothing", () => {
    const errors = validateClaimStateDeclared([record([claim()])], NOW);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => /no claimState/.test(e))).toBe(true);
    expect(errors.some((e) => /no publishableAsPresentTense/.test(e))).toBe(true);
  });

  it("does not fail a lapsed legacy claim (it renders as unverified) but reports it", () => {
    const lapsed = claim({ expiresAt: "2026-09-18" });
    expect(validateClaimStateDeclared([record([lapsed])], NOW)).toEqual([]);
    expect(listUndeclaredLapsedClaims([record([lapsed])], NOW)).toEqual([
      { slug: "fixture", claimId: "c1", expiresAt: "2026-09-18" },
    ]);
  });

  it("passes a declared claim", () => {
    expect(validateClaimStateDeclared([record([claim(sourceVerified)])], NOW)).toEqual([]);
  });
});

describe("the real registry", () => {
  it("is structurally valid with the new rules", () => {
    expect(validateRegistry(publicRegistry)).toEqual([]);
  });

  it("every claim shown as verified is present-tense eligible, on every day of its window", () => {
    // planned → live leak guard on real data: walk each claim from verifiedAt
    // to expiresAt and require that "verified" implies "eligible".
    for (const r of publicRegistry) {
      for (const c of r.claims) {
        if (c.claimState === undefined && c.publishableAsPresentTense === undefined) continue; // lapsed legacy, gated separately
        for (const day of [c.verifiedAt, c.expiresAt]) {
          const at = new Date(`${day}T12:00:00Z`);
          const [p] = presentClaims({ ...r, claims: [c] }, at);
          if (p.kind === "verified") expect(isPresentTenseEligible(c, at)).toBe(true);
        }
      }
    }
  });

  it("the three re-verified Braavolabs claims and the LifeOS claim carry a commit", () => {
    const declared = publicRegistry.flatMap((r) => r.claims).filter((c) => c.claimState);
    expect(declared.map((c) => c.id).sort()).toEqual([
      "braavolabs-combination-space",
      "braavolabs-primitive-count",
      "braavolabs-provider-count",
      "lifeos-on-device-encryption",
    ]);
    for (const c of declared) expect(c.buildOrCommit).toMatch(/@[0-9a-f]{12}/);
  });
});
