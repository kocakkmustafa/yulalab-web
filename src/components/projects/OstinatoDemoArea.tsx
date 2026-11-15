import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

/**
 * WEB-P1-02, server side. Rendered by ProductPage only when
 * OSTINATO_DEMO_ENABLED=1. The interactive part is a dynamic import, so with
 * the flag off nothing here reaches the page's JS. Copy exists in tr and en;
 * the other twelve locales show the English copy honestly marked lang="en".
 */
const OstinatoRhythmDemo = dynamic(() => import("@/components/projects/OstinatoRhythmDemo"));

export const OSTINATO_DEMO_TEXT_KEYS = [
  "kicker", "title", "intro", "note", "start", "tapButton", "tapHint", "countIn", "running",
  "perfect", "good", "miss", "early", "late", "last", "accuracy", "summary", "resultHeading",
  "announceDone", "restart", "micLabel", "micOn", "micNote",
] as const;
export type OstinatoDemoText = Record<(typeof OSTINATO_DEMO_TEXT_KEYS)[number], string>;

export function OstinatoDemoArea() {
  const t = useTranslations("ostinatoDemo");
  const locale = useLocale();
  const native = locale === "tr" || locale === "en";
  const text = Object.fromEntries(OSTINATO_DEMO_TEXT_KEYS.map((k) => [k, t.raw(k) as string])) as OstinatoDemoText;
  return (
    <section
      className="pb-24"
      aria-labelledby="ostinato-demo-heading"
      data-testid="ostinato-rhythm-demo"
      lang={locale === "tr" ? "tr" : "en"}
      dir={native ? undefined : "ltr"}
    >
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300 mb-4">{text.kicker}</p>
      <h2
        id="ostinato-demo-heading"
        className="font-display font-light text-[clamp(28px,3.6vw,52px)] leading-[1.08] tracking-tight max-w-[24ch] mb-6 text-pretty"
      >
        {text.title}
      </h2>
      <p className="max-w-[60ch] text-[15.5px] leading-[1.7] text-ink-300 mb-6">{text.intro}</p>
      <p className="max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-3 mb-8 text-[15.5px] leading-[1.6] text-ink-50">
        {text.note}
      </p>
      <OstinatoRhythmDemo text={text} />
    </section>
  );
}
