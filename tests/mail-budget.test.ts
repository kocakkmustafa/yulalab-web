import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  drainOutbox, DRAIN_BATCH_LIMIT, DRAIN_DB_TIMEOUT_MS,
  DRAIN_TIME_BUDGET_MS, SEND_TIMEOUT_MS, MailProviderRejectionError,
  type MailMessage, type MailTransport,
} from "@/server/mail";
import { MAIL_RUN_LIMIT, LEAD_MAIL_LIMIT } from "@/server/mail-admission";
import { GET } from "@/app/api/mail/route";
import { deriveDataRequestToken, hashDataRequestToken } from "@/server/data-request-token";

const boundary = vi.hoisted(() => ({ pool: undefined as unknown }));
vi.mock("@/server/db", () => ({ getPool: () => boundary.pool, isDatabaseConfigured: () => true }));
vi.mock("@/server/cron-auth", () => ({ authorisedByCronSecret: () => true }));

// Ordered I/O, not a SQL engine, locking, real provider or authorization test.
type Step = {
  sql: string | RegExp;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  error?: Error;
  wait?: () => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
};
const COUNT = /^SELECT count\(\*\) FILTER /;
const CLAIM = /^SELECT id, event_type, aggregate_id, payload_json FROM event_outbox /;
const RECIPIENT = "SELECT email, locale FROM leads WHERE id = $1";
const STAMP = /^UPDATE event_outbox SET delivered_at = now\(\), /;
const ATTEMPT = "UPDATE event_outbox SET attempts = attempts + 1 WHERE id = $1";
function counts(n: number, blocked = 0, dead = 0): Step[] {
  return [{ sql: COUNT, rows: [{ deliverable: n, unaddressable: blocked, dead }] }];
}
function row(id: number) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    event_type: "lead_receipt", aggregate_id: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    payload_json: { receiptId: `YL-TEST-${id}`, locale: "tr" },
  };
}
function transaction(id: number, tail: Step[] = [{ sql: STAMP, rowCount: 1 }, { sql: "COMMIT" }]): Step[] {
  return [{ sql: "BEGIN" }, { sql: CLAIM, rows: [row(id)] },
    { sql: RECIPIENT, rows: [{ email: "person@example.invalid", locale: "tr" }] }, ...tail];
}
function empty(): Step[] { return [{ sql: "BEGIN" }, { sql: CLAIM }, { sql: "COMMIT" }]; }
function client(steps: Step[]) {
  let cursor = 0;
  const query = vi.fn(async (input: string) => {
    const sql = input.replace(/\s+/g, " ").trim();
    const step = steps[cursor++];
    if (!step) throw new Error(`unexpected SQL: ${sql}`);
    if (typeof step.sql === "string") expect(sql).toBe(step.sql);
    else expect(sql).toMatch(step.sql);
    if (step.error) throw step.error;
    if (step.wait) return step.wait();
    return { rows: step.rows ?? [], rowCount: step.rowCount ?? step.rows?.length ?? 0 };
  });
  return { query, release: vi.fn(), consumed: () => expect(cursor).toBe(steps.length) };
}
function script(groups: Step[][], connectDelayMs = 0) {
  const clients = groups.map(client);
  let index = 0;
  const connect = vi.fn(async () => {
    if (connectDelayMs) await new Promise<void>((resolve) => setTimeout(resolve, connectDelayMs));
    const found = clients[index++];
    if (!found) throw new Error("unexpected connection");
    return found;
  });
  return {
    pool: { connect } as unknown as Parameters<typeof drainOutbox>[0], clients, connect,
    consumed() {
      expect(index).toBe(clients.length);
      for (const c of clients) { c.consumed(); expect(c.release).toHaveBeenCalledTimes(1); }
    },
  };
}
function transport(send: (message: MailMessage, options?: { signal?: AbortSignal }) => Promise<void>): MailTransport {
  return { configured: true, send: vi.fn(send) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const templates = {
  SENDGRID_TEMPLATE_LEAD_RECEIPT_TR: "d-cef2371a06014280857d0f17e3056305",
  SENDGRID_TEMPLATE_LEAD_RECEIPT_EN: "d-d42d50b22fda48e49cfbb6ab373f420e",
  SENDGRID_TEMPLATE_LEAD_INTERNAL_ROUTE_TR: "d-2ce67d70cec249aeab61577361a50572",
  SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_TR: "d-934e79bac8f841dfb7066e169d8f4ffc",
  SENDGRID_TEMPLATE_DATA_REQUEST_VERIFICATION_EN: "d-e9aeeaa9dc8949679777b61eed0f41dc",
};
beforeEach(() => {
  boundary.pool = undefined;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("YULA_MAIL_FROM", "hello@yulalab.com");
  vi.stubEnv("YULA_FROM_NAME", "YULALAB");
  vi.stubEnv("YULA_REPLY_TO", "yula@yulalab.com");
  vi.stubEnv("YULA_LEADS_INTERNAL_ADDRESS", "yula@yulalab.com");
  vi.stubEnv("DATA_REQUEST_TOKEN_CURRENT_KEY_ID", "fixture-key");
  vi.stubEnv("DATA_REQUEST_TOKEN_CURRENT_SECRET", "fixture-only-secret-with-at-least-32-characters");
  vi.stubEnv("DATA_REQUEST_TOKEN_PREVIOUS_KEY_ID", "");
  vi.stubEnv("DATA_REQUEST_TOKEN_PREVIOUS_SECRET", "");
  vi.stubEnv("SENDGRID_API_KEY", "fixture-only-no-provider-key");
  for (const [key, value] of Object.entries(templates)) vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("unexpected network use"); }));
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks();
});

