import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publicRegistry } from "@/data/public-registry";
import { buildRegistryExport, isGateExempt, siteDate } from "@/lib/public-registry";

// Dates derive from the registry, never hard-coded (SEC-WEB-01c pattern).
const claims = publicRegistry.flatMap((r) => r.claims);
const nonExempt = claims.filter((c) => !isGateExempt(c));
const exempt = claims.filter((c) => isGateExempt(c));
const latestNonExempt = nonExempt.map((c) => c.expiresAt).sort().pop()!;
const earliestNonExempt = nonExempt.map((c) => c.expiresAt).sort()[0];
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
  });
});
