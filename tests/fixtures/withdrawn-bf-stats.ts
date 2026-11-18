import type { ProductPublicRecord, ProjectStat } from "@/lib/types";

/**
 * The three figures Burun Farkı used to carry in src/data/projects/burunfarki.ts.
 * Founder decision 2026-11-15 (2a) removed them from the site; founder decision
 * 2026-11-18 then removed the two expired claims from the registry for good.
 * StatCards is still generic over any claim-linked stat, so its gate,
 * provenance and number-format tests keep exercising the same shapes through
 * this fixture. The claim below is a SYNTHETIC stand-in under a neutral id
 * (never in the real registry, never shipped): it only reproduces the shape.
 */
export const FIXTURE_ACCURACY_CLAIM_ID = "fixture-live-accuracy";

export const FIXTURE_ACCURACY_RECORD: ProductPublicRecord = {
  slug: "fixture-accuracy",
  name: "Fixture",
  lifecycle: "live",
  surfaces: [],
  primaryCta: { labelTr: "x", labelEn: "x", url: "/x" },
  screenshots: [],
  claims: [
    {
      id: FIXTURE_ACCURACY_CLAIM_ID,
      figures: ["~%29", "~%62", "1.225"],
      statementTr: "1.225 canlı takip yarışında Top-1 ~%29 (%28,6), Top-3 ~%62 (%62,0) — yayın-sonrası dürüst takip. Eğitim-zamanı backtest ayrıca ~%69 Top-3 ölçmüştü (farklı ölçüm).",
      statementEn: "Across 1,225 live-tracked races, Top-1 ~29% (28.6%) and Top-3 ~62% (62.0%) — honest post-deployment tracking. A separate training-time backtest measured ~69% Top-3 (a different measurement).",
      evidenceKind: "measured",
      source: "https://example.com/accuracy",
      scopeTr: "Yalnız test girdisi (sentetik).",
      scopeEn: "Synthetic test input only.",
      owner: "fixture",
      verifiedAt: "2026-08-25",
      expiresAt: "2026-09-24",
    },
  ],
  privacyUrl: "/p",
  supportUrl: "/s",
  updatedAt: "2026-08-25",
};

export const WITHDRAWN_BF_STATS: ProjectStat[] = [
  {
    value: "~%29",
    numericDisplay: { value: 0.29, unit: "percent", approximate: true },
    label: { tr: "Top-1 (canlı takip)", en: "Top-1 (live tracking)" },
    claimId: FIXTURE_ACCURACY_CLAIM_ID,
  },
  {
    value: "~%62",
    numericDisplay: { value: 0.62, unit: "percent", approximate: true },
    label: { tr: "Top-3 (canlı takip)", en: "Top-3 (live tracking)" },
    claimId: FIXTURE_ACCURACY_CLAIM_ID,
  },
  {
    value: "1.225",
    numericDisplay: { value: 1225, unit: "integer" },
    label: { tr: "canlı takip yarışı", en: "live-tracked races" },
    claimId: FIXTURE_ACCURACY_CLAIM_ID,
  },
];
