import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

/**
 * WEB-P1-01, server side. Rendered by ProductPage only when
 * LIFEOS_DEMO_ENABLED=1. The interactive part is a dynamic import, so with
 * the flag off nothing here reaches the page's JS. Copy is translated for
 * all fourteen locales; the section carries the page locale as its lang.
 */
const LifeosDecisionDemo = dynamic(() => import("@/components/projects/LifeosDecisionDemo"));

export const LIFEOS_DEMO_TEXT_KEYS = [
  "kicker", "title", "intro", "note", "badge", "cardsLegend", "card1", "card2", "card3",
  "customLabel", "customHint", "whenLegend", "whenDay", "whenWeek", "preview", "setButton",
  "doneHeading", "doneBody", "announceDone", "restart",
] as const;
export type LifeosDemoText = Record<(typeof LIFEOS_DEMO_TEXT_KEYS)[number], string>;

export function LifeosDemoArea() {
  const t = useTranslations("lifeosDemo");
  const locale = useLocale();
  const text = Object.fromEntries(LIFEOS_DEMO_TEXT_KEYS.map((k) => [k, t.raw(k) as string])) as LifeosDemoText;
  return (
    <section
      className="pb-24"
      aria-labelledby="lifeos-demo-heading"
      data-testid="lifeos-decision-demo"
      lang={locale}
    >
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300 mb-4">{text.kicker}</p>
      <h2
        id="lifeos-demo-heading"
        className="font-display font-light text-[clamp(28px,3.6vw,52px)] leading-[1.08] tracking-tight max-w-[24ch] mb-6 text-pretty"
      >
        {text.title}
      </h2>
      <p className="max-w-[60ch] text-[15.5px] leading-[1.7] text-ink-300 mb-6">{text.intro}</p>
      <p className="max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-3 mb-8 text-[15.5px] leading-[1.6] text-ink-50">
        {text.note}
      </p>
      <LifeosDecisionDemo text={text} lang={locale === "tr" ? "tr" : "en"} />
    </section>
  );
}
