import { localized, text } from "@/lib/localized";
import type { EvidenceKind, Locale } from "@/lib/types";

const EVIDENCE_LABELS: Record<EvidenceKind, { tr: string; en: string }> = {
  measured: { tr: "ölçüldü", en: "measured" },
  "source-code-verified": { tr: "kaynak kodda doğrulandı", en: "verified in source code" },
  "self-reported": { tr: "kendi beyanımız", en: "self-reported" },
  "third-party-verified": { tr: "üçüncü tarafça doğrulandı", en: "third-party verified" },
};

export function evidenceKindLabel(kind: EvidenceKind, locale: Locale): string {
  return localized(EVIDENCE_LABELS[kind], locale);
}

/**
 * Provenance for one public assertion: how it was established, when it was
 * last confirmed, and where a reader can go check.
 *
 * The evidence kind is stated in WORDS, never by colour alone (roadmap
 * §1.4). "Measured" and "self-reported" are a real distinction — if the
 * only thing separating them is a hue, a screen-reader user, a colourblind
 * reader and a printed page all lose it.
 */
export function SourceStamp({
  evidenceKind,
  verifiedAt,
  source,
  scope,
  locale,
  expiredOn,
}: {
  evidenceKind: EvidenceKind;
  verifiedAt: string;
  source: string;
  scope?: string;
  locale: Locale;
  /** Set when the verification window has closed. */
  expiredOn?: string;
}) {
  const external = /^https?:\/\//.test(source);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.1em] uppercase text-ink-300">
      <span>{evidenceKindLabel(evidenceKind, locale)}</span>
      <span aria-hidden>·</span>
      <span>
        {text(locale, "doğrulama", "verified")} {verifiedAt}
      </span>
      {expiredOn ? (
        <>
          <span aria-hidden>·</span>
          {/* Stated in words, not just styling: this is the difference
              between "we checked" and "we have not checked lately". */}
          <span className="text-amber-300/90 normal-case tracking-normal">
            {text(locale, "yeniden doğrulanmalı — süre {expiredOn} tarihinde doldu", "needs re-verification — window closed {expiredOn}", { "expiredOn": expiredOn })}
          </span>
        </>
      ) : null}
      {external ? (
        <>
          <span aria-hidden>·</span>
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink-100 focusable"
          >
            {text(locale, "kaynak", "source")}
          </a>
        </>
      ) : null}
      {/* Founder decision K9 (2026-10-31): an internal source (a repo path or
          a dated internal note) is not shown at all. A public reader cannot
          open it, and the path itself is internal detail; the evidence kind
          and the verification date above carry the provenance. */}
      {scope ? (
        <>
          <span aria-hidden>·</span>
          <span className="normal-case tracking-normal text-ink-300 [overflow-wrap:anywhere]">
            {scope}
          </span>
        </>
      ) : null}
    </div>
  );
}
