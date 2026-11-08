import type { PlanCard, PlanLabels } from "@/components/projects/braavolabs-plan-demo-data";

const LABEL = "font-mono text-[11px] tracking-[0.16em] uppercase text-ink-300 mb-2";
const LIST = "list-decimal ps-5 space-y-2 text-[15.5px] leading-[1.6] text-ink-100 marker:text-ink-300";

/** Presentational and static: rendered on the server (all three cards) and by the picker (one card). */
export function PlanCardView({ card, labels, headingId }: { card: PlanCard; labels: PlanLabels; headingId: string }) {
  return (
    <article
      aria-labelledby={headingId}
      data-testid="plan-card"
      data-intent={card.intent}
      className="rounded-2xl border border-[color:var(--yula-hairline-strong)] bg-surface-inset p-5 sm:p-7"
    >
      <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-300 mb-3">{labels.example}</p>
      <h3 id={headingId} className="font-grotesk text-[19px] leading-[1.35] text-ink-50 mb-1">
        {card.label}
      </h3>
      <p className="text-[15.5px] leading-[1.6] text-ink-300 mb-6">
        <span className="sr-only">{labels.intent}: </span>
        {card.prompt}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <div>
          <h4 className={LABEL}>{labels.steps}</h4>
          <ol role="list" aria-label={labels.steps} className={LIST}>
            {card.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className={LABEL}>{labels.approvals}</h4>
          <ul role="list" aria-label={labels.approvals} className="list-disc ps-5 space-y-2 text-[15.5px] leading-[1.6] text-ink-100 marker:text-ink-300">
            {card.approvals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={LABEL}>{labels.risk}</h4>
          <p className="text-[15.5px] leading-[1.6] text-ink-100">
            <strong className="font-semibold">{card.riskLabel}</strong>
            <span aria-hidden> · </span>
            <span className="text-ink-300">{card.riskNote}</span>
          </p>
        </div>
        <div>
          <h4 className={LABEL}>{labels.output}</h4>
          <p className="text-[15.5px] leading-[1.6] text-ink-100">{card.output}</p>
        </div>
      </div>
      <p data-testid="plan-card-note" className="mt-6 border-t border-[color:var(--yula-hairline)] pt-4 text-[15px] leading-[1.6] text-ink-300">
        {labels.note}
      </p>
    </article>
  );
}
