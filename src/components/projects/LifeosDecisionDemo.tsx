"use client";

import { useEffect, useRef, useState } from "react";
import type { LifeosDemoText } from "@/components/projects/LifeosDemoArea";
import { formatReminder, planReminder, type ReminderOffset } from "@/components/projects/lifeos-reminder-schedule";

/**
 * WEB-P1-01 synthetic decision and reminder try-out. Everything is a fixed
 * made-up example held in component state only: no storage, no network, no
 * notification permission, no microphone or camera. "Reminder set" is a
 * message on this page; nothing is scheduled anywhere.
 */
const CARD_KEYS = ["card1", "card2", "card3"] as const;
const OFFSETS: ReminderOffset[] = ["day", "week"];
const WHEN_KEY = { day: "whenDay", week: "whenWeek" } as const;
const MAX_CUSTOM = 40;
/** Zero-width and bidi control characters are removed from the typed name. */
export const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;
export const cleanName = (s: string) => s.replace(INVISIBLE, "").trim();

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--yula-focus)]";
const OPTION =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-[color:var(--yula-hairline-strong)] px-4 py-3 text-[15.5px] leading-[1.4] text-ink-50 has-[:checked]:border-[color:var(--yula-focus)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--yula-focus)]";

type Props = {
  text: LifeosDemoText;
  lang: "tr" | "en";
  /** Test seams: fixed clock and zone. Defaults read the visitor's own. */
  now?: () => Date;
  timeZone?: string;
};

export default function LifeosDecisionDemo({ text, lang, now = () => new Date(), timeZone }: Props) {
  const [card, setCard] = useState<(typeof CARD_KEYS)[number]>("card1");
  const [custom, setCustom] = useState("");
  const [offset, setOffset] = useState<ReminderOffset>("day");
  const [done, setDone] = useState<{ title: string; when: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [previewBase, setPreviewBase] = useState<Date | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRadio = useRef<HTMLInputElement>(null);
  const zone = useRef<string>(timeZone ?? "UTC");
  const wasDone = useRef(false);

  useEffect(() => {
    if (!timeZone) zone.current = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setPreviewBase(now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (done) heading.current?.focus();
    else if (wasDone.current) firstRadio.current?.focus();
    wasDone.current = !!done;
  }, [done]);

  const title = cleanName(custom) || text[card];
  const whenOf = (o: ReminderOffset, base: Date) => formatReminder(planReminder(base, o, zone.current), lang, zone.current);

  const set = () => {
    const when = whenOf(offset, now());
    setDone({ title, when });
    setAnnounce(fill(text.announceDone, { title, when }));
  };
  const restart = () => {
    setDone(null);
    setAnnounce("");
    setPreviewBase(now());
  };

  return (
    <div data-testid="lifeos-demo-body" className="flex flex-col gap-6">
      <p
        data-testid="lifeos-demo-badge"
        className="inline-flex w-fit rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300"
      >
        {text.badge}
      </p>

      {!done ? (
        <div className="flex flex-col gap-6" data-testid="lifeos-form">
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-3 text-[15.5px] text-ink-300">{text.cardsLegend}</legend>
            {CARD_KEYS.map((k, i) => (
              <label key={k} className={OPTION}>
                <input
                  ref={i === 0 ? firstRadio : undefined}
                  type="radio"
                  name="lifeos-card"
                  value={k}
                  checked={card === k}
                  onChange={() => setCard(k)}
                  className="h-5 w-5 accent-[color:var(--yula-focus)]"
                />
                {text[k]}
              </label>
            ))}
          </fieldset>

          <div className="flex max-w-[60ch] flex-col gap-2">
            <label htmlFor="lifeos-custom" className="text-[15.5px] text-ink-300">{text.customLabel}</label>
            <input
              id="lifeos-custom"
              type="text"
              value={custom}
              maxLength={MAX_CUSTOM}
              autoComplete="off"
              aria-describedby="lifeos-custom-hint"
              onChange={(e) => setCustom(e.target.value)}
              className={"min-h-12 w-full rounded-xl border-2 border-[color:var(--yula-hairline-strong)] bg-transparent px-4 py-3 text-[15.5px] text-ink-50 " + FOCUS}
            />
            <p id="lifeos-custom-hint" className="text-[14.5px] leading-[1.6] text-ink-300">{text.customHint}</p>
          </div>

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-3 text-[15.5px] text-ink-300">{text.whenLegend}</legend>
            {OFFSETS.map((o) => (
              <label key={o} className={OPTION}>
                <input
                  type="radio"
                  name="lifeos-when"
                  value={o}
                  checked={offset === o}
                  onChange={() => setOffset(o)}
                  className="h-5 w-5 accent-[color:var(--yula-focus)]"
                />
                {text[WHEN_KEY[o]]}
              </label>
            ))}
          </fieldset>

          <p data-testid="lifeos-preview" className="max-w-[60ch] text-[17px] text-ink-50">
            {previewBase ? fill(text.preview, { when: whenOf(offset, previewBase) }) : ""}
          </p>

          <button
            type="button"
            onClick={set}
            data-testid="lifeos-set"
            className={"min-h-12 w-fit rounded-xl border-2 border-[color:var(--yula-hairline-strong)] bg-transparent px-5 py-3 text-start font-grotesk text-[15.5px] leading-[1.4] text-ink-50 " + FOCUS}
          >
            {text.setButton}
          </button>
        </div>
      ) : (
        <div data-testid="lifeos-done" className="max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-4">
          <h3
            ref={heading}
            tabIndex={-1}
            className={"mb-3 font-display text-[22px] text-ink-50 outline-none " + FOCUS}
          >
            {text.doneHeading}
          </h3>
          <p data-testid="lifeos-done-body" className="mb-4 text-[15.5px] leading-[1.6] text-ink-50">
            {fill(text.doneBody, { title: done.title, when: done.when })}
          </p>
          <button
            type="button"
            onClick={restart}
            data-testid="lifeos-restart"
            className={"min-h-12 rounded-xl border-2 border-[color:var(--yula-hairline-strong)] bg-transparent px-5 py-3 text-start font-grotesk text-[15.5px] leading-[1.4] text-ink-50 " + FOCUS}
          >
            {text.restart}
          </button>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite" data-testid="lifeos-announce">{announce}</p>
    </div>
  );
}
