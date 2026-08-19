import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/server/db";
import { purgeExpiredAttributions } from "@/server/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes attribution rows past their 30-day retention.
 *
 * This route exists because the retention promise was, for one review
 * cycle, a lie: `purgeExpiredAttributions()` was written, indexed and
 * covered by a passing test — and called from nowhere in production. The
 * public privacy page stated "raw records are deleted after 30 days" in the
 * unconditional present tense while nothing deleted anything. A green test
 * for a job that never runs is the most convincing kind of nothing.
 *
 * Scheduled by `vercel.json` and authenticated with CRON_SECRET, which
 * Vercel Cron sends as a bearer token. Without the secret set the route
 * refuses rather than running unauthenticated — a public endpoint that
 * deletes rows is not something to leave open, even when the deletion is
 * one we want.
 */
function authorised(request: Request, secret: string): boolean {
  const presented = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Length differences still leak through the early return, which is
  // unavoidable without padding and irrelevant against a random 32-byte
  // token; the byte comparison itself is constant-time.
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  // One answer for "no secret configured" and "wrong secret", so an
  // anonymous caller cannot learn which it is.
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorised(request, secret)) {
    return NextResponse.json({ purged: null, reason: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ purged: null, reason: "storage_unavailable" }, { status: 503 });
  }

  try {
    // Returned rather than logged-and-forgotten: a purge that silently does
    // nothing looks exactly like one that works.
    const purged = await purgeExpiredAttributions(getPool(), new Date());
    return NextResponse.json({ purged }, { status: 200 });
  } catch (error) {
    console.error("purge failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ purged: null, reason: "purge_failed" }, { status: 503 });
  }
}
