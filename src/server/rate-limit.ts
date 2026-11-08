/**
 * Best-effort write limiter for /api/events.
 *
 * Honest about what this is: an in-memory token bucket, per serverless
 * instance. Vercel runs many instances and recycles them, so the effective
 * ceiling is (limit × live instances) and a cold start resets it. It is not
 * a security boundary and must not be described as one.
 *
 * It exists because the endpoint is unauthenticated and writes one row per
 * request into a table holding KVKK-scope data. With no limiter at all, a
 * single script can fill that table — and a table anyone can fill makes the
 * attribution-completeness number it feeds meaningless. Raising the cost
 * from "free" to "needs distribution" is worth the twenty lines even though
 * a determined flood still gets through.
 *
 * The KEY matters more than the limit. The first version keyed on the
 * session token, which is a field the caller chooses — a script minting a
 * fresh 32-hex value per request was blocked exactly zero times out of two
 * hundred, so the limiter delivered none of the above. It is now keyed on
 * the client IP (see clientKey in the events route), which a single machine
 * cannot vary.
 *
 * Three limits it does NOT have, named so nobody reads more into it:
 *
 * 1. Eviction resets it. When the map is full, sweep() drops the 5 000
 *    oldest buckets — including real clients sitting at their cap, who are
 *    then allowed again. Reaching that state needs 10 000 distinct source
 *    IPs, i.e. an attacker who could already outrun the limiter by volume.
 * 2. It cannot help against a slow client. The body is read before this
 *    runs, so a caller trickling bytes under the cap and never closing
 *    holds an instance until the platform timeout, unthrottled.
 * 3. Its key is only as trustworthy as the platform's header handling, and
 *    clientIp() below picks the header per environment:
 *    - Vercel (process.env.VERCEL set): Vercel overwrites x-forwarded-for
 *      and does not forward external values
 *      (https://vercel.com/docs/headers/request-headers), so the first hop
 *      is the real client. x-nf-client-connection-ip is IGNORED there: any
 *      caller can send it and Vercel would pass it through.
 *    - Netlify (production host, netlify.toml): x-nf-client-connection-ip is
 *      preferred. UNVERIFIED against official docs: docs.netlify.com only
 *      documents `context.ip` ("A string containing the client IP address",
 *      /build/functions/api/) and says nothing about this header or about
 *      x-forwarded-for. The header is what Netlify staff/forum threads
 *      recommend, but it is not a documented guarantee. When the header is
 *      present it alone decides (a forged x-forwarded-for is ignored). When
 *      it is absent we fall back to the first x-forwarded-for hop, which
 *      is only safe if the platform overwrites it: UNVERIFIED on Netlify,
 *      so a caller could rotate it if the Netlify header were ever missing.
 *    - Anywhere else, or when nothing valid is present: clientIp() returns
 *      null and the routes use their no-IP fallback (leads: one shared
 *      "lead:unknown" bucket, which header rotation cannot bypass). Verify on a deployed preview with a forged header
 *      before treating this as more than best effort.
 *
 * The durable, shared limiter belongs with the lead endpoint in Y-P1-002
 * (roadmap §7.2 `src/server/rate-limit.ts` — this file, extended). Until
 * then this is a floor, not the plan.
 */

import { isIP } from "node:net";

const WINDOW_MS = 60_000;
/** A real visitor emits a handful of funnel events a minute, not sixty. */
const MAX_PER_WINDOW = 30;
/** Bounds memory: a flood of unique keys cannot grow the map without limit. */
const MAX_TRACKED_KEYS = 10_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function allowRequest(key: string, now: number = Date.now()): boolean {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count += 1;
  return true;
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still full of live buckets — drop the oldest rather than grow forever.
  if (buckets.size >= MAX_TRACKED_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_TRACKED_KEYS / 2))) {
      buckets.delete(key);
    }
  }
}

/** Test-only. */
export function resetRateLimit(): void {
  buckets.clear();
}

const MAX_IP_LENGTH = 64;

function validIp(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v || v.length > MAX_IP_LENGTH || isIP(v) === 0) return null;
  return v.toLowerCase();
}

/**
 * The client IP to key rate limits on, or null when no trustworthy valid one
 * exists. See limit 3 in the header comment for which header is trusted where.
 * Values that are empty, over 64 chars or not an IPv4/IPv6 literal are
 * rejected, which also stops junk keys from bloating the bucket map.
 */
export function clientIp(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!env.VERCEL) {
    // Present-but-invalid is rejected outright, not papered over with XFF.
    const netlify = headers.get("x-nf-client-connection-ip");
    if (netlify !== null) return validIp(netlify);
  }

  const first = headers.get("x-forwarded-for")?.split(",")[0];
  return validIp(first) ?? validIp(headers.get("x-real-ip"));
}
