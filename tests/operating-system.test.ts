import { describe, it, expect } from "vitest";
import {
  EVIDENCE_LEVELS,
  evidenceCounts,
  lapsedSurfaceCount,
  lifecycleRows,
  portfolioCounts,
} from "@/lib/operating-system";
import { publicRegistry } from "@/data/public-registry";

/**
 * The Operating System page describes how this site stays honest, which
 * makes it the page least allowed to drift. These tests anchor its numbers
 * to BEHAVIOUR (recomputation from the registry), not to today's values —
 * a test asserting "6 claims" would have to be edited every time a claim is
 * added, and an assertion people routinely edit protects nothing.
 */
describe("operating-system figures", () => {
  it("counts every claim in the registry exactly once across the evidence levels", () => {
    const counts = evidenceCounts();
    const summed = Object.values(counts).reduce((a, b) => a + b, 0);
    const actual = publicRegistry.reduce((n, r) => n + r.claims.length, 0);
    expect(summed).toBe(actual);
  });

  it("declares an evidence level for every evidenceKind the registry can hold", () => {
    // A claim whose kind has no level would render as an unlabelled number.
    const declared = new Set(EVIDENCE_LEVELS.map((l) => l.kind));
    for (const record of publicRegistry) {
      for (const claim of record.claims) {
        expect(declared, `no evidence level declares "${claim.evidenceKind}"`).toContain(
          claim.evidenceKind,
        );
      }
    }
  });

  it("covers every lifecycle state in the registry, with counts that add up", () => {
    const rows = lifecycleRows();
    const declared = new Set(rows.map((r) => r.key));
    for (const record of publicRegistry) {
      expect(declared).toContain(record.lifecycle);
    }
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(publicRegistry.length);
  });

  it("gives every lifecycle state a stated mechanical effect in both languages", () => {
    for (const row of lifecycleRows()) {
      expect(row.effectTr.trim().length, `${row.key} has no TR effect`).toBeGreaterThan(0);
      expect(row.effectEn.trim().length, `${row.key} has no EN effect`).toBeGreaterThan(0);
    }
  });

  it("reports lapsed surfaces from the clock, not from a frozen number", () => {
    // Same window, two different 'now's must be able to disagree — that is
    // the whole point of deriving the figure the limitations section prints.
    const longAgo = lapsedSurfaceCount(new Date("2000-01-01T00:00:00+03:00"));
    const farFuture = lapsedSurfaceCount(new Date("2099-01-01T00:00:00+03:00"));
    const datedSurfaces = publicRegistry.reduce(
      (n, r) => n + r.surfaces.filter((s) => s.expiresAt).length,
      0,
    );
    expect(longAgo).toBe(0);
    expect(farFuture).toBe(datedSurfaces);
  });

  it("keeps portfolio totals in step with the registry", () => {
    const t = portfolioCounts();
    expect(t.products).toBe(publicRegistry.length);
    expect(t.claims).toBe(publicRegistry.reduce((n, r) => n + r.claims.length, 0));
    expect(t.surfaces).toBe(publicRegistry.reduce((n, r) => n + r.surfaces.length, 0));
    expect(t.screenshots).toBe(publicRegistry.reduce((n, r) => n + r.screenshots.length, 0));
  });
});
