/**
 * WEB-P2-01c: state machine of the synthetic Braavolabs run trace. Pure data
 * and functions, no network, no storage, no clock. Every number is made up for
 * the try-out; nothing here describes real product cost, speed or behaviour.
 *
 * One human gate decides the run: approve lets the last step run and finish,
 * reject blocks the gate and skips what follows. Costs are whole cents so the
 * total never drifts.
 */
export type StepId = "plan" | "tool" | "draft" | "gate" | "done";
export type StepStatus = "completed" | "running" | "awaiting" | "blocked" | "skipped" | "queued";
export type Gate = "pending" | "approved" | "rejected";
export type RunState = { gate: Gate; finished: boolean };
export type RunAction = { type: "approve" } | { type: "reject" } | { type: "finish" } | { type: "reset" };

export const STEP_IDS: readonly StepId[] = ["plan", "tool", "draft", "gate", "done"];
export const INITIAL_RUN: RunState = { gate: "pending", finished: false };

export type CostParts = { modelIn: number; modelOut: number; tool: number };
export type RunStep = {
  id: StepId;
  status: StepStatus;
  /** Seconds, or null while the step has no settled duration. */
  seconds: number | null;
  /** Cents, counted into the total only once the step has started. */
  cents: number;
  parts: CostParts;
  /** Whether the step made a (made-up) tool call. */
  toolCall: boolean;
};
export type Run = {
  steps: RunStep[];
  status: StepStatus;
  totalCents: number;
  totalSeconds: number;
  doneCount: number;
};

const BASE: Record<StepId, { seconds: number; parts: CostParts; toolCall: boolean }> = {
  plan: { seconds: 4, parts: { modelIn: 1, modelOut: 2, tool: 0 }, toolCall: false },
  tool: { seconds: 12, parts: { modelIn: 1, modelOut: 1, tool: 4 }, toolCall: true },
  draft: { seconds: 8, parts: { modelIn: 4, modelOut: 7, tool: 0 }, toolCall: false },
  gate: { seconds: 0, parts: { modelIn: 0, modelOut: 0, tool: 0 }, toolCall: false },
  done: { seconds: 3, parts: { modelIn: 1, modelOut: 1, tool: 3 }, toolCall: true },
};
/** Made-up human waiting times on the gate, in seconds. */
const GATE_SECONDS: Record<Exclude<Gate, "pending">, number> = { approved: 41, rejected: 27 };

export function reduceRun(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "approve":
      return state.gate === "pending" ? { gate: "approved", finished: false } : state;
    case "reject":
      return state.gate === "pending" ? { gate: "rejected", finished: false } : state;
    case "finish":
      return state.gate === "approved" && !state.finished ? { ...state, finished: true } : state;
    case "reset":
      return INITIAL_RUN;
  }
}

function statusOf(id: StepId, s: RunState): StepStatus {
  if (id === "gate") return s.gate === "pending" ? "awaiting" : s.gate === "approved" ? "completed" : "blocked";
  if (id === "done") {
    if (s.gate === "rejected") return "skipped";
    if (s.gate === "pending") return "queued";
    return s.finished ? "completed" : "running";
  }
  return "completed";
}

export function deriveRun(s: RunState): Run {
  const steps: RunStep[] = STEP_IDS.map((id) => {
    const status = statusOf(id, s);
    const base = BASE[id];
    const started = status === "completed" || status === "running";
    const seconds =
      id === "gate" ? (s.gate === "pending" ? null : GATE_SECONDS[s.gate]) : status === "completed" ? base.seconds : null;
    const parts = started ? base.parts : { modelIn: 0, modelOut: 0, tool: 0 };
    return {
      id,
      status,
      seconds,
      cents: parts.modelIn + parts.modelOut + parts.tool,
      parts,
      toolCall: base.toolCall && started,
    };
  });
  const runStatus: StepStatus =
    s.gate === "pending" ? "awaiting" : s.gate === "rejected" ? "blocked" : s.finished ? "completed" : "running";
  return {
    steps,
    status: runStatus,
    totalCents: steps.reduce((n, st) => n + st.cents, 0),
    totalSeconds: steps.reduce((n, st) => n + (st.seconds ?? 0), 0),
    doneCount: steps.filter((st) => st.status === "completed").length,
  };
}
