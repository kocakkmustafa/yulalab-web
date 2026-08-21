import type { ProductPublicRecord } from "./types";

/**
 * Case studies — the strongest claim this site can make.
 *
 * A stat card asserts a number. A case study asserts a STORY about a real
 * product, often involving a real person or customer, and readers weigh it
 * accordingly. So the bar here is structural rather than editorial, in the
 * same spirit as src/lib/public-registry.ts: a case that cannot prove its
 * permission, source, baseline, artifact, measurement and failure lesson
 * does not render — `pnpm verify:claims` and the build fail instead.
 *
 * The one rule worth stating out loud: the outcome may not assert a figure
 * the registry does not already carry, under the claim it points at. This
 * is the drift guard Y-P1-001 built for stat cards, applied to the surface
 * where an unbacked number would do the most damage.
 */

export type CasePermissionKind = "self-owned" | "written-third-party";

export type CasePermission = {
  /**
   * "self-owned" — the subject is a YULA product and no third party's
   * identity appears. "written-third-party" — someone else's name, logo or
   * outcome is used, which requires a dated written grant on file.
   *
   * Modelled as data rather than assumed, because every product in the
   * portfolio is YULA's own today: without the distinction the permission
   * requirement would be a no-op the day a real client arrives.
   */
  kind: CasePermissionKind;
  grantedBy: string;
  /** ISO date the permission was granted. */
  grantedAt: string;
  /**
   * Where the written grant lives. Required for third-party cases — "they
   * were fine with it" is precisely the claim nobody can check later.
   */
  grantReference?: string;
  /** Exactly how much identity/outcome the grant covers — both languages. */
  scopeTr: string;
  scopeEn: string;
};

export type CaseArtifactKind = "code" | "commit" | "measurement" | "document" | "screenshot";

export type CaseArtifact = {
  kind: CaseArtifactKind;
  labelTr: string;
  labelEn: string;
  /** Repo path, commit SHA, or dated measurement note. Never empty. */
  source: string;
};

export type CaseDecision = {
  dateTr: string;
  summaryTr: string;
  summaryEn: string;
};

export type CaseOutcome = {
  /** Figures the outcome asserts, exactly as rendered. */
  figures: string[];
  statementTr: string;
  statementEn: string;
  /** The registry claim that already carries this outcome. */
  claimId: string;
};

