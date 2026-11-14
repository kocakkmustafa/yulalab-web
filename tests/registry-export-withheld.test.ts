import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publicRegistry } from "@/data/public-registry";
import { buildRegistryExport, checkRegistryExport, dateFromAsOf, isGateExempt, siteDate } from "@/lib/public-registry";

// Dates derive from the registry, never hard-coded (SEC-WEB-01c pattern).
const claims = publicRegistry.flatMap((r) => r.claims);
const nonExempt = claims.filter((c) => !isGateExempt(c));
const exempt = claims.filter((c) => isGateExempt(c));
const sortedNonExempt = nonExempt.map((c) => c.expiresAt).sort();
if (sortedNonExempt.length === 0) throw new Error("registry has no non-exempt claims; these tests need at least one");
const latestNonExempt = sortedNonExempt[sortedNonExempt.length - 1];
const earliestNonExempt = sortedNonExempt[0];
const dayAfter = (d: string) => new Date(new Date(`${d}T12:00:00+03:00`).getTime() + 86_400_000);
const dayOf = (d: string) => new Date(`${d}T12:00:00+03:00`);

const exportedClaims = (now: Date) => buildRegistryExport(publicRegistry, now).products.flatMap((p) => p.claims);

describe("buildRegistryExport (SEC-WEB-01b)", () => {
  it("on the last valid day nothing non-exempt is withheld", () => {
    const out = exportedClaims(dayOf(earliestNonExempt));
    expect(out.filter((c) => "presentation" in c)).toEqual([]);
  });

  it("after expiry the statement and figures of a non-exempt claim are gone, structure and expiresAt kept", () => {
    const out = exportedClaims(dayAfter(latestNonExempt));
    for (const src of nonExempt) {
      const got = out.find((c) => c.id === src.id)!;
      expect(got.presentation).toBe("withheld");
      expect(got.withheldReason).toBe("verification-window-closed");
      expect(got.statementTr).toBe("");
      expect(got.statementEn).toBe("");
      expect(got.figures).toBeUndefined();
      expect(got.figureWords).toBeUndefined();
      expect(got.publishableAsPresentTense).toBe(false);
      expect(got.expiresAt).toBe(src.expiresAt);
      expect(got.id).toBe(src.id);
      expect(got.source).toBe(src.source);
    }
  });

  it("Burun Farkı claims stay byte-identical at any date", () => {
    for (const now of [dayOf(earliestNonExempt), dayAfter(latestNonExempt)]) {
      const out = exportedClaims(now);
      for (const src of exempt) {
        expect(out.find((c) => c.id === src.id)).toEqual(src);
      }
    }
  });

  it("a mid-range date withholds only the lapsed claims", () => {
    const now = dayAfter(earliestNonExempt);
    const out = exportedClaims(now);
    for (const src of nonExempt) {
      const lapsed = siteDate(now) > src.expiresAt;
      expect(out.find((c) => c.id === src.id)!.presentation === "withheld").toBe(lapsed);
    }
  });

  it("the committed JSON equals the export for its own asOf and carries the consumer contract", () => {
    const file = JSON.parse(readFileSync(join(process.cwd(), "public/portfolio-registry.json"), "utf8"));
    expect(file).toEqual(JSON.parse(JSON.stringify(buildRegistryExport(publicRegistry, dayOf(file.asOf)))));
    expect(file.schema.notes).toContain("expiresAt < today");
    expect(file.schema.notes).toContain("burunfarki-");
  });
});

describe("checkRegistryExport (--check)", () => {
  const text = (asOf: string) => `${JSON.stringify(buildRegistryExport(publicRegistry, dateFromAsOf(asOf)!), null, 2)}\n`;
  const dayBeforeAll = siteDate(new Date(dayOf(earliestNonExempt).getTime() - 86_400_000)); // every non-exempt claim still open

  it("fresh file for today: ok, no warning", () => {
    const now = dayOf(earliestNonExempt);
    expect(checkRegistryExport(text(siteDate(now)), publicRegistry, now)).toEqual({ errors: [], warnings: [] });
  });

  it("stale + a non-exempt claim lapsed since asOf: error naming claim, date and fix", () => {
    const r = checkRegistryExport(text(dayBeforeAll), publicRegistry, dayAfter(earliestNonExempt));
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("bayat");
    expect(r.errors[0]).toContain(earliestNonExempt);
    expect(r.errors[0]).toContain("export:registry");
  });

  it("asOf behind today but no claim lapsed in between: warning only", () => {
    const r = checkRegistryExport(text(dayBeforeAll), publicRegistry, dayOf(earliestNonExempt));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
  });

  it("a hand-edited old asOf does not hide a lapse", () => {
    expect(checkRegistryExport(text("2020-01-01"), publicRegistry, dayAfter(latestNonExempt)).errors.length).toBeGreaterThan(0);
  });

  it("invalid, impossible and future asOf fail", () => {
    const now = dayOf(earliestNonExempt);
    const base = JSON.parse(text(siteDate(now)));
    for (const asOf of ["2026-9-1", "2026-02-31", "soon", 5, undefined, siteDate(dayAfter(siteDate(now)))]) {
      const body = `${JSON.stringify({ ...base, asOf }, null, 2)}\n`;
      expect(checkRegistryExport(body, publicRegistry, now).errors.length).toBeGreaterThan(0);
    }
    expect(checkRegistryExport("{", publicRegistry, now).errors.length).toBeGreaterThan(0);
  });

  it("a tampered statement in an otherwise fresh file is rejected", () => {
    const now = dayAfter(latestNonExempt);
    const fresh = JSON.parse(text(siteDate(now)));
    fresh.products.flatMap((p: { claims: { statementEn: string }[] }) => p.claims)[0].statementEn = "tampered";
    expect(checkRegistryExport(`${JSON.stringify(fresh, null, 2)}\n`, publicRegistry, now).errors.length).toBeGreaterThan(0);
  });
});
