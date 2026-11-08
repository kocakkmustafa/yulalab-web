/**
 * WEB-P0-05 — Braavolabs deterministic plan card (data + pure selection).
 *
 * Three fixed sample intents map to three fixed cards. There is no free-text
 * input, no network, no server and no model call: the card is a pure function
 * of the intent key and the message catalogue, so the same intent always
 * yields the same card.
 *
 * Telemetry: none. `PLAN_DEMO_EVENT` is a local, in-page CustomEvent (no
 * identity, no network). The analytics sink for it is WEB-P1-03; until that
 * ticket lands nothing listens to it.
 */
export const PLAN_INTENTS = ["content", "report", "software"] as const;
export type PlanIntent = (typeof PLAN_INTENTS)[number];

export type PlanRisk = "low" | "medium" | "high";

/** Qualitative only: no cost, duration or percentage is ever shown. */
export const PLAN_RISK: Record<PlanIntent, PlanRisk> = {
  content: "low",
  report: "medium",
  software: "high",
};

export const STEP_KEYS = ["s1", "s2", "s3"] as const;
export const APPROVAL_KEYS = ["a1", "a2"] as const;

export const PLAN_DEMO_EVENT = "yula:braavolabs-plan-demo-complete";

export type PlanCard = {
  intent: PlanIntent;
  label: string;
  prompt: string;
  risk: PlanRisk;
  riskLabel: string;
  riskNote: string;
  steps: string[];
  approvals: string[];
  output: string;
};

export type PlanLabels = {
  intent: string;
  steps: string;
  approvals: string;
  risk: string;
  output: string;
};

/** `text` reads a key of the `braavolabsDemo` namespace (e.g. `intents.content.s1`). */
export function buildPlanCard(intent: PlanIntent, text: (key: string) => string): PlanCard {
  const base = `intents.${intent}`;
  const risk = PLAN_RISK[intent];
  return {
    intent,
    label: text(`${base}.label`),
    prompt: text(`${base}.prompt`),
    risk,
    riskLabel: text(`risk.${risk}`),
    riskNote: text(`${base}.riskNote`),
    steps: STEP_KEYS.map((k) => text(`${base}.${k}`)),
    approvals: APPROVAL_KEYS.map((k) => text(`${base}.${k}`)),
    output: text(`${base}.output`),
  };
}
