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
/**
 * Claim text with ISO dates removed and thousands separators normalised.
 *
 * Dates go because every claim carries one and a two-digit stat would match
 * it: "19" is a word-boundary match inside "2026-08-19". Separators go from
 * BOTH sides because the registry writes "13.587 yarış" / "13,587 races"
 * while the stat writes "13.587" — without this the next legitimate link
 * (races, runners) fails, and the cheapest way out would be adding an
 * exception, routing future work straight into the one mechanism that has
 * already hidden a drift.
 */
function searchable(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}/g, " ").replace(/[.,\u00a0]/g, "");
}

function figureOf(value: string): string {
  return value.replace(/[.,\u00a0]/g, "").replace(/[^0-9]/g, "");
}

function claimAsserts(claim: { statementTr: string; statementEn: string }, figure: string): boolean {
  if (figure.length < 2) return false; // single digits match almost any prose
  const boundary = new RegExp(`(?<![0-9])${figure}(?![0-9])`);
  return boundary.test(searchable(claim.statementTr)) || boundary.test(searchable(claim.statementEn));
}

/**
 * Links whose figure is written out in words in the claim, so no digit
 * exists to match.
 *
 * The value is PINNED and the word form is asserted to be PRESENT. The
 * earlier version keyed only on (slug, claimId), which excused that link for
 * any value — changing "9" to "12" kept the whole suite green while the page
 * asserted twelve primitives under a stamp from a claim saying nine. Its
 * companion "honesty" test asked whether the entry would pass the digit
 * check anyway, which is false by construction for every possible value: the
 * entry exists BECAUSE there is no digit. The one guard written to keep this
 * list honest could never fire.
 */
const SPELLED_OUT = [
  {
    slug: "braavolabs",
    claimId: "braavolabs-primitive-count",
    statValue: "9",
    wordTr: "Dokuz",
    wordEn: "Nine",
    why: "the claim spells the count out rather than writing a digit",
  },
] as const;

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
    expect(linkedClaimFor("burunfarki", stat)?.id).toBe("burunfarki-topk-accuracy");
  });

  it("links exactly the stats that are supposed to be linked", () => {
    // Keyed on the STAT VALUE too. A sorted list of (slug, claimId) pairs is
    // identity under permutation, so swapping Braavolabs' two claimIds
    // between "9" and "14" left it green — each stat then stamped by the
    // other's claim, invisible today only because both claims happen to carry
    // the same dates.
    const EXPECTED = [
      ["braavolabs", "9", "braavolabs-primitive-count"],
      ["braavolabs", "14", "braavolabs-provider-count"],
      ["burunfarki", "~%30", "burunfarki-topk-accuracy"],
      ["burunfarki", "~%61", "burunfarki-topk-accuracy"],
      ["lifeos", "AES-256", "lifeos-on-device-encryption"],
    ] as const;

    const actual = projects
      .flatMap((p) => (p.stats ?? []).map((s) => [p.slug, s.value, s.claimId] as const))
      .filter((t): t is readonly [string, string, string] => Boolean(t[2]))
      .map(([slug, value, id]) => `${slug}|${value}|${id}`)
      .sort();

    expect(actual).toEqual(EXPECTED.map(([s, v, i]) => `${s}|${v}|${i}`).sort());
  });
});

describe("a linked stat must actually be the figure its claim asserts", () => {
  it("finds every linked figure inside the claim it points at", () => {
    const mismatches: string[] = [];
    for (const project of projects) {
      const record = publicRegistry.find((r) => r.slug === project.slug);
      for (const stat of project.stats ?? []) {
        if (!stat.claimId) continue;
        const claim = record?.claims.find((c) => c.id === stat.claimId);
        if (!claim) continue;
        const excused = SPELLED_OUT.some(
          (e) => e.slug === project.slug && e.claimId === stat.claimId && e.statValue === stat.value,
        );
        if (excused) continue;
        if (!claimAsserts(claim, figureOf(stat.value))) {
          mismatches.push(
            `${project.slug}: stat "${stat.value}" claims provenance from ${stat.claimId}, which does not assert that figure`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("justifies each exception by what the claim DOES say, not by what it lacks", () => {
    for (const e of SPELLED_OUT) {
      const project = projects.find((p) => p.slug === e.slug)!;
      const record = publicRegistry.find((r) => r.slug === e.slug)!;
      const claim = record.claims.find((c) => c.id === e.claimId)!;

      // The value is pinned: change the stat and the exception stops applying.
      const stat = project.stats.find((s) => s.claimId === e.claimId);
      expect(stat?.value, `${e.slug}/${e.claimId}: exception records "${e.statValue}" but the stat is "${stat?.value}"`).toBe(e.statValue);

      // And the claim must POSITIVELY contain the word form. Asserting only
      // "no digit is present" is true for every value, which is why the
      // previous version of this test could never fail.
      expect(claim.statementTr, `${e.claimId}: Turkish claim must contain "${e.wordTr}"`).toContain(e.wordTr);
      expect(claim.statementEn, `${e.claimId}: English claim must contain "${e.wordEn}"`).toContain(e.wordEn);
    }
  });

  it("the matcher itself behaves", () => {
    // Guarding the guard: a matcher that always returns true would make the
    // mismatch test vacuous, and one that always returns false would block
    // every future link.
    const c = (tr: string, en: string) => ({ statementTr: tr, statementEn: en });
    expect(claimAsserts(c("Top-3 ~%61", "Top-3 ~61%"), "61")).toBe(true);
    expect(claimAsserts(c("13.587 yarış", "13,587 races"), "13587")).toBe(true);
    expect(claimAsserts(c("AES-256 ile şifreli", "encrypted with AES-256"), "256")).toBe(true);
    expect(claimAsserts(c("Top-3 ~%61", "Top-3 ~61%"), "42")).toBe(false);
    // A date in the claim must not satisfy a stat.
    expect(claimAsserts(c("2026-08-19 itibarıyla", "as of 2026-08-19"), "19")).toBe(false);
    // Single digits are never enough.
    expect(claimAsserts(c("Dokuz primitif", "Nine primitives"), "9")).toBe(false);
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
