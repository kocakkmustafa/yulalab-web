import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadWordmarkSdf,
  resetWordmarkSdfLoad,
  WORDMARK_SDF_URL,
} from "../src/components/experience/wordmark-sdf-load";
import { WORDMARK_SDF_SIZE } from "../src/components/experience/wordmark-sdf-meta";

const BYTES = WORDMARK_SDF_SIZE.width * WORDMARK_SDF_SIZE.height;
const okResponse = (length = BYTES) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(length) });

describe("W8-62 wordmark SDF load signal", () => {
  beforeEach(() => resetWordmarkSdfLoad());

  it("resolves with the atlas bytes and shares one request between callers", async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const [a, b] = await Promise.all([loadWordmarkSdf(fetchImpl, 0), loadWordmarkSdf(fetchImpl, 0)]);
    expect(a?.byteLength).toBe(BYTES);
    expect(b).toBe(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(WORDMARK_SDF_URL);
  });

  it("retries once after a failure and still delivers the atlas", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(okResponse());
    const bytes = await loadWordmarkSdf(fetchImpl, 0);
    expect(bytes?.byteLength).toBe(BYTES);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("signals failure with null after two failed attempts and does not cache the failure", async () => {
    const failing = vi.fn(async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }));
    expect(await loadWordmarkSdf(failing, 0)).toBeNull();
    expect(failing).toHaveBeenCalledTimes(2);
    const healthy = vi.fn(async () => okResponse());
    expect((await loadWordmarkSdf(healthy, 0))?.byteLength).toBe(BYTES);
  });

  it("treats a wrong-sized body as a failure rather than a blank texture", async () => {
    const fetchImpl = vi.fn(async () => okResponse(BYTES - 1));
    expect(await loadWordmarkSdf(fetchImpl, 0)).toBeNull();
  });
});
