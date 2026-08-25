import { NextResponse } from "next/server";
import { leadsEnabled } from "@/server/lead-surface";
import { getPool, isDatabaseConfigured } from "@/server/db";
import { allowRequest } from "@/server/rate-limit";
import {
  createLead,
  redactWriteFailure,
  CURRENT_NOTICE_VERSION,
  type LeadIntent,
} from "@/server/leads";
import { readBounded } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;

/**
 * The collection surface, closed by default.
 *
 * Not publishing the FORM does not unpublish the SINK: middleware excludes
 * /api, so this route answers on the public internet the moment main
 * deploys, and the origin check is satisfied by any client that sets the
 * header. /privacy now describes what a lead record holds, column by
 * column, so that precondition is met; the legal review and the mail DNS are
 * not, and until they are the only correct answer here is that we are not
 * collecting. The switch itself lives in `@/server/lead-surface` so the
 * contact page cannot disagree with this route about it.
 */
const ALLOWED_ORIGINS = new Set([
  "https://yulalab.com",
  "https://www.yulalab.com",
]);

const INTENTS: readonly LeadIntent[] = ["product", "studio", "partnership", "press", "privacy"];
/** Deliberately permissive on the local part; the schema holds the real rule. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ALLOWED_FIELDS = new Set([
  "name",
  "email",
  "company",
  "intent",
  "productSlug",
  "message",
  "locale",
  // noticeVersion is deliberately NOT here. The server decides it, and
  // silently ignoring a field the caller believed mattered is the same
  // failure the events contract rejects: they get a 201 and assume it was
  // honoured. Sending it is a loud 400.
  "consent",
  "website",
]);

function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    const site = request.headers.get("sec-fetch-site");
    return site === "same-origin" || site === "none";
  }
  if (ALLOWED_ORIGINS.has(origin)) return true;
  for (const candidate of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]) {
    if (!candidate) continue;
    try {
      if (new URL(candidate).origin === origin) return true;
    } catch {
      /* a misconfigured env var must not widen the allowlist */
    }
  }
  return false;
}

function clientKey(request: Request): string {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (first) return `lead:${first}`;
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp ? `lead:${realIp}` : "lead:unknown";
}

type Parsed =
  | { ok: true; value: Parameters<typeof createLead>[1]; honeypot: boolean }
  | { ok: false; reason: string };

/**
 * Validation errors name the FIELD, never the value. Everything a person
 * types here is personal data, and an error string is the most likely thing
 * to end up in a log.
 */
function parse(input: unknown): Parsed {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "payload must be an object" };
  }
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, reason: `unknown field "${key}"` };
  }

  // The honeypot is checked first and reported as success, so a bot learns
  // nothing about which field caught it.
  // ANY presence is the signal, not just a non-empty string. Checking
  // `typeof === "string"` let a bot send `"website": 1` and skip the trap
  // entirely, and the field is in ALLOWED_FIELDS so the lead stored.
  const honeypot =
    "website" in body &&
    !(typeof body.website === "string" && body.website.trim() === "");

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const email = str(body.email);
  const message = str(body.message);

  if (name.length < 1 || name.length > 120) return { ok: false, reason: "name" };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, reason: "email" };
  if (message.length < 1 || message.length > 4000) return { ok: false, reason: "message" };
  if (!INTENTS.includes(body.intent as LeadIntent)) return { ok: false, reason: "intent" };
  if (body.locale !== "tr" && body.locale !== "en") return { ok: false, reason: "locale" };
  if (body.consent !== true) return { ok: false, reason: "consent" };

  const company = str(body.company);
  if (company.length > 160) return { ok: false, reason: "company" };

  const productSlug = str(body.productSlug);
  if (productSlug && !/^[a-z0-9-]{1,64}$/.test(productSlug)) {
    return { ok: false, reason: "productSlug" };
  }

  return {
    ok: true,
    honeypot,
    value: {
      name,
      email,
      company: company || undefined,
      intent: body.intent as LeadIntent,
      productSlug: productSlug || undefined,
      message,
      locale: body.locale,
      // Server-decided, never the caller's.
      noticeVersion: CURRENT_NOTICE_VERSION,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!leadsEnabled()) {
    // Stated plainly rather than accepting and discarding: a 201 here would
    // be the "thank you while storing nothing" this route exists to avoid.
    return NextResponse.json({ error: "not_accepting_submissions" }, { status: 503 });
  }
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }

  // readBounded, not request.text(). Number(null) is 0, so a chunked or
  // header-less POST skipped the content-length check entirely and 8 MB was
  // pulled for a 16 KB cap (measured). /api/events documents this exact bug
  // being got wrong twice; the fix was sitting one file away, unused.
  const raw = await readBounded(request, MAX_BODY_BYTES);
  if (raw === null) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "malformed_json" }, { status: 400 });
  }

  const parsed = parse(json);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  if (!allowRequest(clientKey(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // A filled honeypot gets the same shape of answer a person gets, with no
  // row written. Returning 400 would tell a bot precisely which field to
  // stop filling in.
  if (parsed.honeypot) {
    return NextResponse.json({ receiptId: "YL-00000000" }, { status: 201 });
  }

  if (!isDatabaseConfigured("intake")) {
    // No silent success: a form that says "thank you" while storing nothing
    // is worse than one that says it is unavailable.
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  try {
    const { receiptId } = await createLead(getPool("intake"), parsed.value, { now: new Date() });
    return NextResponse.json({ receiptId }, { status: 201 });
  } catch (error) {
    // Only the failure SHAPE. Everything in the payload is personal data,
    // and a stack trace or an echoed row is the easiest way to leak it.
    console.error("lead write failed", redactWriteFailure(error));
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