describe("bounded mail worker with actual modules and scripted I/O", () => {
  it("keeps the small drain batch independent of daily admission and reports the whole remainder", async () => {
    expect(MAIL_RUN_LIMIT).toBe(100); expect(LEAD_MAIL_LIMIT).toBe(40);
    const s = script([counts(25), ...Array.from({ length: DRAIN_BATCH_LIMIT }, (_, i) => transaction(i + 1)), counts(15)]);
    const t = transport(async () => {});
    const result = await drainOutbox(s.pool, t);
    expect(result).toMatchObject({ delivered: 10, remaining: 15, aborted: false, uncertain: 0, budgetExhausted: false });
    expect(t.send).toHaveBeenCalledTimes(10); s.consumed();
  });

  it("stops successful slow sends within the total budget rather than performing100 nine-second sends", async () => {
    const s = script([counts(100), transaction(1), counts(99)]);
    const t = transport(async () => { await new Promise<void>((resolve) => setTimeout(resolve, 9_000)); });
    const started = performance.now(); const run = drainOutbox(s.pool, t);
    await vi.advanceTimersByTimeAsync(9_000);
    const result = await run;
    expect(result).toMatchObject({ delivered: 1, remaining: 99, budgetExhausted: true, aborted: false, uncertain: 0 });
    expect(performance.now() - started).toBeLessThanOrEqual(DRAIN_TIME_BUDGET_MS);
    expect(t.send).toHaveBeenCalledTimes(1); s.consumed();
  });

  it("uses monotonic elapsed time when the wall clock jumps", async () => {
    const s = script([counts(100), transaction(1), counts(99)]);
    const t = transport(async () => {
      vi.setSystemTime(new Date("2040-01-01T00:00:00Z"));
      await new Promise<void>((resolve) => setTimeout(resolve, 9_000));
      vi.setSystemTime(new Date("2000-01-01T00:00:00Z"));
    });
    const run = drainOutbox(s.pool, t); await vi.advanceTimersByTimeAsync(9_000);
    expect(await run).toMatchObject({ delivered: 1, budgetExhausted: true }); s.consumed();
  });

  it("commits a known HTTP rejection attempt and allows an independent next job", async () => {
    const s = script([counts(2), transaction(1, [{ sql: ATTEMPT, rowCount: 1 }, { sql: "COMMIT" }]), transaction(2), empty(), counts(1)]);
    let calls = 0;
    const result = await drainOutbox(s.pool, transport(async () => { if (calls++ === 0) throw new MailProviderRejectionError(429); }));
    expect(result).toMatchObject({ failed: 1, delivered: 1, remaining: 1, uncertain: 0, aborted: false }); s.consumed();
  });

  it("does not count a failure until its attempt transaction commits", async () => {
    const s = script([counts(2), transaction(1, [{ sql: ATTEMPT, rowCount: 1 }, { sql: "COMMIT", error: new Error("lost commit reply") }, { sql: "ROLLBACK" }]), counts(2)]);
    const t = transport(async () => { throw new MailProviderRejectionError(503); });
    expect(await drainOutbox(s.pool, t)).toMatchObject({ failed: 0, delivered: 0, uncertain: 0, aborted: true, remaining: 2 });
    expect(t.send).toHaveBeenCalledTimes(1); s.consumed();
  });

  it.each(["resolve", "reject"] as const)("abandons a send that ignores abort and safely consumes its late%s", async (settlement) => {
    const late = deferred<void>(); let signal: AbortSignal | undefined;
    const s = script([counts(2), transaction(1, [{ sql: ATTEMPT, rowCount: 1 }, { sql: "COMMIT" }]), counts(2)]);
    const t = transport(async (_message, options) => { signal = options?.signal; return late.promise; });
    const run = drainOutbox(s.pool, t); await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);
    const result = await run;
    expect(result).toMatchObject({ delivered: 0, failed: 1, uncertain: 1, aborted: true, remaining: 2 });
    expect(signal?.aborted).toBe(true); expect(t.send).toHaveBeenCalledTimes(1);
    const snapshot = JSON.stringify(result);
    if (settlement === "resolve") late.resolve(); else late.reject(new Error("late response lost"));
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.stringify(result)).toBe(snapshot); s.consumed();
  });

  it("treats a network rejection as uncertain and starts no subsequent send", async () => {
    const s = script([counts(2), transaction(1, [{ sql: ATTEMPT, rowCount: 1 }, { sql: "COMMIT" }]), counts(2)]);
    const t = transport(async () => { throw new TypeError("connection reset after request"); });
    expect(await drainOutbox(s.pool, t)).toMatchObject({ failed: 1, uncertain: 1, aborted: true });
    expect(t.send).toHaveBeenCalledTimes(1); s.consumed();
  });

  it("does not call a failed COMMIT a delivered message even when ROLLBACK answers", async () => {
    const s = script([counts(2), transaction(1), transaction(2, [{ sql: STAMP, rowCount: 1 }, { sql: "COMMIT", error: new Error("commit reply lost") }, { sql: "ROLLBACK" }]), counts(1)]);
    expect(await drainOutbox(s.pool, transport(async () => {}))).toMatchObject({ delivered: 1, uncertain: 1, aborted: true, remaining: 1 }); s.consumed();
  });

  it("reserves all three verification writes before allocating the send deadline", async () => {
    const queued = { ...row(1), event_type: "data_request_verification", payload_json: { locale: "tr", tokenKeyId: "fixture-key" } };
    const token = deriveDataRequestToken(queued.aggregate_id, "fixture-only-secret-with-at-least-32-characters");
    const request = {
      email: "person@example.invalid", request_type: "access", verification_state: "pending",
      verification_token_hash: hashDataRequestToken(token), verification_token_key_id: "fixture-key",
      verification_queue_expires_at: new Date("2027-01-01T00:00:00Z"),
    };
    const slow = (step: Step): Step => ({ ...step, wait: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 900));
      return { rows: step.rows ?? [], rowCount: step.rowCount ?? step.rows?.length ?? 0 };
    } });
    const s = script([
      counts(1).map(slow), [
        { sql: "BEGIN" }, { sql: CLAIM, rows: [queued] },
        { sql: /^SELECT email, request_type, verification_state, verification_token_hash,/, rows: [request] },
        { sql: ATTEMPT, rowCount: 1 }, { sql: "COMMIT" },
      ].map(slow), counts(1).map(slow),
    ], 900);
    let signal: AbortSignal | undefined;
    const t = transport(async (_message, options) => {
      signal = options?.signal;
      await new Promise<void>((resolve) => setTimeout(resolve, 9_999));
    });
    let finishedAt = Infinity;
    const run = drainOutbox(s.pool, t).then((result) => { finishedAt = performance.now(); return result; });
    await vi.advanceTimersByTimeAsync(DRAIN_TIME_BUDGET_MS);
    expect(await run).toMatchObject({ delivered: 0, failed: 1, uncertain: 1, aborted: true, remaining: 1 });
    expect(signal?.aborted).toBe(true);
    expect(finishedAt).toBeLessThanOrEqual(DRAIN_TIME_BUDGET_MS);
    expect(s.clients[1].release).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(t.send).toHaveBeenCalledOnce(); s.consumed();
  });

  it("reports an accepted send followed by a zero-row verification update as uncertain", async () => {
    const queued = { ...row(1), event_type: "data_request_verification", payload_json: { locale: "tr", tokenKeyId: "fixture-key" } };
    const token = deriveDataRequestToken(queued.aggregate_id, "fixture-only-secret-with-at-least-32-characters");
    const s = script([counts(1), [
      { sql: "BEGIN" }, { sql: CLAIM, rows: [queued] },
      { sql: /^SELECT email, request_type, verification_state, verification_token_hash,/, rows: [{
        email: "person@example.invalid", request_type: "access", verification_state: "pending",
        verification_token_hash: hashDataRequestToken(token), verification_token_key_id: "fixture-key",
        verification_queue_expires_at: new Date("2027-01-01T00:00:00Z"),
      }] }, { sql: /^UPDATE data_requests SET verification_sent_at = /, rowCount: 0 }, { sql: "ROLLBACK" },
    ], counts(1)]);
    const t = transport(async () => {});
    expect(await drainOutbox(s.pool, t)).toMatchObject({ delivered: 0, failed: 0, uncertain: 1, aborted: true, remaining: 1 });
    expect(t.send).toHaveBeenCalledOnce(); s.consumed();
  });

  it("bounds a COMMIT that never answers and destroys the client without queuing rollback", async () => {
    const late = deferred<{ rows: Record<string, unknown>[]; rowCount: number }>();
    const s = script([counts(1), transaction(1, [{ sql: STAMP, rowCount: 1 }, { sql: "COMMIT", wait: () => late.promise }]), counts(1)]);
    const run = drainOutbox(s.pool, transport(async () => {})); await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    const result = await run;
    expect(result).toMatchObject({ delivered: 0, uncertain: 1, aborted: true, remaining: 1 });
    expect(s.clients[1].release).toHaveBeenCalledWith(true); s.consumed();
    late.resolve({ rows: [], rowCount: 0 }); await vi.advanceTimersByTimeAsync(0); s.consumed();
  });

  it("bounds a stalled opening count and leaves unknown queue counts null", async () => {
    const late = deferred<{ rows: Record<string, unknown>[]; rowCount: number }>();
    const s = script([[{ sql: COUNT, wait: () => late.promise }]]);
    const t = transport(async () => {}); const run = drainOutbox(s.pool, t);
    await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    expect(await run).toMatchObject({ delivered: 0, remaining: null, dead: null, aborted: true });
    expect(s.clients[0].release).toHaveBeenCalledWith(true); expect(t.send).not.toHaveBeenCalled(); s.consumed();
    late.resolve({ rows: [{ deliverable: 1, unaddressable: 0, dead: 0 }], rowCount: 1 });
    await vi.advanceTimersByTimeAsync(0); s.consumed();
  });

  it("destroys a late acquired client exactly once without starting any SQL", async () => {
    const acquired = deferred<ReturnType<typeof client>>(); const late = client([]);
    const pool = { connect: vi.fn(() => acquired.promise) } as unknown as Parameters<typeof drainOutbox>[0];
    const t = transport(async () => {}); const run = drainOutbox(pool, t);
    await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    expect(await run).toMatchObject({ aborted: true, remaining: null });
    acquired.resolve(late); await vi.advanceTimersByTimeAsync(0);
    expect(late.release).toHaveBeenCalledExactlyOnceWith(true); expect(late.query).not.toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled();
  });

  it("does not resume a timed-out claim query after its late resolution", async () => {
    const late = deferred<{ rows: Record<string, unknown>[]; rowCount: number }>();
    const s = script([counts(1), [{ sql: "BEGIN" }, { sql: CLAIM, wait: () => late.promise }], counts(1)]);
    const t = transport(async () => {}); const run = drainOutbox(s.pool, t);
    await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    expect(await run).toMatchObject({ aborted: true, delivered: 0, uncertain: 0 });
    expect(s.clients[1].release).toHaveBeenCalledWith(true);
    late.resolve({ rows: [row(1)], rowCount: 1 }); await vi.advanceTimersByTimeAsync(0);
    expect(t.send).not.toHaveBeenCalled(); s.consumed();
  });

  it("bounds rollback as well as the failed transaction", async () => {
    const s = script([counts(1), [{ sql: "BEGIN" }, { sql: CLAIM, error: new Error("query failed") }, { sql: "ROLLBACK", wait: () => new Promise(() => {}) }], counts(1)]);
    const run = drainOutbox(s.pool, transport(async () => {})); await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    expect(await run).toMatchObject({ aborted: true, delivered: 0 });
    expect(s.clients[1].release).toHaveBeenCalledWith(true); s.consumed();
  });

  it("keeps completed counts when the final queue count times out", async () => {
    const s = script([counts(1), transaction(1), empty(), [{ sql: COUNT, wait: () => new Promise(() => {}) }]]);
    const run = drainOutbox(s.pool, transport(async () => {})); await vi.advanceTimersByTimeAsync(DRAIN_DB_TIMEOUT_MS);
    expect(await run).toMatchObject({ delivered: 1, remaining: null, dead: null, aborted: true }); s.consumed();
  });
});

describe("actual mail GET counter meaning with fixed local boundaries", () => {
  it("returns503 for blocked configured mail without calling a provider", async () => {
    vi.stubEnv("SENDGRID_TEMPLATE_LEAD_RECEIPT_EN", "");
    const s = script([counts(0, 2), empty(), counts(0, 2)]); boundary.pool = s.pool;
    const response = await GET(new Request("https://example.invalid/api/mail"));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ blocked: 2, delivered: 0 });
    expect(fetch).not.toHaveBeenCalled(); s.consumed();
  });
  it("returns503 for queued work waiting on an unconfigured provider", async () => {
    vi.stubEnv("SENDGRID_API_KEY", ""); const s = script([counts(3)]); boundary.pool = s.pool;
    const response = await GET(new Request("https://example.invalid/api/mail"));
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ skipped: 3, delivered: 0, remaining: 3 }); s.consumed();
  });
  it("does not claim a drained queue from HTTP200 when another worker holds pending work", async () => {
    const s = script([counts(1), empty(), counts(1)]); boundary.pool = s.pool;
    const response = await GET(new Request("https://example.invalid/api/mail"));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ delivered: 0, remaining: 1 }); s.consumed();
  });
});
