import { describe, expect, it } from "vitest";
import { INITIAL_RUN, STEP_IDS, deriveRun, reduceRun, type RunState } from "../src/components/projects/braavolabs-run-trace";

const statuses = (s: RunState) => deriveRun(s).steps.map((x) => x.status);

describe("braavolabs run trace state machine (WEB-P2-01c)", () => {
  it("starts with three completed steps, the gate awaiting and the last step queued", () => {
    expect(STEP_IDS).toEqual(["plan", "tool", "draft", "gate", "done"]);
    expect(statuses(INITIAL_RUN)).toEqual(["completed", "completed", "completed", "awaiting", "queued"]);
    const run = deriveRun(INITIAL_RUN);
    expect(run.status).toBe("awaiting");
    expect(run.doneCount).toBe(3);
    expect(run.totalCents).toBe(20); // 3 + 6 + 11, nothing for the gate or the queued step
    expect(run.totalSeconds).toBe(24);
    expect(run.steps[3].seconds).toBeNull();
  });

  it("approve completes the gate and starts the last step; finish completes it and adds its cost", () => {
    const approved = reduceRun(INITIAL_RUN, { type: "approve" });
    expect(statuses(approved)).toEqual(["completed", "completed", "completed", "completed", "running"]);
    expect(deriveRun(approved).status).toBe("running");
    expect(deriveRun(approved).totalCents).toBe(25);
    expect(deriveRun(approved).steps[4].seconds).toBeNull();
    const done = reduceRun(approved, { type: "finish" });
    expect(statuses(done)).toEqual(["completed", "completed", "completed", "completed", "completed"]);
    const run = deriveRun(done);
    expect(run.status).toBe("completed");
    expect(run.doneCount).toBe(5);
    expect(run.totalCents).toBe(25);
    expect(run.totalSeconds).toBe(24 + 41 + 3);
  });

  it("reject blocks the gate and skips the rest without charging for it", () => {
    const rejected = reduceRun(INITIAL_RUN, { type: "reject" });
    expect(statuses(rejected)).toEqual(["completed", "completed", "completed", "blocked", "skipped"]);
    const run = deriveRun(rejected);
    expect(run.status).toBe("blocked");
    expect(run.totalCents).toBe(20);
    expect(run.steps[4].cents).toBe(0);
    expect(run.steps[4].seconds).toBeNull();
    expect(run.doneCount).toBe(3);
  });

  it("the gate decides once: later approve or reject is ignored; finish needs an approval", () => {
    const rejected = reduceRun(INITIAL_RUN, { type: "reject" });
    expect(reduceRun(rejected, { type: "approve" })).toBe(rejected);
    expect(reduceRun(rejected, { type: "finish" })).toBe(rejected);
    expect(reduceRun(INITIAL_RUN, { type: "finish" })).toBe(INITIAL_RUN);
    const approved = reduceRun(INITIAL_RUN, { type: "approve" });
    expect(reduceRun(approved, { type: "reject" })).toBe(approved);
    const done = reduceRun(approved, { type: "finish" });
    expect(reduceRun(done, { type: "finish" })).toBe(done);
  });

  it("reset returns to the start from every state", () => {
    for (const actions of [[], [{ type: "approve" }], [{ type: "approve" }, { type: "finish" }], [{ type: "reject" }]] as const) {
      const s = actions.reduce<RunState>((acc, a) => reduceRun(acc, a), INITIAL_RUN);
      expect(reduceRun(s, { type: "reset" })).toEqual(INITIAL_RUN);
    }
  });

  it("total cost is the sum of the step costs, and each step's parts add up to it", () => {
    for (const s of [INITIAL_RUN, { gate: "approved", finished: true }, { gate: "rejected", finished: false }] as RunState[]) {
      const run = deriveRun(s);
      expect(run.totalCents).toBe(run.steps.reduce((n, x) => n + x.cents, 0));
      for (const st of run.steps) expect(st.cents).toBe(st.parts.modelIn + st.parts.modelOut + st.parts.tool);
    }
  });
});
