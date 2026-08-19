import type { EvidenceKind } from "@/lib/types";

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
  locale: "tr" | "en";
  /** Set when the verification window has closed. */
  expiredOn?: string;
}) {
  const isTR = locale === "tr";
  const KIND: Record<EvidenceKind, { tr: string; en: string }> = {
    measured: { tr: "ölçüldü", en: "measured" },
    "source-code-verified": { tr: "kaynak kodda doğrulandı", en: "verified in source code" },
    "self-reported": { tr: "kendi beyanımız", en: "self-reported" },
    "third-party-verified": { tr: "üçüncü tarafça doğrulandı", en: "third-party verified" },
  };

  const external = /^https?:\/\//.test(source);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.1em] uppercase text-ink-400">
      <span>{KIND[evidenceKind][isTR ? "tr" : "en"]}</span>
      <span aria-hidden>·</span>
      <span>
        {isTR ? "doğrulama" : "verified"} {verifiedAt}
      </span>
      {expiredOn ? (
        <>
          <span aria-hidden>·</span>
          {/* Stated in words, not just styling: this is the difference
              between "we checked" and "we have not checked lately". */}
          <span className="text-amber-300/90 normal-case tracking-normal">
            {isTR
              ? `yeniden doğrulanmalı — süre ${expiredOn} tarihinde doldu`
              : `needs re-verification — window closed ${expiredOn}`}
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
            {isTR ? "kaynak" : "source"}
          </a>
        </>
      ) : (
        <>
          <span aria-hidden>·</span>
          {/* Most sources here are repo paths or dated internal notes, which
              a public reader cannot open. Rendering one under the word
              "source" invites them to go check something they have no access
              to — provenance theatre. Naming it an internal record keeps the
              provenance and drops the false invitation. */}
          <span className="normal-case tracking-normal text-ink-400/80">
            {isTR ? "iç kayıt" : "internal record"}: {source}
          </span>
        </>
      )}
      {scope ? (
        <>
          <span aria-hidden>·</span>
          <span className="normal-case tracking-normal text-ink-400/80">{scope}</span>
        </>
      ) : null}
    </div>
  );
}
