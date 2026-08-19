import type { ProductPublicRecord } from "./types";

/**
 * Structural, time-independent fail-closed rules (roadmap §6). Deliberately
 * does NOT check whether verifiedAt/expiresAt have actually passed — that's
 * a freshness concern, checked at render time by isExpired() below, not a
 * build-blocking one. Mixing the two turns "nobody re-verified a claim in
 * 24 hours" into "the build is broken", which breaks CI on days nobody
 * touches this repo even though no code regressed. See
 * workspace/Y-P0-002-CSP-NONCE-SCOPE-KARARI.md and
 * workspace/TASARIM-RISKI-STORE-EXPIRY-BUILD.md for the same reasoning
 * applied to CSP and to this registry respectively.
 */
export function validateRecord(record: ProductPublicRecord): string[] {
  const errors: string[] = [];
  const where = (msg: string) => `${record.slug}: ${msg}`;

  const knownLifecycles = ["live", "beta", "research", "archived"];
  if (!knownLifecycles.includes(record.lifecycle)) {
    errors.push(where(`unknown lifecycle "${record.lifecycle}"`));
  }

  for (const surface of record.surfaces) {
    // A surface still being built has nothing to source yet — only surfaces
    // claiming to be live or beta right now must prove it.
    if (surface.status === "live" || surface.status === "beta") {
      if (!surface.source) errors.push(where(`${surface.kind} surface missing source`));
      if (!surface.verifiedAt) errors.push(where(`${surface.kind} surface missing verifiedAt`));
      if (!surface.expiresAt) errors.push(where(`${surface.kind} surface missing expiresAt`));
    }
  }

  if (record.lifecycle === "live" || record.lifecycle === "beta") {
    for (const shot of record.screenshots) {
      if (!shot.sourceBuild) errors.push(where(`screenshot ${shot.path} missing sourceBuild`));
      if (!shot.capturedAt) errors.push(where(`screenshot ${shot.path} missing capturedAt`));
    }
  }

  for (const claim of record.claims) {
    const hasTr = claim.statementTr.trim() !== "";
    const hasEn = claim.statementEn.trim() !== "";
    if (hasTr !== hasEn) {
      errors.push(
        where(`claim ${claim.id} has only one of statementTr/statementEn — both or neither`),
      );
    }
    // A claim only reaches this array once it's actually asserted (unlike
    // a surface, which can legitimately be an empty-string placeholder
    // while a product is still "research") — so every claim present must
    // carry its full provenance, not just its TR/EN text.
    if (hasTr || hasEn) {
      if (!claim.source) errors.push(where(`claim ${claim.id} missing source`));
      if (!claim.scope) errors.push(where(`claim ${claim.id} missing scope`));
      if (!claim.owner) errors.push(where(`claim ${claim.id} missing owner`));
      if (!claim.verifiedAt) errors.push(where(`claim ${claim.id} missing verifiedAt`));
      if (!claim.expiresAt) errors.push(where(`claim ${claim.id} missing expiresAt`));
    }
  }

  if (record.lifecycle === "research") {
    const storeHost = /apps\.apple\.com|play\.google\.com/i;
    if (storeHost.test(record.primaryCta.url)) {
      errors.push(where("research product's primary CTA points at a store URL"));
    }
  }

  return errors;
}

export function validateRegistry(records: ProductPublicRecord[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.slug)) errors.push(`duplicate slug "${record.slug}"`);
    seen.add(record.slug);
    errors.push(...validateRecord(record));
  }
  return errors;
}

/** Archived products are excluded from the default grid (roadmap §6) — still reachable directly, just not in the "what we're building" view. */
export function getDefaultVisibleProducts(
  records: ProductPublicRecord[],
): ProductPublicRecord[] {
  return records.filter((r) => r.lifecycle !== "archived");
}

/**
 * Freshness — the runtime half of the split described above. `now` is
 * injected (not read internally) so this stays pure and testable; callers
 * pass `new Date()` at render/script time.
 */
export function isExpired(expiresAt: string, now: Date): boolean {
  return new Date(expiresAt).getTime() < now.getTime();
}

export type SurfaceFreshness = {
  surface: ProductPublicRecord["surfaces"][number];
  stale: boolean;
};

/** Per-surface freshness for a record — render layers use this to suppress or flag a stale surface without failing the build. */
export function getSurfaceFreshness(
  record: ProductPublicRecord,
  now: Date,
): SurfaceFreshness[] {
  return record.surfaces.map((surface) => ({
    surface,
    stale: surface.expiresAt ? isExpired(surface.expiresAt, now) : false,
  }));
}

export type ClaimFreshness = {
  claim: ProductPublicRecord["claims"][number];
  stale: boolean;
};

export function getClaimFreshness(record: ProductPublicRecord, now: Date): ClaimFreshness[] {
  return record.claims.map((claim) => ({
    claim,
    stale: claim.expiresAt ? isExpired(claim.expiresAt, now) : false,
  }));
}
