import type { ClaimState, ProductClaim, ProductPublicRecord, VerificationMethod } from "./types";

/**
 * Structural, time-independent fail-closed rules (roadmap §6). Deliberately
 * does NOT check whether verifiedAt/expiresAt have actually passed — that's
 * a freshness concern, checked at render time by isExpired() below, not a
 * build-blocking one. Mixing the two turns "nobody re-verified a claim in
 * 24 hours" into "the build is broken", which breaks CI on days nobody
 * touches this repo even though no code regressed. See
 * ../workspace/Y-P0-002-CSP-NONCE-SCOPE-KARARI.md and
 * ../workspace/TASARIM-RISKI-STORE-EXPIRY-BUILD.md for the same reasoning
 * applied to CSP and to this registry respectively.
 */

/**
 * Canonical, zero-padded ISO date. Enforced because freshness compares
 * these lexicographically: `"2026-9-18"` — one missing zero — sorts below
 * every real date, so the claim never expires until the year rolls over.
 * Measured: with only a presence check, that typo left the whole suite
 * green and validateRegistry empty while an expired claim stayed published
 * under "Verified claims" for three extra months.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateErrors(label: string, value: string | undefined): string[] {
  if (!value) return [`${label} missing`];
  if (!ISO_DATE.test(value)) return [`${label} must be a canonical YYYY-MM-DD date`];
  return [];
}

/** States that may back a present-tense statement (ana talimat §8.5). */
export const VERIFIED_CLAIM_STATES: readonly ClaimState[] = [
  "production_verified",
  "beta_verified",
  "source_verified",
];

/** States that must never read as something the product does today. */
const NOT_PRESENT_TENSE_STATES: readonly ClaimState[] = ["prototype", "planned", "unknown"];

/**
 * A statement for a prototype/planned/unknown claim must say so itself.
 * Without this, flipping `publishableAsPresentTense` off while leaving a
 * present-tense sentence ("X supports Y") still ships the over-claim through
 * any consumer that reads `statementTr/En` and ignores the flag (the
 * links.yulalab.com JSON, JSON-LD). Words checked, not sniffed from grammar:
 * the marker has to be literally in the text.
 */
// The marker must START a word ("unplanned", "targeted" and "goals" are not
// markers) and match either spelling of "yakında"/"YAKINDA" — the `i` flag
// does not fold the Turkish dotless ı.
const NOT_YET_MARKER =
  /(?<![\p{L}])(planlan|planned|prototip|prototype|yak[ıi]nda|coming soon|henüz|not yet|hedef|target\b|goal\b|will\s|olacak|doğrulanmad|unverified|unknown|bilinmiyor)/iu;

const PRESENT_TENSE_EVIDENCE_METHODS: readonly VerificationMethod[] = ["store_build", "live_e2e"];
const SOURCE_EVIDENCE_METHODS: readonly VerificationMethod[] = ["source_review", "ci"];

function claimStateErrors(record: ProductPublicRecord, claim: ProductClaim): string[] {
  const errors: string[] = [];
  const state = claim.claimState;
  const out = (msg: string) => `${record.slug}: claim ${claim.id} ${msg}`;

  // Rule 1 — never present tense for planned/prototype/unknown.
  if (state && NOT_PRESENT_TENSE_STATES.includes(state)) {
    if (claim.publishableAsPresentTense === true) {
      errors.push(out(`is ${state} but publishableAsPresentTense is true`));
    }
    // Rule 6 — and the text itself must not read as present tense.
    for (const [lang, text] of [
      ["Tr", claim.statementTr],
      ["En", claim.statementEn],
    ] as const) {
      if (text.trim() !== "" && !NOT_YET_MARKER.test(text)) {
        errors.push(out(`is ${state} but statement${lang} reads as present tense (no planned/prototype/unverified marker)`));
      }
    }
  }

  // Present tense needs a verified state behind it (covers a missing state).
  if (claim.publishableAsPresentTense === true && !(state && VERIFIED_CLAIM_STATES.includes(state))) {
    errors.push(out("is publishableAsPresentTense without a verified claimState"));
  }

  // Rule 2 — production/beta need store or live evidence, a build, and a matching surface.
  if (state === "production_verified" || state === "beta_verified") {
    if (!claim.verificationMethod || !PRESENT_TENSE_EVIDENCE_METHODS.includes(claim.verificationMethod)) {
      errors.push(out(`${state} requires verificationMethod store_build or live_e2e`));
    }
    if (!claim.buildOrCommit) errors.push(out(`${state} requires buildOrCommit`));
    const surfaceOk = record.surfaces.some((s) =>
      state === "production_verified" ? s.status === "live" : s.status === "live" || s.status === "beta",
    );
    if (!surfaceOk) {
      errors.push(out(`${state} requires a ${state === "production_verified" ? "live" : "live or beta"} surface on the record`));
    }
  }

  // Rule 3 — source_verified needs a source read, a commit, and the matching evidenceKind.
  if (state === "source_verified") {
    if (!claim.verificationMethod || !SOURCE_EVIDENCE_METHODS.includes(claim.verificationMethod)) {
      errors.push(out("source_verified requires verificationMethod source_review or ci"));
    }
    if (claim.evidenceKind !== "source-code-verified") {
      errors.push(out("source_verified requires evidenceKind source-code-verified"));
    }
    if (!claim.buildOrCommit) errors.push(out("source_verified requires buildOrCommit"));
  }

  // Rule 4 — "none" is the product vouching for itself, and nothing more.
  if (claim.verificationMethod === "none" && claim.evidenceKind !== "self-reported") {
    errors.push(out("verificationMethod none requires evidenceKind self-reported"));
  }

  return errors;
}

