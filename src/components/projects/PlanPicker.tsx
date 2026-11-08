"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PlanCardView } from "@/components/projects/PlanCardView";
import {
  PLAN_DEMO_SELECT_EVENT,
  type PlanCard,
  type PlanIntent,
  type PlanLabels,
} from "@/components/projects/braavolabs-plan-demo-data";

/**
 * Selection interaction only. The content is server HTML (`fallback`, all three
 * cards) until hydration; then this swaps in a radiogroup plus the chosen card.
 * No network, no timers, no animation.
 *
 * `onSelect` and the non-bubbling `PLAN_DEMO_SELECT_EVENT` CustomEvent fire when
 * the visitor picks an intent (not for the default card). A selection is not a
 * completion. Local only, no identity; analytics sink: WEB-P1-03.
 */
export function PlanPicker({
  cards,
  labels,
  pickerLabel,
  announcePrefix,
  fallback,
  onSelect,
}: {
  cards: PlanCard[];
  labels: PlanLabels;
  pickerLabel: string;
  announcePrefix: string;
  fallback: ReactNode;
  onSelect?: (intent: PlanIntent) => void;
}) {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [announce, setAnnounce] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const radios = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => setReady(true), []);

  const select = useCallback(
    (next: number, focus: boolean) => {
      const card = cards[next];
      if (!card) return;
      if (focus) radios.current[next]?.focus();
      if (next === index) return;
      setIndex(next);
      setAnnounce(announcePrefix + ": " + card.label);
      onSelect?.(card.intent);
      root.current?.dispatchEvent(new CustomEvent(PLAN_DEMO_SELECT_EVENT, { bubbles: false, detail: { intent: card.intent } }));
    },
    [cards, index, announcePrefix, onSelect],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (e.key === fwd || e.key === "ArrowDown") next = (i + 1) % cards.length;
    else if (e.key === back || e.key === "ArrowUp") next = (i - 1 + cards.length) % cards.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = cards.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  };

  if (!ready) return <>{fallback}</>;
  const card = cards[index];

  return (
    <div ref={root} data-testid="plan-picker">
      <div role="radiogroup" aria-label={pickerLabel} className="flex flex-col sm:flex-row gap-3 mb-6">
        {cards.map((c, i) => {
          const on = i === index;
          return (
            <button
              key={c.intent}
              ref={(el) => {
                radios.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              data-intent={c.intent}
              onClick={() => select(i, false)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={
                "min-h-12 px-5 py-3 rounded-xl border-2 text-start font-grotesk text-[15.5px] leading-[1.4] text-ink-50 " +
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--yula-focus)] " +
                (on
                  ? "border-[color:var(--yula-focus)] bg-surface-raised font-semibold underline decoration-2 underline-offset-4"
                  : "border-[color:var(--yula-hairline-strong)] bg-transparent")
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite" data-testid="plan-announce">
        {announce}
      </p>
      {card ? <PlanCardView card={card} labels={labels} headingId="braavolabs-plan-card-title" /> : null}
    </div>
  );
}
