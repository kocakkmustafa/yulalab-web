import type { PrototypeCopy } from "./copy";
import type { BadgeKind } from "./universe-core";

/**
 * Status badge for the prototype (founder decision 2026-11-09: "Evet, rozet
 * ekle" — live and beta get a badge too). A flat surface, text plus a shape
 * glyph, so colour alone never carries the meaning. Replaces StatusPill only
 * inside the prototype; StatusPill itself is untouched.
 */
const GLYPH: Record<BadgeKind, string> = { live: "●", beta: "◐", soon: "○", archived: "–" };

export function PrototypeStatusBadge({ kind, copy }: { kind: BadgeKind; copy: PrototypeCopy }) {
  return (
    <span
      title={copy.badgeHint[kind]}
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-ink-850 px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase text-ink-100"
    >
      <span aria-hidden="true">{GLYPH[kind]}</span>
      {copy.badge[kind]}
      <span className="sr-only"> — {copy.badgeHint[kind]}</span>
    </span>
  );
}
