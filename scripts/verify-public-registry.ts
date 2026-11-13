#!/usr/bin/env -S npx tsx
// PR/CI gate for the public registry (Y-P0-003, roadmap §12 Y-P0-003,
// mapped from package.json's `verify:claims`). The structural rules are
// time-independent — see src/lib/public-registry.ts's validateRecord() header.
// Expiry (SEC-WEB-01) is checked in ONE direction only: an expired claim that
// the renderers would still present fails the build; an expired claim the gate
// withholds does not (it is reported), and claims expiring soon only warn.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { publicRegistry } from "../src/data/public-registry";
import { caseStudies } from "../src/data/case-studies";
import { validateCaseStudies } from "../src/lib/case-studies";
import { presentClaims } from "../src/lib/proof";
import {
  isClaimPresentable,
  isExpired,
  isGateExempt,
  listClaimsExpiringWithin,
  listUndeclaredLapsedClaims,
  validateClaimStateDeclared,
  validateRegistry,
} from "../src/lib/public-registry";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const NOW = new Date();
const EXPIRY_WARN_DAYS = 30;

// (a) Every expired claim must be withheld by the gate: the shared predicate
// says "not presentable" and the presenter must not call it "verified".
const gateErrors: string[] = [];
for (const record of publicRegistry) {
  const presented = presentClaims(record, NOW);
  for (const claim of record.claims) {
    if (!claim.expiresAt || isClaimPresentable(claim, NOW)) continue;
    const kind = presented.find((p) => p.claim.id === claim.id)?.kind;
    if (kind === "verified") {
      gateErrors.push(`${record.slug}: claim ${claim.id} expired ${claim.expiresAt} but is still presented as verified`);
    }
  }
}

const errors = [
  ...gateErrors,
  ...validateRegistry(publicRegistry),
  // Every claim with an open verification window must declare claimState and
  // publishableAsPresentTense (WEB-P0-04). Time-dependent, but it only ever relaxes.
  ...validateClaimStateDeclared(publicRegistry, NOW),
  // Case studies ride the same gate: the strongest claim on the site must
  // fail the BUILD, not merely a test, when it cannot prove itself
  // (roadmap Y-P1-003).
  ...validateCaseStudies(caseStudies, publicRegistry),
];
if (errors.length) {
  console.error(`verify-public-registry: ${errors.length} issue(s) found\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// Re-generate into a throwaway path and diff, rather than trusting whatever
// is already on disk — a stale committed JSON must fail this the same way
// a stale generated one would.
try {
  // Use the same Node executable and locally installed tsx loader as the gate.
  // The documented import API avoids the CLI's unnecessary IPC server.
  execFileSync(process.execPath, ["--import", "tsx", "scripts/export-public-registry.ts", "--check"], {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}

const lapsedUndeclared = listUndeclaredLapsedClaims(publicRegistry, NOW);
if (lapsedUndeclared.length > 0) {
  const list = lapsedUndeclared.map((c) => c.slug + "/" + c.claimId + " (expired " + c.expiresAt + ")");
  console.warn(
    "verify-public-registry: " +
      lapsedUndeclared.length +
      " lapsed claim(s) without a declared claimState (rendered as unverified, not a build failure): " +
      list.join(", "),
  );
}

// (c) Expired and withheld by the gate: information only, never a failure.
const lapsedWithheld = publicRegistry.flatMap((r) =>
  r.claims
    .filter((c) => !isClaimPresentable(c, NOW))
    .map((c) => `${r.slug}/${c.id} (expired ${c.expiresAt})`),
);
// Burun Farkı is outside the gate until a founder decision: reported, never enforced.
const lapsedExempt = publicRegistry.flatMap((r) =>
  r.claims
    .filter((c) => isGateExempt(c) && c.expiresAt && isExpired(c.expiresAt, NOW))
    .map((c) => `${r.slug}/${c.id} (expired ${c.expiresAt})`),
);
if (lapsedExempt.length > 0) {
  console.log(
    `verify-public-registry: info — kapsam dışı (Burun Farkı): ${lapsedExempt.length} dolmuş claim kapıya tabi değil: ${lapsedExempt.join(", ")}`,
  );
}
if (lapsedWithheld.length > 0) {
  console.log(
    `verify-public-registry: info — ${lapsedWithheld.length} expired claim(s) withheld from present-tense surfaces: ${lapsedWithheld.join(", ")}`,
  );
}

// (b) Expiring soon: warn only, grouped by date.
const byDate = new Map<string, number>();
for (const e of listClaimsExpiringWithin(publicRegistry, NOW, EXPIRY_WARN_DAYS)) {
  byDate.set(e.expiresAt, (byDate.get(e.expiresAt) ?? 0) + 1);
}
for (const [date, n] of [...byDate].sort()) {
  console.warn(`verify-public-registry: warning — ${date}'de dolacak: ${n} claim (${EXPIRY_WARN_DAYS} gün içinde; build düşmez)`);
}

console.log(
  `verify-public-registry: OK — ${publicRegistry.length} products, ${caseStudies.length} case studies, 0 structural issues, generated artifact current.`,
);
