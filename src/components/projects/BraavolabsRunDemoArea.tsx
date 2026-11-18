"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  INITIAL_RUN,
  deriveRun,
  reduceRun,
  type RunStep,
  type StepId,
  type StepStatus,
} from "@/components/projects/braavolabs-run-trace";

/**
 * WEB-P2-01c: synthetic Braavolabs agent run trace. Everything is a made-up
 * example held in component state: no network, no storage, no timers beyond
 * one short "running" beat. It is not the real product screen and the numbers
 * say nothing about real cost or speed. Loaded lazily by the Lab grid only.
 */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--yula-focus)]";
const BTN = `inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--yula-hairline-strong)] px-5 text-[14px] text-ink-50 ${FOCUS}`;
const BADGE =
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] rtl:tracking-normal rtl:normal-case";

/** Colour is never the only signal: each status also has its own glyph and word. */
const STATUS_VIEW: Record<StepStatus, { glyph: string; tone: string }> = {
  completed: { glyph: "✓", tone: "text-[color:var(--yula-success)] border-[color:var(--yula-success)]" },
  running: { glyph: "◐", tone: "text-[color:var(--yula-focus)] border-[color:var(--yula-focus)]" },
  awaiting: { glyph: "‖", tone: "text-[color:var(--yula-warning)] border-[color:var(--yula-warning)]" },
  blocked: { glyph: "×", tone: "text-[color:var(--yula-danger)] border-[color:var(--yula-danger)]" },
  skipped: { glyph: "–", tone: "text-ink-300 border-[color:var(--yula-hairline-strong)]" },
  queued: { glyph: "○", tone: "text-ink-300 border-[color:var(--yula-hairline-strong)]" },
};
const DOT_TONE: Record<StepStatus, string> = {
  completed: "bg-[color:var(--yula-success)] border-[color:var(--yula-success)]",
  running: "bg-[color:var(--yula-focus)] border-[color:var(--yula-focus)] motion-safe:animate-pulse",
  awaiting: "bg-transparent border-[color:var(--yula-warning)] border-dashed",
  blocked: "bg-[color:var(--yula-danger)] border-[color:var(--yula-danger)]",
  skipped: "bg-transparent border-[color:var(--yula-hairline-strong)]",
  queued: "bg-transparent border-[color:var(--yula-hairline-strong)]",
};

/** Which message fields vary with the step status (the rest are fixed per step). */
const VARIANT: Record<StepId, { summary: boolean; output: boolean }> = {
  plan: { summary: false, output: false },
  tool: { summary: false, output: false },
  draft: { summary: false, output: false },
  gate: { summary: true, output: true },
  done: { summary: true, output: true },
};
const RUNNING_BEAT_MS = 1200;

function StatusBadge({ status, label }: { status: StepStatus; label: string }) {
  const v = STATUS_VIEW[status];
  return (
    <span className={`${BADGE} ${v.tone}`} data-testid={`run-status-${status}`}>
      <span aria-hidden="true">{v.glyph}</span>
      {label}
    </span>
  );
}

