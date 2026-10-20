import type { StudioApplication } from "@/lib/studio";

/** A UX deadline, not proof that the server rejected or rolled back a write. */
export const LEAD_SUBMISSION_TIMEOUT_MS = 15_000;

export type LeadSubmissionResult =
  | { kind: "accepted"; receiptId: string }
  | { kind: "rejected"; status: number; error?: string }
  | { kind: "uncertain" };

/** Eight UI languages do not activate unverified database/mail intake. */
export function supportsLeadIntake(locale: unknown): locale is "tr" | "en" {
  return locale === "tr" || locale === "en";
}

/**
 * Stable business data, independent of translated labels and UI language.
 * Explicitly identify the coarse enum codes so they are never mistaken for
 * a price, currency amount, or numeric answer shown to the applicant.
 */
export function studioLeadMessage(
  application: Pick<StudioApplication, "problem" | "budgetBand" | "timing" | "decisionRole">,
): string {
  return [
    "Studio application v1 — qualification codes, not currency amounts",
    `budgetBand=${application.budgetBand}`,
    `timing=${application.timing}`,
    `decisionRole=${application.decisionRole}`,
    "",
    application.problem.trim(),
  ].join("\n");
}

/**
 * Bound both fetch and response-body reading, including adapters that do not
 * settle their promise on abort. A lost/invalid response remains uncertain:
 * retry uses the same business content and the server's deduplication rule.
 */
export async function submitLead(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<LeadSubmissionResult> {
  if (!supportsLeadIntake(payload.locale)) {
    return { kind: "rejected", status: 503, error: "not_accepting_submissions" };
  }
  if (signal?.aborted) return { kind: "uncertain" };

  const controller = new AbortController();
  let interrupt!: () => void;
  const interrupted = new Promise<LeadSubmissionResult>((resolve) => {
    interrupt = () => {
      resolve({ kind: "uncertain" });
      controller.abort();
    };
  });
  const deadline = setTimeout(interrupt, LEAD_SUBMISSION_TIMEOUT_MS);
  signal?.addEventListener("abort", interrupt, { once: true });

  const request = (async (): Promise<LeadSubmissionResult> => {
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const json: unknown = await response.json();
      const body = json && typeof json === "object" && !Array.isArray(json)
        ? json as Record<string, unknown>
        : null;
      if (response.status === 201) {
        const receiptId = typeof body?.receiptId === "string" ? body.receiptId.trim() : "";
        return receiptId ? { kind: "accepted", receiptId } : { kind: "uncertain" };
      }
      // Another 2xx status is not the API's durable-acceptance contract.
      if (response.ok) return { kind: "uncertain" };
      const error = typeof body?.error === "string" ? body.error : undefined;
      // A storage/COMMIT failure response cannot establish that no write
      // happened. Only the explicit closed-surface contract is a definite
      // rejection at 5xx; preserve the draft and reconcile other outcomes.
      if (response.status >= 500 && !(
        response.status === 503 &&
        (error === "not_accepting_submissions" || error === "studio_not_accepting_submissions")
      )) return { kind: "uncertain" };
      return {
        kind: "rejected",
        status: response.status,
        error,
      };
    } catch {
      return { kind: "uncertain" };
    }
  })();

  try {
    return await Promise.race([request, interrupted]);
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", interrupt);
  }
}
