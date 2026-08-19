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
