import { describe, it, expect } from "vitest";
import {
  validateCaseStudy,
  validateCaseStudies,
  publishableCaseStudies,
  type CaseStudy,
} from "@/lib/case-studies";
import { caseStudies } from "@/data/case-studies";
import { publicRegistry } from "@/data/public-registry";

/**
 * The case-study gate (roadmap Y-P1-003).
 *
 * A case study is the strongest claim this site can make — it asserts an
 * outcome about a real product, and often about a real person or customer.
 * So the bar is structural, not editorial: a case that cannot prove its
 * source, its permission, its baseline, its artifact, its measurement and
 * its failure lesson does not render. The build fails rather than shipping
 * an unbacked story.
 */

/** A fully-formed case, used to prove the gate is not a blanket "no". */
function goodCase(): CaseStudy {
  return {
    slug: "fixture-case",
    productSlug: "burunfarki",
    titleTr: "Fixture vakası",
    titleEn: "Fixture case",
    permission: {
      kind: "self-owned",
      grantedBy: "YULA Lab",
      grantedAt: "2026-08-01",
      scopeTr: "Ürün YULA'ya ait; kişi/müşteri kimliği paylaşılmıyor.",
      scopeEn: "Product is YULA-owned; no person or customer identity is shared.",
    },
    baselineTr: "Başlangıç durumu.",
    baselineEn: "Starting state.",
    constraintTr: "Kısıt.",
    constraintEn: "Constraint.",
    decisions: [
      { dateTr: "2026-07-01", summaryTr: "Karar.", summaryEn: "Decision." },
    ],
    artifacts: [
      {
        kind: "code",
        labelTr: "Doğrulayıcı",
        labelEn: "Validator",
        source: "src/lib/public-registry.ts",
      },
    ],
    outcome: {
      figures: ["~%61"],
      statementTr: "Top-3 doğruluğu ~%61.",
      statementEn: "Top-3 accuracy ~61%.",
      claimId: "burunfarki-topk-accuracy",
    },
    failureTr: "Ne başarısız oldu.",
    failureEn: "What failed.",
    changedAfterTr: "Sonrasında ne değişti.",
    changedAfterEn: "What changed after.",
    verifiedAt: "2026-08-01",
    expiresAt: "2026-11-01",
  };
}

describe("case-study gate", () => {
  it("accepts a fully-formed case (the gate is not a blanket refusal)", () => {
    expect(validateCaseStudy(goodCase(), publicRegistry)).toEqual([]);
  });

  const required: [string, (c: CaseStudy) => void][] = [
    ["permission", (c) => { (c as { permission?: unknown }).permission = undefined; }],
    ["baseline", (c) => { c.baselineTr = ""; c.baselineEn = ""; }],
    ["artifact", (c) => { c.artifacts = []; }],
    ["outcome", (c) => { (c as { outcome?: unknown }).outcome = undefined; }],
    ["failure/lesson", (c) => { c.failureTr = ""; c.failureEn = ""; }],
    ["validity date", (c) => { c.expiresAt = ""; }],
    ["decision log", (c) => { c.decisions = []; }],
  ];

  for (const [field, break_] of required) {
    it(`REFUSES a case missing its ${field}`, () => {
      const c = goodCase();
      break_(c);
      expect(validateCaseStudy(c, publicRegistry).length).toBeGreaterThan(0);
    });
  }

  it("refuses an artifact with no source path", () => {
    const c = goodCase();
    c.artifacts = [{ kind: "code", labelTr: "x", labelEn: "x", source: "" }];
    expect(validateCaseStudy(c, publicRegistry).length).toBeGreaterThan(0);
  });

  it("refuses a case about a product that is not in the public registry", () => {
    const c = goodCase();
    c.productSlug = "not-a-product";
    expect(validateCaseStudy(c, publicRegistry).length).toBeGreaterThan(0);
  });

  /**
   * The drift rule Y-P1-001 established for stat cards, applied to the
   * strongest surface: a case study may not assert a figure the registry
   * does not already carry under the claim it points at.
   */
  it("refuses an outcome figure the linked registry claim does not carry", () => {
    const c = goodCase();
    c.outcome.figures = ["~%95"];
    const errors = validateCaseStudy(c, publicRegistry);
    expect(errors.join(" ")).toMatch(/figure|rakam/i);
  });

  it("refuses an outcome whose claimId does not exist in the registry", () => {
    const c = goodCase();
    c.outcome.claimId = "nope-not-real";
    expect(validateCaseStudy(c, publicRegistry).length).toBeGreaterThan(0);
  });

  /**
   * Third-party permission is a stricter shape than self-owned: naming a
   * customer requires a dated, referenced written grant, because "they said
   * it was fine" is exactly the claim that cannot be checked later.
   */
  it("refuses a third-party case with no written-grant reference", () => {
    const c = goodCase();
    c.permission = {
      kind: "written-third-party",
      grantedBy: "Bir Müşteri",
      grantedAt: "2026-08-01",
      scopeTr: "kapsam",
      scopeEn: "scope",
    };
    expect(validateCaseStudy(c, publicRegistry).length).toBeGreaterThan(0);
  });

  it("accepts a third-party case that carries the grant reference", () => {
    const c = goodCase();
    c.permission = {
      kind: "written-third-party",
      grantedBy: "Bir Müşteri",
      grantedAt: "2026-08-01",
      grantReference: "private/legal/permissions/ornek-2026-08-01.pdf",
      scopeTr: "kapsam",
      scopeEn: "scope",
    };
    expect(validateCaseStudy(c, publicRegistry)).toEqual([]);
  });
});

describe("published case studies", () => {
  it("every published case passes the gate", () => {
    expect(validateCaseStudies(caseStudies, publicRegistry)).toEqual([]);
  });

  /**
   * Today the honest answer is zero: the roadmap's own preconditions for
   * the first two cases (LifeOS revenue verification; a Braavolabs PAID
   * pilot result) are not met. This test is here so that stops being a
   * silent state — if someone adds a case, they must also update this
   * expectation deliberately, having read the gate above.
   */
  it("publishes only cases whose product gates are actually met", () => {
    expect(publishableCaseStudies(caseStudies, publicRegistry)).toHaveLength(0);
  });
});
