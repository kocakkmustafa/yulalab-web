import { useLocale, useTranslations } from "next-intl";
import { PlanCardView } from "@/components/projects/PlanCardView";
import { PlanPicker } from "@/components/projects/PlanPicker";
import { PLAN_INTENTS, buildPlanCard, type PlanLabels } from "@/components/projects/braavolabs-plan-demo-data";

/**
 * WEB-P0-05. Server component: heading, disclaimer and (without JS) the static
 * summary of all three sample cards live in server HTML; only the selection is
 * a client island. Catalogue text exists in tr and en; the other twelve
 * locales show the English catalogue honestly marked `lang="en"` (and
 * `dir="ltr"`), never an invented translation.
 */
export function BraavolabsPlanDemo() {
  const t = useTranslations("braavolabsDemo");
  const locale = useLocale();
  const native = locale === "tr" || locale === "en";
  const lang = locale === "tr" ? "tr" : "en";
  const text = (key: string) => t(key as never) as string;
  const cards = PLAN_INTENTS.map((i) => buildPlanCard(i, text));
  const labels: PlanLabels = {
    intent: text("labels.intent"),
    example: text("labels.example"),
    note: text("labels.note"),
    steps: text("labels.steps"),
    approvals: text("labels.approvals"),
    risk: text("labels.risk"),
    output: text("labels.output"),
  };

  return (
    <section
      className="pb-24"
      aria-labelledby="braavolabs-demo-heading"
      data-testid="braavolabs-plan-demo"
      lang={lang}
      dir={native ? undefined : "ltr"}
    >
      <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300 mb-4">{text("kicker")}</p>
      <h2
        id="braavolabs-demo-heading"
        className="font-display font-light text-[clamp(28px,3.6vw,52px)] leading-[1.08] tracking-tight max-w-[24ch] mb-6 text-pretty"
      >
        {text("title")}
      </h2>
      <p className="max-w-[60ch] text-[15.5px] leading-[1.7] text-ink-300 mb-6">{text("intro")}</p>
      <p
        data-testid="plan-disclaimer"
        className="max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-3 mb-8 text-[15.5px] leading-[1.6] text-ink-50"
      >
        {text("disclaimer")}
      </p>
      <PlanPicker
        cards={cards}
        labels={labels}
        pickerLabel={text("pickerLabel")}
        announcePrefix={text("announce")}
        fallback={
          <div data-testid="plan-static" className="grid grid-cols-1 gap-6">
            {cards.map((c) => (
              <PlanCardView key={c.intent} card={c} labels={labels} headingId={`braavolabs-plan-static-${c.intent}`} />
            ))}
          </div>
        }
      />
    </section>
  );
}
