import { NextResponse } from "next/server";
import { getPool, isDatabaseConfigured } from "@/server/db";
import { authorisedByCronSecret } from "@/server/cron-auth";
import { drainOutbox, mailTransport } from "@/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Drains `event_outbox`.
 *
 * The counterpart to /api/purge, and written for the same failure: a queue
 * that nothing consumes is indistinguishable from one that works, right up
 * until somebody asks why no receipt arrived. `createLead()` has been
 * writing outbox rows since it shipped; until this route existed, nothing
 * read them.
 *
 * Returns the counts rather than logging them. `skipped` and `blocked` are
 * the ones worth watching: a run reporting skipped > 0 forever means the
 * mail credentials were never configured, and a queue quietly filling up
 * looks identical to a healthy one from the outside.
 */
export async function GET(request: Request): Promise<Response> {
  if (!authorisedByCronSecret(request)) {
    return NextResponse.json({ drained: null, reason: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ drained: null, reason: "storage_unavailable" }, { status: 503 });
  }

  try {
    const result = await drainOutbox(getPool(), mailTransport());
    if (result.aborted) {
      // 503 so a monitor sees it, WITH the counts that did happen. The
      // sibling purge route makes the same argument: a job that half-worked
      // must not report success — and must not report zero either, which is
      // what discarding the counts on the way out would do.
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Name only: a driver error can quote the row it was working on, and
    // that row points at a person.
    console.error("outbox drain failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ drained: null, reason: "drain_failed" }, { status: 503 });
  }
}
