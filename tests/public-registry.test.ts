import { describe, expect, it } from "vitest";
import {
  validateRecord,
  validateRegistry,
  getDefaultVisibleProducts,
  isExpired,
  getSurfaceFreshness,
  getClaimFreshness,
} from "@/lib/public-registry";
import { publicRegistry } from "@/data/public-registry";
import type { ProductPublicRecord } from "@/lib/types";

// A minimal, otherwise-valid record every "make one field invalid" test
// starts from — keeps each test isolated to the one rule it's checking.
function baseRecord(overrides: Partial<ProductPublicRecord> = {}): ProductPublicRecord {
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
        verifiedAt: "2026-08-19",
        expiresAt: "2026-08-20",
      },
    ],
    primaryCta: { labelTr: "Gör", labelEn: "View", url: "https://example.com" },
    screenshots: [],
    claims: [],
    privacyUrl: "/privacy/fixture",
    supportUrl: "/support",
    updatedAt: "2026-08-19",
    ...overrides,
  };
}

describe("validateRecord — structural fail-closed rules (roadmap §6)", () => {
  it("accepts a well-formed record", () => {
    expect(validateRecord(baseRecord())).toEqual([]);
  });

  it("rejects a live/beta surface missing source", () => {
    const r = baseRecord({
      surfaces: [{ ...baseRecord().surfaces[0], source: "" }],
    });
    expect(validateRecord(r).some((e) => /source/i.test(e))).toBe(true);
  });

  it("rejects a live/beta surface missing verifiedAt", () => {
    const r = baseRecord({
      surfaces: [{ ...baseRecord().surfaces[0], verifiedAt: "" }],
    });
    expect(validateRecord(r).some((e) => /verifiedAt/i.test(e))).toBe(true);
  });

  it("rejects a live/beta surface missing expiresAt", () => {
    const r = baseRecord({
      surfaces: [{ ...baseRecord().surfaces[0], expiresAt: "" }],
    });
    expect(validateRecord(r).some((e) => /expiresAt/i.test(e))).toBe(true);
  });

  it("allows a research-lifecycle surface with status coming-soon and no source (nothing to source yet)", () => {
    const r = baseRecord({
      lifecycle: "research",
      surfaces: [
        {
          kind: "ios",
          url: "",
          status: "coming-soon",
          source: "",
          verifiedAt: "",
          expiresAt: "",
        },
      ],
      primaryCta: { labelTr: "Ürünü gör", labelEn: "View product", url: "/projects/fixture" },
    });
    expect(validateRecord(r)).toEqual([]);
  });

  it("rejects a screenshot without sourceBuild on a live product", () => {
    const r = baseRecord({
      screenshots: [
        {
          path: "/x.png",
          sourceBuild: "",
          capturedAt: "2026-08-19",
          altTr: "a",
          altEn: "b",
        },
      ],
    });
    expect(validateRecord(r).some((e) => /sourceBuild/i.test(e))).toBe(true);
  });

  it("rejects a screenshot without capturedAt on a live product", () => {
    const r = baseRecord({
      screenshots: [
        {
          path: "/x.png",
          sourceBuild: "abc123",
          capturedAt: "",
          altTr: "a",
          altEn: "b",
        },
      ],
    });
    expect(validateRecord(r).some((e) => /capturedAt/i.test(e))).toBe(true);
  });

  it("rejects a claim with a TR statement but no EN statement", () => {
    const r = baseRecord({
      claims: [
        {
          id: "c1",
          statementTr: "Bir iddia",
          statementEn: "",
          evidenceKind: "measured",
          source: "x",
          scope: "x",
          owner: "x",
          verifiedAt: "2026-08-19",
          expiresAt: "2026-09-18",
        },
      ],
    });
    expect(validateRecord(r).some((e) => /statementEn/i.test(e))).toBe(true);
  });

  it("rejects an asserted claim missing source/scope/owner/verifiedAt/expiresAt", () => {
    const r = baseRecord({
      claims: [
        {
          id: "c1",
          statementTr: "Bir iddia",
          statementEn: "A claim",
          evidenceKind: "measured",
          source: "",
          scope: "",
          owner: "",
          verifiedAt: "",
          expiresAt: "",
        },
      ],
    });
    const errors = validateRecord(r);
    for (const field of ["source", "scope", "owner", "verifiedAt", "expiresAt"]) {
      expect(errors.some((e) => e.includes(field)), `expected an error mentioning "${field}"`).toBe(true);
    }
  });

  it("rejects a claim with an EN statement but no TR statement", () => {
    const r = baseRecord({
      claims: [
        {
          id: "c1",
          statementTr: "",
          statementEn: "A claim",
          evidenceKind: "measured",
          source: "x",
          scope: "x",
          owner: "x",
          verifiedAt: "2026-08-19",
          expiresAt: "2026-09-18",
        },
      ],
    });
    expect(validateRecord(r).some((e) => /statementTr/i.test(e))).toBe(true);
  });

  it("rejects a research product whose primary CTA points at a store URL", () => {
    const r = baseRecord({
      lifecycle: "research",
      primaryCta: {
        labelTr: "İndir",
        labelEn: "Download",
        url: "https://apps.apple.com/app/id123",
      },
    });
    expect(validateRecord(r).some((e) => /research/i.test(e) && /cta/i.test(e))).toBe(
      true,
    );
  });

  it("accepts a research product whose primary CTA points at the product page", () => {
    const r = baseRecord({
      lifecycle: "research",
      surfaces: [],
      primaryCta: { labelTr: "Ürünü gör", labelEn: "View product", url: "/projects/fixture" },
    });
    expect(validateRecord(r)).toEqual([]);
  });

  it("rejects an unknown lifecycle value (runtime data, not just the TS type)", () => {
    const r = baseRecord({ lifecycle: "unknown" as ProductPublicRecord["lifecycle"] });
    expect(validateRecord(r).some((e) => /lifecycle/i.test(e))).toBe(true);
  });
});

