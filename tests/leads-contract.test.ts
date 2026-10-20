import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  createLead, dedupeKey, receiptIdFor, LEAD_DB_TIMEOUT_MS,
  LEAD_TRANSACTION_BUDGET_MS, type LeadInput,
} from "@/server/leads";

const NOW = new Date("2026-10-20T00:05:00Z");
const LEAD_ID = "00000000-0000-4000-8000-000000000001";
const input: LeadInput = {
  name: "Fixture", email: "person@example.invalid", intent: "product",
  productSlug: "lifeos", message: "The same question", locale: "tr",
};
type Step = {
  sql: string | RegExp;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  inspect?: (values: unknown[]) => void;
  error?: Error;
  wait?: () => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
};
function fixture(steps: Step[], connectWait?: () => Promise<void>) {
  let cursor = 0;
  const query = vi.fn(async (text: string, values: unknown[] = []) => {
    const sql = text.replace(/\s+/g, " ").trim();
    const step = steps[cursor++];
    if (!step) throw new Error(`unexpected SQL: ${sql}`);
    if (typeof step.sql === "string") expect(sql).toBe(step.sql);
    else expect(sql).toMatch(step.sql);
    step.inspect?.(values);
    if (step.error) throw step.error;
    if (step.wait) return step.wait();
    return { rows: step.rows ?? [], rowCount: step.rowCount ?? step.rows?.length ?? 0 };
  });
  const release = vi.fn();
  const pool = { connect: vi.fn(async () => {
    if (connectWait) await connectWait();
    return { query, release };
  }) };
  return {
    pool: pool as unknown as Parameters<typeof createLead>[0], query, release, connect: pool.connect,
    consumed(destroyed?: true) {
      expect(cursor).toBe(steps.length);
      expect(pool.connect).toHaveBeenCalledOnce();
      expect(release).toHaveBeenCalledExactlyOnceWith(destroyed);
    },
  };
}
const begin: Step = { sql: "BEGIN" };
const lock: Step = { sql: /^SELECT pg_advisory_xact_lock/ };
const duplicate = /^SELECT id FROM leads WHERE \(dedupe_key = \$1 OR .*\)\) AND product_slug IS NOT DISTINCT FROM \$6::text ORDER BY created_at DESC LIMIT 1$/;
const admission: Step = {
  sql: /^SELECT \(SELECT count\(\*\) \* 2 FROM leads/,
  rows: [{ lead_jobs: 0, request_jobs: 0, pending: 0, pending_lead: 0 }],
};
const commit: Step = { sql: "COMMIT" };

function newLeadTransaction(): Step[] {
  return [begin, lock, { sql: duplicate }, admission,
    { sql: /^INSERT INTO leads /, rows: [{ id: LEAD_ID }] },
    { sql: /^INSERT INTO lead_consents /, rowCount: 1 },
    { sql: /^INSERT INTO event_outbox .*'lead_receipt'/, rowCount: 1 },
    { sql: /^INSERT INTO event_outbox .*'lead_internal_route'/, rowCount: 1 }, commit];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function delayed(step: Step, ms: number): Step {
  return { ...step, wait: async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
    return { rows: step.rows ?? [], rowCount: step.rowCount ?? step.rows?.length ?? 0 };
  } };
}

async function settleMicrotasks() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

describe("lead product-scope contract, real module with scripted I/O", () => {
  it("separates products while retaining same-product and locale-independent identity", () => {
    const key = dedupeKey(input, NOW);
    const english: LeadInput = { ...input, locale: "en" };
    expect(dedupeKey({ ...input, productSlug: "braavolabs" }, NOW)).not.toBe(key);
    expect(dedupeKey(english, NOW)).toBe(key);
    expect(dedupeKey({ ...input, email: " PERSON@EXAMPLE.INVALID ", message: " The same question ", productSlug: " lifeos " }, NOW)).toBe(key);
  });

  it("uses the stored null product scope for non-product intents", () => {
    const studio: LeadInput = { ...input, intent: "studio" };
    expect(dedupeKey(studio, NOW)).toBe(dedupeKey({ ...studio, productSlug: undefined }, NOW));
    expect(dedupeKey({ ...studio, productSlug: "braavolabs" }, NOW)).toBe(dedupeKey(studio, NOW));
  });

  it("keeps business identity fields distinct with structured hash input", () => {
    expect(dedupeKey({ ...input, message: "one|two" }, NOW)).not.toBe(dedupeKey({ ...input, message: "one", productSlug: "two|lifeos" }, NOW));
    expect(dedupeKey(input, NOW)).not.toBe(dedupeKey({ ...input, intent: "studio" }, NOW));
  });

  it("binds an old day-hash retry to the rolling lookup's same product predicate", async () => {
    // Scripted response: this verifies query/parameter intent, not SQL execution.
    const oldDay = new Date("2026-10-19T23:55:00Z");
    const legacyKey = createHash("sha256")
      .update(`${input.email}|${input.message}|${input.intent}|${oldDay.toISOString().slice(0, 10)}`)
      .digest("hex");
    expect(dedupeKey(input, NOW)).not.toBe(legacyKey);
    const s = fixture([begin, lock, {
      sql: duplicate, rows: [{ id: LEAD_ID }], inspect(values) {
        expect(values).toEqual([dedupeKey(input, NOW), NOW, input.email, input.message, input.intent, "lifeos"]);
      },
    }, commit]);
    expect(await createLead(s.pool, input, { now: NOW })).toEqual({ receiptId: receiptIdFor(LEAD_ID) });
    expect(s.query.mock.calls.some(([sql]) => sql.includes("INSERT"))).toBe(false);
    s.consumed();
  });

  it("inserts another product with the same scope used by the retry lookup", async () => {
    const other: LeadInput = { ...input, productSlug: "braavolabs" };
    const s = fixture([begin, lock, {
      sql: duplicate, inspect(values) { expect(values[5]).toBe("braavolabs"); },
    }, admission, {
      sql: /^INSERT INTO leads /, rows: [{ id: LEAD_ID }], inspect(values) {
        expect(values[4]).toBe("braavolabs"); expect(values[7]).toBe(dedupeKey(other, NOW));
      },
    }, { sql: /^INSERT INTO lead_consents /, rowCount: 1 },
    { sql: /^INSERT INTO event_outbox .*'lead_receipt'/, rowCount: 1 },
    { sql: /^INSERT INTO event_outbox .*'lead_internal_route'/, rowCount: 1 }, commit]);
    expect(await createLead(s.pool, other, { now: NOW })).toEqual({ receiptId: receiptIdFor(LEAD_ID) });
    s.consumed();
  });

  it("checks product scope when returning a uniqueness-race receipt", async () => {
    const s = fixture([begin, lock, { sql: duplicate }, admission,
      { sql: /^INSERT INTO leads /, rowCount: 0 }, {
        sql: "SELECT id FROM leads WHERE dedupe_key = $1 AND product_slug IS NOT DISTINCT FROM $2::text",
        rows: [{ id: LEAD_ID }], inspect(values) {
          expect(values).toEqual([dedupeKey(input, NOW), "lifeos"]);
        },
      }, commit]);
    expect(await createLead(s.pool, input, { now: NOW })).toEqual({ receiptId: receiptIdFor(LEAD_ID) });
    s.consumed();
  });

  it("rolls back rather than acknowledging an unavailable conflict record", async () => {
    const s = fixture([begin, lock, { sql: duplicate }, admission,
      { sql: /^INSERT INTO leads /, rowCount: 0 },
      { sql: "SELECT id FROM leads WHERE dedupe_key = $1 AND product_slug IS NOT DISTINCT FROM $2::text" },
      { sql: "ROLLBACK" }]);
    await expect(createLead(s.pool, input, { now: NOW })).rejects.toThrow("lead dedupe record is unavailable");
    s.consumed();
  });
});

describe("bounded lead transaction product correctness simulation, actual module with scripted I/O", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("bounds a connect that never resolves without starting any SQL", async () => {
    const s = fixture([], () => new Promise(() => {}));
    const started = performance.now();
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({
      name: "LeadTransactionTimeoutError", message: "lead connect deadline exceeded",
    });
    await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
    await failure;
    expect(performance.now() - started).toBe(LEAD_DB_TIMEOUT_MS);
    expect(s.connect).toHaveBeenCalledOnce();
    expect(s.query).not.toHaveBeenCalled();
    expect(s.release).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("destroys a late acquired connection exactly once without issuing BEGIN", async () => {
    const late = deferred<void>();
    const s = fixture([], () => late.promise);
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({ name: "LeadTransactionTimeoutError" });
    await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
    await failure;
    expect(s.release).not.toHaveBeenCalled();
    late.resolve();
    await settleMicrotasks();
    s.consumed(true);
    expect(s.query).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("consumes a late rejected connect after the caller already timed out", async () => {
    const late = deferred<void>();
    const s = fixture([], () => late.promise);
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({ name: "LeadTransactionTimeoutError" });
    await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
    await failure;
    late.reject(new Error("synthetic late connection error"));
    await settleMicrotasks();
    expect(s.query).not.toHaveBeenCalled();
    expect(s.release).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  const stalledQueries: { label: string; prefix: Step[]; stalled: Step }[] = [
    { label: "BEGIN", prefix: [], stalled: begin },
    { label: "admission lock", prefix: [begin], stalled: lock },
    { label: "duplicate lookup", prefix: [begin, lock], stalled: { sql: duplicate } },
    { label: "admission count", prefix: [begin, lock, { sql: duplicate }], stalled: admission },
  ];
  for (const { label, prefix, stalled } of stalledQueries) {
    it.each(["resolve", "reject"] as const)(`bounds a stalled ${label}; late %s starts no further SQL`, async (settlement) => {
      const late = deferred<{ rows: Record<string, unknown>[]; rowCount: number }>();
      const s = fixture([...prefix, { ...stalled, wait: () => late.promise }]);
      const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({
        name: "LeadTransactionTimeoutError", message: "lead query deadline exceeded",
      });
      await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
      await failure;
      s.consumed(true);
      expect(s.query).toHaveBeenCalledTimes(prefix.length + 1);
      expect(s.query.mock.calls.some(([sql]) => sql === "ROLLBACK" || sql === "COMMIT")).toBe(false);
      if (settlement === "resolve") late.resolve({ rows: [], rowCount: 0 });
      else late.reject(new Error("synthetic late query error"));
      await settleMicrotasks();
      expect(s.query).toHaveBeenCalledTimes(prefix.length + 1);
      expect(s.release).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  }

  it("preserves a successful receipt and releases the client after acknowledged COMMIT", async () => {
    const s = fixture(newLeadTransaction().map((step) => delayed(step, 100)),
      () => new Promise((resolve) => setTimeout(resolve, 100)));
    const started = performance.now();
    const run = createLead(s.pool, input, { now: NOW });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await run).toEqual({ receiptId: receiptIdFor(LEAD_ID) });
    expect(performance.now() - started).toBe(1_000);
    s.consumed();
    expect(s.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds the whole transaction below the client deadline when each hop is individually timely", async () => {
    expect(LEAD_TRANSACTION_BUDGET_MS).toBe(10_000);
    expect(LEAD_TRANSACTION_BUDGET_MS).toBeLessThan(15_000);
    const s = fixture(newLeadTransaction().map((step) => delayed(step, 990)),
      () => new Promise((resolve) => setTimeout(resolve, 990)));
    const started = performance.now();
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({
      name: "LeadCommitUncertainError", message: "lead commit outcome is unknown",
    });
    await vi.advanceTimersByTimeAsync(LEAD_TRANSACTION_BUDGET_MS - LEAD_DB_TIMEOUT_MS);
    await failure;
    expect(performance.now() - started).toBe(9_000);
    s.consumed(true);
    expect(s.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(s.query).toHaveBeenCalledTimes(9);
    expect(s.release).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a lost COMMIT reply stays uncertain, without issuing a misleading ROLLBACK", async () => {
    const steps = newLeadTransaction();
    steps[steps.length - 1] = { sql: "COMMIT", error: new Error("synthetic lost COMMIT reply") };
    const s = fixture(steps);
    await expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({
      name: "LeadCommitUncertainError", message: "lead commit outcome is unknown",
    });
    s.consumed(true);
    expect(s.query.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("a COMMIT that never answers ends uncertain; its late success cannot return a receipt", async () => {
    const late = deferred<{ rows: Record<string, unknown>[]; rowCount: number }>();
    const s = fixture([begin, lock, { sql: duplicate, rows: [{ id: LEAD_ID }] }, { sql: "COMMIT", wait: () => late.promise }]);
    let returnedReceipt = false;
    const run = createLead(s.pool, input, { now: NOW }).then((result) => { returnedReceipt = true; return result; });
    const failure = expect(run).rejects.toMatchObject({ name: "LeadCommitUncertainError" });
    await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
    await failure;
    s.consumed(true);
    late.resolve({ rows: [], rowCount: 0 });
    await settleMicrotasks();
    expect(returnedReceipt).toBe(false);
    expect(s.query).toHaveBeenCalledTimes(4);
    expect(s.release).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a stalled rollback after a settled write error and destroys the client", async () => {
    const s = fixture([begin, lock, { sql: duplicate, error: new Error("synthetic settled SQL error") },
      { sql: "ROLLBACK", wait: () => new Promise(() => {}) }]);
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({
      name: "LeadTransactionError", message: "lead transaction rollback failed",
    });
    await vi.advanceTimersByTimeAsync(LEAD_DB_TIMEOUT_MS);
    await failure;
    s.consumed(true);
    expect(s.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses reserved tail time for rollback after an ordinary late settled error", async () => {
    const steps = newLeadTransaction().slice(0, -1).map((step) => delayed(step, 990));
    steps[steps.length - 1] = { sql: /^INSERT INTO event_outbox .*'lead_internal_route'/, wait: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 990));
      throw new Error("synthetic late settled SQL error");
    } };
    steps.push({ sql: "ROLLBACK", wait: () => new Promise(() => {}) });
    const s = fixture(steps, () => new Promise((resolve) => setTimeout(resolve, 990)));
    const started = performance.now();
    const failure = expect(createLead(s.pool, input, { now: NOW })).rejects.toMatchObject({ name: "LeadTransactionError" });
    await vi.advanceTimersByTimeAsync(LEAD_TRANSACTION_BUDGET_MS);
    await failure;
    expect(performance.now() - started).toBeLessThanOrEqual(LEAD_TRANSACTION_BUDGET_MS);
    s.consumed(true);
    expect(s.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(s.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
