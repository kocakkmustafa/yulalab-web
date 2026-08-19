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

  it("finds no stat whose figure a claim already asserts but which is left unlinked", () => {
    // The drift guard. A future edit that adds "~%72 Top-3" as a stat while
    // the claim still says ~%61 — or that restates ~%61 without linking —
    // fails here rather than on the live page.
    const orphans: string[] = [];
    for (const project of projects) {
      const record = publicRegistry.find((r) => r.slug === project.slug);
      if (!record) continue;
      for (const stat of project.stats ?? []) {
        if (stat.claimId) continue;
        if (!/[0-9]/.test(stat.value)) continue;
        const bare = stat.value.replace(/[~%\s]/g, "");
        if (bare.length < 2) continue; // "9" alone matches far too much
        const restated = record.claims.some(
          (c) => c.statementTr.includes(bare) || c.statementEn.includes(bare),
        );
        if (restated) orphans.push(`${project.slug}: "${stat.value}" is asserted by a claim but the stat is unlinked`);
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