describe("validateRegistry — whole-registry checks", () => {
  it("rejects duplicate slugs", () => {
    const dup = [baseRecord({ slug: "dup" }), baseRecord({ slug: "dup" })];
    expect(validateRegistry(dup).some((e) => /duplicate/i.test(e))).toBe(true);
  });

  it("the real registry (src/data/public-registry.ts) is itself valid", () => {
    expect(validateRegistry(publicRegistry)).toEqual([]);
  });

  it("the real registry has exactly 8 records, matching the live product count", () => {
    expect(publicRegistry).toHaveLength(8);
  });
});

describe("freshness (runtime-only, per TASARIM-RISKI-STORE-EXPIRY-BUILD.md — never build-blocking)", () => {
  it("isExpired is true once now passes expiresAt", () => {
    expect(isExpired("2026-08-01", new Date("2026-08-02"))).toBe(true);
    expect(isExpired("2026-08-01", new Date("2026-07-31"))).toBe(false);
  });

  it("getSurfaceFreshness flags a surface whose expiresAt has passed", () => {
    const r = baseRecord({
      surfaces: [{ ...baseRecord().surfaces[0], expiresAt: "2026-08-01" }],
    });
    const [result] = getSurfaceFreshness(r, new Date("2026-08-19"));
    expect(result.stale).toBe(true);
  });

  it("getClaimFreshness flags a claim whose expiresAt has passed", () => {
    const r = baseRecord({
      claims: [
        {
          id: "c1",
          statementTr: "x",
          statementEn: "y",
          evidenceKind: "measured",
          source: "s",
          scope: "s",
          owner: "s",
          verifiedAt: "2026-07-01",
          expiresAt: "2026-07-31",
        },
      ],
    });
    const [result] = getClaimFreshness(r, new Date("2026-08-19"));
    expect(result.stale).toBe(true);
  });

  // KNOWN GAP (flagged by independent Y-P0-003 review, not yet closed):
  // the functions above are correct and tested, but nothing in src/app or
  // src/components calls them yet — no page currently suppresses or flags
  // a stale claim/surface at render time, even though
  // src/data/public-registry.ts's LifeOS iOS surface is already past its
  // 24h expiresAt by design (see that file's comment). Wiring this into
  // the actual product-page/ProofCard rendering is real UI work, tracked
  // for Y-P1-001 alongside the ProjectConfig/registry sync gap below —
  // this test exists so the gap stays visible in test output instead of
  // living only in a comment nobody re-reads.
  it("has a runtime layer that actually consumes the freshness functions", async () => {
    // Closes the Y-P1-001 todo left here by Y-P0-003. isExpired/
    // getSurfaceFreshness existed and NOTHING called them, which is the
    // shape of a feature that looks finished and does nothing.
    //
    // Behaviour is asserted where it belongs — tests/proof-presentation.test.ts
    // for the rule, tests/proof-card.test.tsx for the rendered words. This
    // one guards the wiring itself: the page must go through the
    // presentation layer, not read record.claims directly.
    const { presentClaims, countLapsed } = await import("@/lib/proof");
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const page = readFileSync(
      path.resolve(import.meta.dirname, "../src/components/projects/ProductPage.tsx"),
      "utf8",
    );
    expect(page, "ProductPage must render claims through the freshness layer").toContain(
      "presentClaims",
    );
    // Specifically the CLAIM counter. Folding stale surfaces into a heading
    // that says "Verified claims" produced a permanent false warning on real
    // data (LifeOS, 2026-08-19: one fine claim, one day-old store status).
    // A source-level check because ProductPage is a server component with
    // next-intl hooks — it guards the wiring, and behaviour is covered in
    // tests/proof-presentation.test.ts.
    expect(page).toContain("countLapsedClaims");
    expect(
      /countLapsed\((?!Claims)/.test(page.replace(/countLapsedClaims/g, "")),
      "the claims heading must not use the combined claim+surface counter",
    ).toBe(false);

    // And the layer must actually distinguish the two states on real data.
    const stale = publicRegistry.map((r) => ({
      slug: r.slug,
      lapsed: countLapsed(r, new Date("2099-01-01")),
      claims: presentClaims(r, new Date("2099-01-01")),
    }));
    for (const s of stale) {
      // Far in the future everything with an expiry must read as lapsed —
      // if this stays 0, the mechanism is inert.
      if (s.claims.length > 0) {
        expect(s.lapsed, `${s.slug} should report lapsed claims in 2099`).toBeGreaterThan(0);
      }
    }
  });
});

describe("getDefaultVisibleProducts — archived products excluded by default (roadmap §6)", () => {
  it("excludes archived records", () => {
    const records = [
      baseRecord({ slug: "a", lifecycle: "live" }),
      baseRecord({ slug: "b", lifecycle: "archived" }),
    ];
    const visible = getDefaultVisibleProducts(records);
    expect(visible.map((r) => r.slug)).toEqual(["a"]);
  });

  it("includes live, beta and research", () => {
    const records = [
      baseRecord({ slug: "a", lifecycle: "live" }),
      baseRecord({ slug: "b", lifecycle: "beta" }),
      baseRecord({ slug: "c", lifecycle: "research", surfaces: [] }),
    ];
    expect(getDefaultVisibleProducts(records)).toHaveLength(3);
  });
});