export function BraavolabsRunDemoArea() {
  const t = useTranslations("braavolabsRunDemo");
  const locale = useLocale();
  const uid = useId();
  const [state, dispatch] = useReducer(reduceRun, INITIAL_RUN);
  const [open, setOpen] = useState<ReadonlySet<StepId>>(new Set());
  const [announce, setAnnounce] = useState("");
  const gateButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const run = useMemo(() => deriveRun(state), [state]);
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }), [locale]);
  const cost = (cents: number) => money.format(cents / 100);
  const secs = (n: number) => t("seconds", { n });
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const doneCost = cost(deriveRun({ gate: "approved", finished: true }).totalCents);
  const approve = () => {
    clear();
    dispatch({ type: "approve" });
    gateButton.current?.focus();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      dispatch({ type: "finish" });
      setAnnounce(t("announceDone", { cost: doneCost }));
    } else {
      setAnnounce(t("announceApproved"));
      timer.current = window.setTimeout(() => {
        timer.current = null;
        dispatch({ type: "finish" });
        setAnnounce(t("announceDone", { cost: doneCost }));
      }, RUNNING_BEAT_MS);
    }
  };
  const reject = () => {
    clear();
    dispatch({ type: "reject" });
    gateButton.current?.focus();
    setAnnounce(t("announceRejected"));
  };
  const reset = () => {
    clear();
    dispatch({ type: "reset" });
    setAnnounce(t("announceReset"));
  };
  const toggle = (id: StepId) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const field = (step: RunStep, f: "summary" | "output") =>
    t(VARIANT[step.id][f] ? `steps.${step.id}.${f}.${step.status}` : `steps.${step.id}.${f}`);

  return (
    <section
      className="pb-8"
      aria-labelledby={`${uid}-h`}
      data-testid="braavolabs-run-demo"
      lang={locale}
    >
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 rtl:tracking-normal rtl:normal-case">
        {t("kicker")}
      </p>
      <h2
        id={`${uid}-h`}
        className="mb-6 max-w-[24ch] text-pretty font-display text-[clamp(28px,3.6vw,52px)] font-light leading-[1.08] tracking-tight"
      >
        {t("title")}
      </h2>
      <p className="mb-6 max-w-[60ch] text-[15.5px] leading-[1.7] text-ink-300">{t("intro")}</p>
      <p
        className="mb-8 max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-3 text-[15.5px] leading-[1.6] text-ink-50"
        data-testid="run-note"
      >
        {t("note")}
      </p>
      <p
        data-testid="run-badge"
        className="mb-6 inline-flex w-fit rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300 rtl:tracking-normal rtl:normal-case"
      >
        {t("badge")}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ol aria-label={t("timelineLabel")} className="m-0 list-none p-0" data-testid="run-timeline">
          {run.steps.map((step, i) => {
            const isOpen = open.has(step.id);
            const btnId = `${uid}-b-${step.id}`;
            const panelId = `${uid}-p-${step.id}`;
            const last = i === run.steps.length - 1;
            const statusLabel = t(`status.${step.status}`);
            return (
              <li key={step.id} className="relative ps-10 pb-4" data-testid={`run-step-${step.id}`} data-status={step.status}>
                {last ? null : (
                  <span aria-hidden="true" className="absolute bottom-0 start-[9px] top-8 w-px bg-[color:var(--yula-hairline-strong)]" />
                )}
                <span
                  aria-hidden="true"
                  className={`absolute start-0 top-6 h-[19px] w-[19px] rounded-full border-2 ${DOT_TONE[step.status]}`}
                />
                <div className="rounded-2xl border border-[color:var(--yula-hairline)] bg-[color:var(--yula-surface-raised)]">
                  <h3 className="m-0">
                    <button
                      type="button"
                      id={btnId}
                      ref={step.id === "gate" ? gateButton : undefined}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      data-testid={`run-toggle-${step.id}`}
                      onClick={() => toggle(step.id)}
                      className={`block w-full cursor-pointer rounded-2xl p-4 text-start ${FOCUS}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[14px] text-ink-50">{t(`steps.${step.id}.name`)}</span>
                          <StatusBadge status={step.status} label={statusLabel} />
                        </span>
                        <span className="flex shrink-0 items-center gap-2 font-mono text-[13px] text-ink-100">
                          <span data-testid={`run-cost-${step.id}`}>{cost(step.cents)}</span>
                          <span aria-hidden="true" className={`inline-block transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}>
                            ⌄
                          </span>
                        </span>
                      </span>
                      <span className="mt-2 block text-[15px] leading-[1.5] text-ink-50" data-testid={`run-summary-${step.id}`}>
                        {field(step, "summary")}
                      </span>
                      <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-300 rtl:tracking-normal rtl:normal-case">
                        {step.seconds !== null ? secs(step.seconds) : step.status === "awaiting" ? t("waiting") : "—"}
                      </span>
                    </button>
                  </h3>
                  {step.id === "gate" && step.status === "awaiting" ? (
                    <div className="flex flex-wrap items-center gap-3 px-4 pb-4" data-testid="run-gate-actions">
                      <button type="button" className={BTN} data-testid="run-approve" onClick={approve}>
                        {t("approve")}
                      </button>
                      <button type="button" className={BTN} data-testid="run-reject" onClick={reject}>
                        {t("reject")}
                      </button>
                      <p className="m-0 text-[13.5px] leading-[1.5] text-ink-300">{t("gateHint")}</p>
                    </div>
                  ) : null}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    hidden={!isOpen}
                    className="border-t border-[color:var(--yula-hairline)] px-4 py-4"
                    data-testid={`run-detail-${step.id}`}
                  >
                    {isOpen ? <StepDetail step={step} t={t} cost={cost} /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <aside
          aria-labelledby={`${uid}-m`}
          className="h-fit rounded-2xl border border-[color:var(--yula-hairline)] bg-[color:var(--yula-surface-raised)] p-5"
          data-testid="run-meta"
        >
          <h3 id={`${uid}-m`} className="m-0 mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300 rtl:tracking-normal rtl:normal-case">
            {t("metaHeading")}
          </h3>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 text-[14px]">
            <dt className="text-ink-300">{t("statusLabel")}</dt>
            <dd className="m-0 text-end" data-testid="run-meta-status">
              <StatusBadge status={run.status} label={t(`status.${run.status}`)} />
            </dd>
            <dt className="text-ink-300">{t("runIdLabel")}</dt>
            <dd className="m-0 break-all text-end font-mono text-[12.5px] text-ink-50" dir="ltr">
              demo-run-0001
            </dd>
            <dt className="text-ink-300">{t("pipelineLabel")}</dt>
            <dd className="m-0 text-end text-ink-50">{t("pipelineValue")}</dd>
            <dt className="text-ink-300">{t("stepsLabel")}</dt>
            <dd className="m-0 text-end font-mono text-ink-50" data-testid="run-meta-steps">
              {t("stepsOf", { done: run.doneCount, total: run.steps.length })}
            </dd>
            <dt className="text-ink-300">{t("durationLabel")}</dt>
            <dd className="m-0 text-end font-mono text-ink-50" data-testid="run-meta-duration">
              {secs(run.totalSeconds)}
            </dd>
            <dt className="text-ink-300">{t("costLabel")}</dt>
            <dd className="m-0 text-end font-mono text-ink-50" data-testid="run-meta-cost">
              {cost(run.totalCents)}
            </dd>
          </dl>
          <button type="button" className={`${BTN} mt-5 w-full`} data-testid="run-reset" onClick={reset}>
            {t("reset")}
          </button>
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="run-live">
        {announce}
      </p>
    </section>
  );
}

function StepDetail({
  step,
  t,
  cost,
}: {
  step: RunStep;
  t: ReturnType<typeof useTranslations>;
  cost: (cents: number) => string;
}) {
  const label = "m-0 mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-300 rtl:tracking-normal rtl:normal-case";
  const sample = "m-0 whitespace-pre-wrap break-words rounded-lg bg-[color:var(--yula-surface-inset)] px-3 py-2 font-mono text-[13px] leading-[1.55] text-ink-50";
  const out = VARIANT[step.id].output ? `steps.${step.id}.output.${step.status}` : `steps.${step.id}.output`;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={label}>{t("detailTool")}</p>
        <p className="m-0 text-[14.5px] leading-[1.55] text-ink-50">{t(`steps.${step.id}.tool`)}</p>
      </div>
      <div>
        <p className={label}>{t("detailInput")}</p>
        <p className={sample}>{t(`steps.${step.id}.input`)}</p>
      </div>
      <div>
        <p className={label}>{t("detailOutput")}</p>
        <p className={sample}>{t(out)}</p>
      </div>
      <div>
        <p className={label}>{t("detailCost")}</p>
        <dl className="m-0 grid max-w-[28rem] grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-ink-300">{t("costModelIn")}</dt>
          <dd className="m-0 text-end font-mono text-ink-50">{cost(step.parts.modelIn)}</dd>
          <dt className="text-ink-300">{t("costModelOut")}</dt>
          <dd className="m-0 text-end font-mono text-ink-50">{cost(step.parts.modelOut)}</dd>
          <dt className="text-ink-300">{t("costTool")}</dt>
          <dd className="m-0 text-end font-mono text-ink-50">{cost(step.parts.tool)}</dd>
          <dt className="border-t border-[color:var(--yula-hairline)] pt-1 text-ink-50">{t("costTotal")}</dt>
          <dd className="m-0 border-t border-[color:var(--yula-hairline)] pt-1 text-end font-mono text-ink-50">{cost(step.cents)}</dd>
        </dl>
      </div>
    </div>
  );
}
