/**
 * Best-effort write limiter shared by /api/events, /api/leads and
 * /api/data-request.
 *
 * Honest about what this is: an in-memory token bucket, per serverless
 * instance. The host runs many instances and recycles them, so the effective
 * ceiling is (limit × live instances) and a cold start resets it. It is not
 * a security boundary and must not be described as one.
 *
 * It exists because the endpoints are unauthenticated and write rows into
 * tables holding KVKK-scope data. With no limiter at all, a single script
 * can fill them — and a table anyone can fill makes the attribution-
 * completeness number it feeds meaningless. Raising the cost from "free" to
 * "needs distribution" is worth the twenty lines even though a determined
 * flood still gets through.
 *
 * The KEY matters more than the limit. The first version keyed on the
 * session token, which is a field the caller chooses — a script minting a
 * fresh 32-hex value per request was blocked exactly zero times out of two
 * hundred, so the limiter delivered none of the above. Routes now key on the
 * client IP from clientIp() below, which a single machine cannot vary —
 * PROVIDED the platform really controls the header that function reads.
 *
 * Limits it does NOT have, named so nobody reads more into it:
 *
 * 1. Eviction resets it. When the map is full, sweep() drops the 5 000
 *    oldest buckets — including real clients sitting at their cap, who are
 *    then allowed again. Reaching that state needs 10 000 distinct source
 *    IPs, i.e. an attacker who could already outrun the limiter by volume.
 * 2. It cannot help against a slow client. The body is read before this
 *    runs, so a caller trickling bytes under the cap and never closing
 *    holds an instance until the platform timeout, unthrottled.
 * 3. The client IP is only as trustworthy as the platform's header handling.
 *    clientIp() behaviour, one table (first match wins):
 *
 *      VERCEL env set  -> first x-forwarded-for hop, then x-real-ip.
 *                         x-nf-client-connection-ip is ignored. Vercel
 *                         documents that it overwrites x-forwarded-for
 *                         (https://vercel.com/docs/headers/request-headers).
 *      otherwise       -> 1. the Netlify runtime context IP (`context.ip`,
 *                            see netlifyContextIp()): not a request header, so
 *                            a caller cannot forge it. Valid -> that IP.
 *                         2. else x-nf-client-connection-ip if present (valid
 *                            -> that IP; invalid -> null, no fallback);
 *                         3. else first x-forwarded-for hop, then x-real-ip.
 *      nothing valid   -> null.
 *
 *    Netlify (the production host, netlify.toml) — WEB-P0-07c2, resolved
 *    locally (no preview deploy, founder decision 2026-11-13): docs.netlify.com
 *    documents `context.ip` ("A string containing the client IP address",
 *    /build/functions/api/) and says nothing about x-nf-client-connection-ip
 *    or x-forwarded-for; Netlify staff name x-nf-client-connection-ip as the
 *    one header they keep stable (answers.netlify.com). So the key is taken
 *    from the context when the runtime exposes it (tests/rate-limit-client-ip
 *    fakes that global; forged headers lose to it), and the header stays a
 *    fallback. UNVERIFIED LIVE: that `Netlify.context` reaches a Next route
 *    handler through @netlify/plugin-nextjs 5.16.2, and that the edge
 *    overwrites a client-sent x-nf-client-connection-ip. If neither holds,
 *    a caller can choose the key and rotate it; treat the limiter as best
 *    effort there. Confirm at the next normal publish (etag + readback).
 * 4. null has two different fallbacks, both with a cost:
 *    - /api/events falls back to `session:<token>`, a value the caller
 *      chooses (see the session-key history above). So an invalid or absent
 *      header means the key is caller-chosen again, as before this change.
 *    - /api/leads and /api/data-request fall back to one shared
 *      `lead:unknown` / `dsr:unknown` bucket. Junk headers cannot dodge it,
 *      but a flood with an unparseable header can exhaust it and 429
 *      legitimate keyless callers.
 * 5. IPs are validated (IPv4/IPv6 literal, at most 64 chars, no zone id) and
 *    IPv6 is canonicalised, so equivalent spellings share a bucket and junk
 *    cannot inflate the bucket map.
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
  if (!v || v.length > MAX_IP_LENGTH || v.includes("%")) return null;
  const kind = isIP(v);
  if (kind === 0) return null;
  if (kind === 4) return v;
  try {
    // WHATWG URL canonicalises IPv6 (compression, case, mapped IPv4).
    return new URL(`http://[${v}]`).hostname.slice(1, -1);
  } catch {
    return null;
  }
}

/**
 * `context.ip` of the current Netlify request, read the way `getContext()` from
 * `@netlify/functions` does (the runtime's `globalThis.Netlify.context`), without
 * adding a dependency. null when not on Netlify, outside a request, or invalid.
 */
export function netlifyContextIp(): string | null {
  try {
    const ctx = (globalThis as { Netlify?: { context?: { ip?: unknown } | null } }).Netlify?.context;
    return typeof ctx?.ip === "string" ? validIp(ctx.ip) : null;
  } catch {
    return null;
  }
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
  platformIp: string | null = env.VERCEL ? null : netlifyContextIp(),
): string | null {
  if (!env.VERCEL) {
    // The runtime's own answer first: it is not a header the caller sends.
    if (platformIp) return platformIp;
    // Present-but-invalid is rejected outright, not papered over with XFF.
    const netlify = headers.get("x-nf-client-connection-ip");
    if (netlify !== null) return validIp(netlify);
  }

  const first = headers.get("x-forwarded-for")?.split(",")[0];
  return validIp(first) ?? validIp(headers.get("x-real-ip"));
}
