import type { ProjectStat } from "@/lib/types";

/**
 * The three figures Burun Farkı used to carry in src/data/projects/burunfarki.ts.
 * Founder decision 2026-11-15 (2a) removed them from the site, so the product
 * config now has `stats: []`. StatCards is still generic over any claim-linked
 * stat, so its gate, provenance and number-format tests keep exercising the
 * same shapes through this fixture, which is test input and never shipped.
 */
export const WITHDRAWN_BF_STATS: ProjectStat[] = [
  {
    value: "~%29",
    numericDisplay: { value: 0.29, unit: "percent", approximate: true },
    label: { tr: "Top-1 (canlı takip)", en: "Top-1 (live tracking)" },
    claimId: "burunfarki-topk-accuracy",
  },
  {
    value: "~%62",
    numericDisplay: { value: 0.62, unit: "percent", approximate: true },
    label: { tr: "Top-3 (canlı takip)", en: "Top-3 (live tracking)" },
    claimId: "burunfarki-topk-accuracy",
  },
  {
    value: "1.225",
    numericDisplay: { value: 1225, unit: "integer" },
    label: { tr: "canlı takip yarışı", en: "live-tracked races" },
    claimId: "burunfarki-topk-accuracy",
  },
];
