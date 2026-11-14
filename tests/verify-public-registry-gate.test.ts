import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-WEB-01c — exit-code contract of scripts/verify-public-registry.ts.
 * The script runs at import time, so each case resets modules, pins the clock,
 * stubs process.exit and the export-check child, and imports it fresh.
 * Clean: the real presenter withholds expired claims -> no exit(1).
 * Dirty: a presenter regression that calls an expired non-exempt claim
 * "verified" -> exit(1), naming the claim.
 */
import { publicRegistry } from "../src/data/public-registry";
import { isGateExempt } from "../src/lib/public-registry";

// Derived from the registry: the day after the last gated claim expires.
const gatedExpiries = publicRegistry
  .flatMap((r) => r.claims)
  .filter((c) => !isGateExempt(c) && c.expiresAt)
  .map((c) => c.expiresAt as string)
  .sort();
const lastExpiry = gatedExpiries[gatedExpiries.length - 1];
const NOW = new Date(`${lastExpiry}T12:00:00+03:00`);
NOW.setUTCDate(NOW.getUTCDate() + 1);

class Exit extends Error {
  constructor(public code: number) {
    super(`exit ${code}`);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Exit(code ?? 0);
  }) as never);
  vi.doMock("node:child_process", () => ({ execFileSync: () => Buffer.from("") }));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.doUnmock("node:child_process");
  vi.doUnmock("../src/lib/proof");
});

async function run(): Promise<{ code: number; errors: string }> {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  let code = 0;
  try {
    await import("../scripts/verify-public-registry");
  } catch (e) {
    if (!(e instanceof Exit)) throw e;
    code = e.code;
  }
  return { code, errors: err.mock.calls.map((c) => String(c[0])).join("\n") };
}

describe("verify-public-registry exit code", () => {
  it("expired claims withheld by the gate: exit 0 (never calls process.exit)", async () => {
    const { code, errors } = await run();
    expect(errors).not.toMatch(/still presented as verified/);
    expect(code).toBe(0);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("an expired non-exempt claim presented as verified: exit 1 with the claim named", async () => {
    vi.doMock("../src/lib/proof", async (orig) => {
      const real = await orig<typeof import("../src/lib/proof")>();
      return {
        ...real,
        presentClaims: (record: Parameters<typeof real.presentClaims>[0], now: Date) =>
          real.presentClaims(record, now).map((p) => ({ kind: "verified" as const, claim: p.claim })),
      };
    });
    const { code, errors } = await run();
    expect(code).toBe(1);
    expect(errors).toContain(`expired ${lastExpiry} but is still presented as verified`);
    expect(errors).not.toMatch(/burunfarki-/);
  });
});
