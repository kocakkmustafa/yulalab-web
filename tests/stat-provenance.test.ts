import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { linkedClaimFor, unsourcedQuantitativeStats } from "@/lib/stat-provenance";

/**
 * A stat card is the biggest number on a product page. Roadmap §1.4: every
 * quantitative claim shows source, scope, date and expiry.
 *
 * The failure this file guards is sharper than "some numbers lack sources".
 * It is the SAME number appearing twice — once in a claim card carrying full
 * provenance and a freshness marker, and once directly above it as a giant
 * unmarked figure. When the claim lapses, the marked copy is flagged and the
 * unmarked copy keeps asserting it as current, which makes the whole
 * freshness mechanism decorative on the surface people actually read.
 */
describe("stats that restate a registry claim must be linked to it", () => {
  it("every claimId on a stat resolves to a real claim", () => {
    for (const project of projects) {
      for (const stat of project.stats ?? []) {
        if (!stat.claimId) continue;
        const record = publicRegistry.find((r) => r.slug === project.slug);
        expect(record, `${project.slug} has a stat claimId but no registry record`).toBeTruthy();
        expect(
          record!.claims.some((c) => c.id === stat.claimId),
          `${project.slug}: stat claimId "${stat.claimId}" matches no claim`,
        ).toBe(true);
      }
    }
  });

  it("resolves a linked stat back to its claim", () => {
    const bf = projects.find((p) => p.slug === "burunfarki")!;
    const stat = bf.stats.find((s) => s.value === "~%61")!;
    const claim = linkedClaimFor("burunfarki", stat);
    expect(claim?.id).toBe("burunfarki-topk-accuracy");
  });

  it("links exactly the stats that are supposed to be linked", () => {
    // An EXPLICIT ledger, not a heuristic.
    //
    // The first version matched a stat's digits against the claim text and
    // skipped values shorter than two characters. Measured: unlinking
    // Braavolabs' "9" was invisible to it — and the substring approach could
    // never have caught that one anyway, because the claim spells the number
    // out ("Nine primitives" / "Dokuz primitif"). Only the count ratchet
    // noticed, incidentally, and removing any other unsourced stat in the
    // same edit hid it completely: all five tests passed with a claimed
    // figure back on the page as an unmarked number.
    //
    // Linking is a claim-honesty decision, so changing this list should
    // require deliberately editing a test rather than being inferred.
    const EXPECTED: Array<[slug: string, claimId: string]> = [
      ["braavolabs", "braavolabs-primitive-count"],
      ["braavolabs", "braavolabs-provider-count"],
      ["burunfarki", "burunfarki-topk-accuracy"],
      ["burunfarki", "burunfarki-topk-accuracy"],
      ["lifeos", "lifeos-on-device-encryption"],
    ];

    const actual = projects
      .flatMap((p) => (p.stats ?? []).map((s) => [p.slug, s.claimId] as const))
      .filter((pair): pair is readonly [string, string] => Boolean(pair[1]))
      .map(([slug, id]) => `${slug}|${id}`)
      .sort();

    expect(actual).toEqual(EXPECTED.map(([slug, id]) => `${slug}|${id}`).sort());
  });

  it("still catches a NEW stat that restates a claimed figure without linking", () => {
    // The heuristic is kept as a second net for the case it does cover: a
    // future edit adding "~%72 Top-3" while the claim says ~%61.
    const orphans: string[] = [];
    for (const project of projects) {
      const record = publicRegistry.find((r) => r.slug === project.slug);
      if (!record) continue;
      for (const stat of project.stats ?? []) {
        if (stat.claimId) continue;
        if (!/[0-9]/.test(stat.value)) continue;
        const bare = stat.value.replace(/[~%\s]/g, "");
        if (bare.length < 2) continue;
        const restated = record.claims.some(
          (c) => c.statementTr.includes(bare) || c.statementEn.includes(bare),
        );
        if (restated) orphans.push(`${project.slug}: "${stat.value}" is asserted by a claim but unlinked`);
      }
    }
    expect(orphans).toEqual([]);
  });
});

describe("a linked stat must actually be the figure its claim asserts", () => {
  /**
   * The drift guard opened with `if (stat.claimId) continue;` — it inspected
   * only the UNLINKED set and skipped exactly the set that linking made
   * risky. Measured: change "~%30" to "~%42" while keeping the claimId and
   * the whole suite stayed green, while the page rendered ~%42 in 42px type
   * with "verified 2026-07-23" beneath it and the claim card below said
   * ~30%. Before linking, a drifted value was merely unsourced; linking gave
   * it an authoritative stamp, which is roadmap §1.4 inverted.
   */
  // Pairs whose figure is genuinely absent from the claim TEXT, with the
  // reason. Asserted below to contain nothing that would pass anyway, so it
  // cannot be used to wave through a real drift.
  const SPELLED_OUT: Array<[slug: string, claimId: string, why: string]> = [
    [
      "braavolabs",
      "braavolabs-primitive-count",
      'the claim spells the number out ("Nine primitives" / "Dokuz primitif"), so there is no digit to match',
    ],
  ];

  function digits(value: string): string {
    return value.replace(/[^0-9]/g, "");
  }

  it("finds every linked figure inside the claim it points at", () => {
    const mismatches: string[] = [];
    for (const project of projects) {
      const record = publicRegistry.find((r) => r.slug === project.slug);
      for (const stat of project.stats ?? []) {
        if (!stat.claimId) continue;
        const claim = record?.claims.find((c) => c.id === stat.claimId);
        if (!claim) continue; // covered by the resolution test above
        const excused = SPELLED_OUT.some(([s, c]) => s === project.slug && c === stat.claimId);
        if (excused) continue;
        const needle = digits(stat.value);
        const found =
          needle.length > 0 &&
          (claim.statementTr.includes(needle) || claim.statementEn.includes(needle));
        if (!found) {
          mismatches.push(
            `${project.slug}: stat "${stat.value}" claims provenance from ${stat.claimId}, which does not assert that figure`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("keeps the exception list honest — every entry must genuinely fail the check", () => {
    // Prevents the list becoming a place to silence real drift.
    for (const [slug, claimId, why] of SPELLED_OUT) {
      const project = projects.find((p) => p.slug === slug)!;
      const record = publicRegistry.find((r) => r.slug === slug)!;
      const stat = project.stats.find((s) => s.claimId === claimId)!;
      const claim = record.claims.find((c) => c.id === claimId)!;
      const needle = digits(stat.value);
      const wouldPass =
        needle.length > 0 &&
        (claim.statementTr.includes(needle) || claim.statementEn.includes(needle));
      expect(wouldPass, `${slug}/${claimId} no longer needs an exception: ${why}`).toBe(false);
    }
  });
});

describe("the remaining unsourced numbers are counted, not hidden", () => {
  it("reports them as a known set rather than letting the number drift upward", () => {
    // Not asserted to be zero: several of these are structural product facts
    // ("5 life domains", "0 ads") rather than measurements, and inventing
    // sources for them would be worse than saying so. What this pins is the
    // SIZE of the gap, so it cannot quietly grow.
    const unsourced = unsourcedQuantitativeStats(projects, publicRegistry);
    expect(unsourced.length).toBeLessThanOrEqual(11);
  });

  it("does not count a linked stat as unsourced", () => {
    const unsourced = unsourcedQuantitativeStats(projects, publicRegistry);
    expect(unsourced.some((u) => u.value === "~%61")).toBe(false);
  });
});
