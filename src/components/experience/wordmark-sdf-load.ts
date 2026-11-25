import { WORDMARK_SDF_SIZE } from "./wordmark-sdf-meta";

/**
 * W8-62: the hero "YULA" is drawn from a 3.1 MB signed-distance atlas that is fetched at runtime. The scene must not
 * report itself ready (and so release the loader) before that atlas is in memory, otherwise a cold connection
 * releases a hero without its wordmark. This module owns the single request; the canvas waits on it and GridRoom
 * copies the bytes into its texture from the same promise.
 */
export const WORDMARK_SDF_URL = "/experience/yula-wordmark-sdf.bin";
export const WORDMARK_SDF_RETRY_DELAY_MS = 1200;

type FetchLike = (input: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>;

let pending: Promise<Uint8Array | null> | null = null;

async function fetchOnce(fetchImpl: FetchLike): Promise<Uint8Array | null> {
  try {
    const response = await fetchImpl(WORDMARK_SDF_URL);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength === WORDMARK_SDF_SIZE.width * WORDMARK_SDF_SIZE.height ? new Uint8Array(buffer) : null;
  } catch {
    return null;
  }
}

/**
 * Resolves with the atlas bytes (top row first, file order) or `null` once two attempts have failed. Concurrent
 * callers share one request; a failed result is not cached, so a later mount tries again.
 */
export function loadWordmarkSdf(
  fetchImpl: FetchLike | undefined = typeof fetch === "function" ? (fetch as unknown as FetchLike) : undefined,
  retryDelayMs: number = WORDMARK_SDF_RETRY_DELAY_MS,
): Promise<Uint8Array | null> {
  if (pending) return pending;
  const attempt = (async () => {
    if (!fetchImpl) return null;
    const first = await fetchOnce(fetchImpl);
    if (first) return first;
    await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    return fetchOnce(fetchImpl);
  })();
  pending = attempt;
  void attempt.then((bytes) => {
    if (!bytes && pending === attempt) pending = null;
  });
  return attempt;
}

/** Test hook: forget the cached request. */
export function resetWordmarkSdfLoad(): void {
  pending = null;
}