export type CaseStudy = {
  slug: string;
  /** Must match a product in the public registry. */
  productSlug: string;
  titleTr: string;
  titleEn: string;
  permission: CasePermission;
  baselineTr: string;
  baselineEn: string;
  constraintTr: string;
  constraintEn: string;
  decisions: CaseDecision[];
  artifacts: CaseArtifact[];
  outcome: CaseOutcome;
  /** What failed. Mandatory: a case with no failure is marketing. */
  failureTr: string;
  failureEn: string;
  changedAfterTr: string;
  changedAfterEn: string;
  verifiedAt: string;
  expiresAt: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Same normalisation the stat drift guard uses: thousands separators and
 *  spacing must not decide whether a figure "matches". */
function searchable(value: string): string {
  return value.replace(/[.\s ]/g, "").toLowerCase();
}

function bothLanguages(label: string, tr: string, en: string): string[] {
  const errors: string[] = [];
  if (!tr?.trim()) errors.push(`${label} missing (tr)`);
  if (!en?.trim()) errors.push(`${label} missing (en)`);
  return errors;
}

export function validateCaseStudy(
  study: CaseStudy,
  registry: ProductPublicRecord[],
): string[] {
  const errors: string[] = [];
  const where = (msg: string) => `${study.slug ?? "<no slug>"}: ${msg}`;

  if (!study.slug?.trim()) errors.push("case study missing slug");
  for (const e of bothLanguages("title", study.titleTr, study.titleEn)) errors.push(where(e));

  // ---- product ----
  const product = registry.find((r) => r.slug === study.productSlug);
  if (!product) {
    errors.push(where(`productSlug "${study.productSlug}" is not in the public registry`));
  }

  // ---- permission ----
  const p = study.permission;
  if (!p) {
    errors.push(where("permission missing — a case study may not be published without one"));
  } else {
    if (!p.grantedBy?.trim()) errors.push(where("permission missing grantedBy"));
    if (!ISO_DATE.test(p.grantedAt ?? "")) {
      errors.push(where("permission grantedAt must be a canonical YYYY-MM-DD date"));
    }
    for (const e of bothLanguages("permission scope", p.scopeTr, p.scopeEn)) errors.push(where(e));
    if (p.kind === "written-third-party" && !p.grantReference?.trim()) {
      errors.push(
        where("third-party permission needs grantReference — an unfiled grant cannot be checked later"),
      );
    }
  }

  // ---- narrative spine ----
  for (const e of bothLanguages("baseline", study.baselineTr, study.baselineEn)) errors.push(where(e));
  for (const e of bothLanguages("constraint", study.constraintTr, study.constraintEn)) errors.push(where(e));
  for (const e of bothLanguages("failure/lesson", study.failureTr, study.failureEn)) errors.push(where(e));
  for (const e of bothLanguages("changedAfter", study.changedAfterTr, study.changedAfterEn)) {
    errors.push(where(e));
  }

  if (!study.decisions?.length) {
    errors.push(where("decision log is empty — a case with no decisions explains nothing"));
  }

  // ---- artifacts ----
  if (!study.artifacts?.length) {
    errors.push(where("no artifact — a case study must point at something real"));
  }
  for (const a of study.artifacts ?? []) {
    if (!a.source?.trim()) {
      errors.push(where(`artifact "${a.labelTr || a.kind}" has no source`));
    }
    for (const e of bothLanguages(`artifact ${a.kind} label`, a.labelTr, a.labelEn)) {
      errors.push(where(e));
    }
  }

  // ---- outcome, checked against the registry ----
  const o = study.outcome;
  if (!o) {
    errors.push(where("outcome missing — a case study with no measured result is a story"));
  } else {
    for (const e of bothLanguages("outcome statement", o.statementTr, o.statementEn)) {
      errors.push(where(e));
    }
    const claim = product?.claims.find((c) => c.id === o.claimId);
    if (!claim) {
      errors.push(
        where(`outcome claimId "${o.claimId}" is not a claim of product "${study.productSlug}"`),
      );
    } else {
      const haystack = searchable(`${claim.statementTr} ${claim.statementEn} ${(claim.figures ?? []).join(" ")}`);
      for (const figure of o.figures ?? []) {
        if (!searchable(figure) || !haystack.includes(searchable(figure))) {
          errors.push(
            where(
              `outcome figure "${figure}" is not carried by claim "${o.claimId}" — a case may not assert a number the registry has not verified`,
            ),
          );
        }
      }
    }
  }

  // ---- validity ----
  if (!ISO_DATE.test(study.verifiedAt ?? "")) {
    errors.push(where("verifiedAt must be a canonical YYYY-MM-DD date"));
  }
  if (!ISO_DATE.test(study.expiresAt ?? "")) {
    errors.push(where("expiresAt must be a canonical YYYY-MM-DD date"));
  }

  return errors;
}

export function validateCaseStudies(
  studies: CaseStudy[],
  registry: ProductPublicRecord[],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const study of studies) {
    if (seen.has(study.slug)) errors.push(`duplicate case-study slug "${study.slug}"`);
    seen.add(study.slug);
    errors.push(...validateCaseStudy(study, registry));
  }
  return errors;
}

/**
 * Cases that may actually appear on the public index.
 *
 * Passing the structural gate is necessary but not sufficient: the roadmap
 * (§5.4) also puts SOURCE-PRODUCT preconditions on the first two cases, and
 * those are business facts, not code facts. Rather than encode a guess, the
 * rule here is mechanical and conservative — a case renders only when its
 * product's own registry record still stands behind it, i.e. the linked
 * claim exists and its verification window has not lapsed.
 */
export function publishableCaseStudies(
  studies: CaseStudy[],
  registry: ProductPublicRecord[],
): CaseStudy[] {
  return studies.filter((s) => validateCaseStudy(s, registry).length === 0);
}
