import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { notes } from "@/data/notes";
import { LAB_FIELDS, pickNoteText, type LabField, type NoteLang } from "./scene5-lab";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/**
 * The one design decision told here: a real record in the repository, with a
 * real date and a link to its public summary. The ADR is ACCEPTED (2026-11-08); its
 * implementation is reviewed separately, and the section says so. Its text lives in the `home.scene5.decision.*`
 * catalogue keys; hypothesis is left unwritten because the source does not
 * state one. See docs/yula-execution/scene-5-evidence.md.
 */
const DECISION = {
  slug: "adr-003",
  date: "2026-11-08",
  written: ["question", "did", "learned", "next"] as readonly LabField[],
} as const;

function Fields({
  t,
  written,
}: {
  t: Translate;
  written: Partial<Record<LabField, { text: string; lang?: NoteLang }>>;
}) {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
      {LAB_FIELDS.map((field) => {
        const value = written[field];
        return (
          <div key={field} data-scene5-field={field} className="contents">
            <dt className="font-mono text-[10px] tracking-widest uppercase text-ink-300 sm:pt-1">
              {t(`scene5.fields.${field}`)}
            </dt>
            <dd
              data-scene5-empty={value ? undefined : "true"}
              lang={value?.lang}
              className={value ? "text-base text-ink-50" : "text-base italic text-ink-300"}
            >
              {value ? value.text : t("scene5.empty")}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Body of scene 5 (WEB-P0-03f): the living lab. Real notes are read from
 * `src/data/notes.ts` (title, date, body) and set into the question →
 * hypothesis → what we did → what we learned → next test template. A note
 * carries only a body, so it fills "what we did"; the other four fields say
 * "not written yet" instead of being invented. One real design record
 * (ADR-003, accepted) stands beside them. Server rendered, no script, no
 * animation, no new dependency. Each note links to its card on /notes.
 */
export function Scene5Lab({ t, locale }: { t: Translate; locale: string }) {
  const want: NoteLang = locale === "tr" ? "tr" : "en";
  const decisionWritten = Object.fromEntries(
    DECISION.written.map((f) => [f, { text: t(`scene5.decision.${f}`) }]),
  ) as Partial<Record<LabField, { text: string }>>;

  return (
    <div data-scene5-lab="true" className="mt-12">
      <ul role="list" aria-label={t("scene5.listLabel")} className="grid gap-4">
        <li
          data-scene5-entry={DECISION.slug}
          data-scene5-kind="decision"
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full border border-dashed border-ink-50/30 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase text-ink-300">
              {t("scene5.kindDecision")}
            </span>
            <time dateTime={DECISION.date} className="font-mono text-[11px] tracking-widest text-ink-300">
              {DECISION.date}
            </time>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold text-ink-50">
            {t("scene5.decision.title")}
          </h3>
          <Fields t={t} written={decisionWritten} />
          <p data-scene5-status="accepted" className="mt-4 text-sm text-ink-200">
            {t("scene5.decision.status")}
          </p>
          <p
            data-scene5-source={DECISION.slug}
            className="mt-2 font-mono text-[10px] tracking-widest uppercase text-ink-300 [overflow-wrap:anywhere]"
          >
            {t("scene5.sourceLabel")}: <a
              href={`${localePath(locale, "/transparency")}#${DECISION.slug}`}
              className="focusable normal-case tracking-normal underline underline-offset-4 hover:text-ink-200"
            >
              ADR-003
            </a>
            <span aria-hidden="true">{" · "}</span>
            {t("scene5.decision.sourceNote")}
            <span aria-hidden="true">{" · "}</span>
            {t("scene5.decision.sourceLang")}
          </p>
        </li>

        {notes.filter((note) => note.kind === "changelog").map((note) => {
          const title = pickNoteText(note.title, want);
          const body = pickNoteText(note.body, want);
          const missing = [
            { part: "scene5.partTitle", p: title },
            { part: "scene5.partBody", p: body },
          ].filter(({ p }) => p.written && !p.translated);
          return (
            <li
              key={note.slug}
              data-scene5-entry={note.slug}
              data-scene5-kind="note"
              className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-ink-50/40 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase text-ink-50">
                  {t("scene5.kindNote")}
                </span>
                <time dateTime={note.date} className="font-mono text-[11px] tracking-widest text-ink-300">
                  {note.date}
                </time>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink-50">
                {title.written ? (
                  <a
                    href={`${localePath(locale, "/notes")}#${note.slug}`}
                    lang={title.lang === want ? undefined : title.lang}
                    data-scene5-note-link={note.slug}
                    className="focusable underline underline-offset-4 hover:text-ink-200"
                  >
                    {title.text}
                  </a>
                ) : (
                  <span data-scene5-empty="true" className="italic text-ink-300">
                    {t("scene5.empty")}
                  </span>
                )}
              </h3>
              {missing.map(({ part, p }) => (
                <p key={part} data-scene5-no-translation="true" className="mt-2 text-sm text-ink-200">
                  {t(p.lang === "tr" ? "scene5.onlyTr" : "scene5.onlyEn", { part: t(part) })}
                </p>
              ))}
              <Fields
                t={t}
                written={body.written ? { did: { text: body.text, lang: body.lang === want ? undefined : body.lang } } : {}}
              />
              <p
                data-scene5-source={note.slug}
                className="mt-4 font-mono text-[10px] tracking-widest uppercase text-ink-300 [overflow-wrap:anywhere]"
              >
                {t("scene5.sourceLabel")}: <a
                  href={`${localePath(locale, "/notes")}#${note.slug}`}
                  className="focusable normal-case tracking-normal underline underline-offset-4 hover:text-ink-200"
                >
                  {t("scene5.kindNote")}
                </a>
                <span aria-hidden="true">{" · "}</span>
                {t("scene5.noteId", { slug: note.slug })}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-6">
        <a
          href={localePath(locale, "/notes")}
          data-scene5-all-notes="true"
          className="focusable inline-flex min-h-[44px] items-center text-base text-ink-50 underline underline-offset-4 hover:text-ink-200"
        >
          {t("scene5.allNotes")}
        </a>
      </p>
      <p className="mt-2 max-w-[62ch] text-xs text-ink-300">{t("scene5.note")}</p>
    </div>
  );
}