export function validateRecord(record: ProductPublicRecord): string[] {
  const errors: string[] = [];
  const where = (msg: string) => `${record.slug}: ${msg}`;

  // Burun Farkı gate exemption is keyed on the claim id prefix; keep it honest:
  // the prefix must belong to the burunfarki record and to nothing else.
  for (const claim of record.claims) {
    if (isGateExempt(claim) !== (record.slug === "burunfarki")) {
      errors.push(
        where(`claim ${claim.id}: the "burunfarki-" id prefix is reserved for the burunfarki record (gate exemption)`),
      );
    }
  }

  const knownLifecycles = ["live", "beta", "research", "archived"];
  if (!knownLifecycles.includes(record.lifecycle)) {
    errors.push(where(`unknown lifecycle "${record.lifecycle}"`));
  }

  for (const surface of record.surfaces) {
    // A surface still being built has nothing to source yet — only surfaces
    // claiming to be live or beta right now must prove it.
    if (surface.status === "live" || surface.status === "beta") {
      if (!surface.source) errors.push(where(`${surface.kind} surface missing source`));
      for (const e of dateErrors(`${surface.kind} surface verifiedAt`, surface.verifiedAt)) {
        errors.push(where(e));
      }
      for (const e of dateErrors(`${surface.kind} surface expiresAt`, surface.expiresAt)) {
        errors.push(where(e));
      }
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
      // Both languages, like the statement itself. A caveat present only in
      // Turkish is a caveat an English reader cannot use.
      if (!claim.scopeTr) errors.push(where(`claim ${claim.id} missing scopeTr`));
      if (!claim.scopeEn) errors.push(where(`claim ${claim.id} missing scopeEn`));
      if (!claim.owner) errors.push(where(`claim ${claim.id} missing owner`));
      for (const e of dateErrors(`claim ${claim.id} verifiedAt`, claim.verifiedAt)) {
        errors.push(where(e));
      }
      for (const e of dateErrors(`claim ${claim.id} expiresAt`, claim.expiresAt)) {
        errors.push(where(e));
      }
    }
    // Outside the statement block on purpose: a claim with both statements
    // empty must not skip the state rules (publishableAsPresentTense: true on
    // an empty claim is still a declaration that has to be consistent).
    errors.push(...claimStateErrors(record, claim));
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
/**
 * The zone every `verifiedAt`/`expiresAt` date is authored and judged in.
 *
 * Declared rather than implicit: the first version compared timestamps, so
 * the verdict silently depended on the server's TZ and the same claim could
 * be lapsed for the build machine and fresh for the reader.
 */
export const SITE_TIME_ZONE = "Europe/Istanbul";

/** The calendar date at `instant`, in the site's zone, as YYYY-MM-DD. */
export function siteDate(instant: Date): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the registry's shape and
  // sorts lexicographically.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * `expiresAt` is "the date after which this must be re-confirmed" (see
 * types.ts), so it is valid THROUGH its own day.
 *
 * Compared as dates, not timestamps. `new Date("2026-08-22")` parses as UTC
 * midnight — 03:00 in Istanbul — so the old comparison made a claim stale at
 * 3am ON its expiry date, turning every documented 30-day window into 29
 * days and 3 hours here and less further west. Comparing YYYY-MM-DD strings
 * in a declared zone leaves no arithmetic to get wrong.
 */
export function isExpired(expiresAt: string, now: Date): boolean {
  return siteDate(now) > expiresAt;
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

/**
 * SEC-WEB-01 — the single gate every render surface asks before it speaks a
 * claim's statement or figure. A claim whose verification window has closed
 * (`expiresAt` passed, in the site's zone — see isExpired) may not be
 * presented in the present tense; surfaces show at most a dated, past-tense
 * "window closed" marker and never narrate the figure. Time-dependent on
 * purpose: the same registry closes the gate by itself as dates pass.
 * Independent of claimState; present-tense eligibility (isPresentTenseEligible)
 * is a further, stricter test layered on top of this one.
 */
export function isClaimPresentable(
  claim: { id?: string; expiresAt?: string },
  now: Date,
): boolean {
  if (isGateExempt(claim)) return true;
  return !(claim.expiresAt && isExpired(claim.expiresAt, now));
}

/**
 * Burun Farkı kurucu kararına kadar kapsam dışı: the gate does not touch its
 * claims (they keep rendering exactly as before — lapsed ones marked, figures
 * shown). Narrowest existing criterion: the `burunfarki-` claim id prefix;
 * registry data is not changed. Remove this exemption only on a founder decision.
 */
export function isGateExempt(claim: { id?: string }): boolean {
  return claim.id?.startsWith("burunfarki-") === true;
}

/** Claims of a record that the gate currently lets through. */
export function listPresentableClaims(record: ProductPublicRecord, now: Date): ProductClaim[] {
  return record.claims.filter((c) => isClaimPresentable(c, now));
}

/** Claims whose window closes within `days` days (inclusive), not yet lapsed. For the build report. */
export function listClaimsExpiringWithin(
  records: ProductPublicRecord[],
  now: Date,
  days: number,
): { slug: string; claimId: string; expiresAt: string }[] {
  const horizon = siteDate(new Date(now.getTime() + days * 86_400_000));
  const out: { slug: string; claimId: string; expiresAt: string }[] = [];
  for (const record of records) {
    for (const claim of record.claims) {
      if (claim.expiresAt && !isExpired(claim.expiresAt, now) && claim.expiresAt <= horizon) {
        out.push({ slug: record.slug, claimId: claim.id, expiresAt: claim.expiresAt });
      }
    }
  }
  return out;
}

/**
 * May this claim be shown in the present tense right now? Fail closed: an
 * undeclared state, a missing flag, an unverified state or a lapsed window
 * each answer no. Only an explicit verified state + an explicit `true` + an
 * open window answers yes.
 */
export function isPresentTenseEligible(claim: ProductClaim, now: Date): boolean {
  if (claim.expiresAt && isExpired(claim.expiresAt, now)) return false;
  if (!claim.claimState || !VERIFIED_CLAIM_STATES.includes(claim.claimState)) return false;
  return claim.publishableAsPresentTense === true;
}

/**
 * Build gate: every claim whose window is still open must DECLARE its state
 * and its present-tense flag. This is the only time-dependent registry check,
 * and it can only relax over time (a claim that lapses stops being checked —
 * it already renders as unverified), so it cannot turn "nobody re-verified
 * this" into a red build — the reason validateRecord stays date-free (see the
 * header). Lapsed legacy claims are listed by `listUndeclaredLapsedClaims`
 * instead, for the report, not the gate.
 */
export function validateClaimStateDeclared(records: ProductPublicRecord[], now: Date): string[] {
  const errors: string[] = [];
  for (const record of records) {
    for (const claim of record.claims) {
      const out = (msg: string) => `${record.slug}: claim ${claim.id} ${msg}`;
      // Not time-dependent: the home overlay, StatCards and case studies read
      // claims[] directly (not through presentClaims) and judge only freshness,
      // so a planned/prototype/unknown claim there would be shown as current.
      // Until those surfaces filter by isPresentTenseEligible (WEB-P0-03),
      // such facts live in status labels, not in claims[].
      if (claim.claimState && !VERIFIED_CLAIM_STATES.includes(claim.claimState)) {
        errors.push(
          out(
            `is ${claim.claimState}; keep planned/prototype/unknown facts out of claims[] (status labels) until every claim consumer filters by isPresentTenseEligible`,
          ),
        );
      }
      if (claim.expiresAt && isExpired(claim.expiresAt, now)) continue;
      if (!claim.claimState) errors.push(out("has an open verification window but no claimState"));
      if (typeof claim.publishableAsPresentTense !== "boolean") {
        errors.push(out("has an open verification window but no publishableAsPresentTense"));
      }
    }
  }
  return errors;
}

/** Lapsed claims that never declared a state — surfaced in reports, never failing the build. */
export function listUndeclaredLapsedClaims(
  records: ProductPublicRecord[],
  now: Date,
): { slug: string; claimId: string; expiresAt: string }[] {
  const out: { slug: string; claimId: string; expiresAt: string }[] = [];
  for (const record of records) {
    for (const claim of record.claims) {
      if (claim.expiresAt && isExpired(claim.expiresAt, now) && !claim.claimState) {
        out.push({ slug: record.slug, claimId: claim.id, expiresAt: claim.expiresAt });
      }
    }
  }
  return out;
}
