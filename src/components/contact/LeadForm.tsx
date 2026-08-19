"use client";

import { useId, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CURRENT_NOTICE_VERSION } from "@/lib/consent";

const INTENTS = ["product", "studio", "partnership", "press", "privacy"] as const;
type Intent = (typeof INTENTS)[number];

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; receiptId: string }
  | { kind: "error"; code: string };

/**
 * The lead form.
 *
 * Rendered by the contact page only when the surface is actually open (see
 * `leadsEnabled`), because a form that answers every submission with 503 is
 * worse than the mail links it would replace — it takes a person's time and
 * gives nothing back.
 *
 * Two things here are load-bearing rather than decorative:
 *
 * The consent checkbox names the notice VERSION it is agreeing to, read from
 * the same constant the server writes into `lead_consents`. A consent row
 * exists to answer "to what did they agree"; if this label and that column
 * can drift, the answer is wrong and nobody finds out.
 *
 * The success message says a receipt was emailed only when one actually
 * was. Nothing sends mail today — the outbox consumer is built but its
 * provider is a founder gate — so it reports what happened: the message was
 * recorded, here is the reference. That sentence is chosen from
 * `mailConfigured`, not written into the copy, because a promise of email
 * that outlives its truth leaves a person waiting for something that was
 * never coming.
 */
export function LeadForm({
  products,
  mailConfigured,
}: {
  products: { slug: string; name: string }[];
  /**
   * Whether this deployment can actually send the receipt.
   *
   * A prop rather than a sentence, because the sentence goes stale silently.
   * "We do not send automatic email yet" is true today and becomes a lie the
   * moment the provider credentials land — the form is already open at that
   * point, since both sit behind LEADS_ENABLED — and nothing would have
   * failed. Computed from `mailTransport().configured`, the same function
   * that decides whether a receipt is sent at all, so the two cannot
   * disagree.
   */
  mailConfigured: boolean;
}) {
  const t = useTranslations("leadForm");
  const locale = useLocale() as "tr" | "en";
  const id = useId();
  const [intent, setIntent] = useState<Intent>("studio");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "sending") return;
    const data = new FormData(event.currentTarget);
    setState({ kind: "sending" });

    const payload: Record<string, unknown> = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      intent,
      message: String(data.get("message") ?? "").trim(),
      locale,
      consent: data.get("consent") === "on",
      // Present but empty on a real submission. The server treats any value
      // as a bot and answers 201 anyway, so nothing here reveals the trap.
      website: String(data.get("website") ?? ""),
    };
    const company = String(data.get("company") ?? "").trim();
    if (company) payload.company = company;
    const slug = String(data.get("productSlug") ?? "");
    // Only for a product intent: the database rejects the pair otherwise,
    // and a routing rule must never read a slug nobody asked about.
    if (intent === "product" && slug) payload.productSlug = slug;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { receiptId?: string; error?: string };
      if (response.ok && body.receiptId) {
        setState({ kind: "sent", receiptId: body.receiptId });
        return;
      }
      setState({ kind: "error", code: body.error ?? "unknown" });
    } catch {
      // A network failure is not a rejection. Saying "we could not reach the
      // server" is true; "your message was invalid" would not be.
      setState({ kind: "error", code: "offline" });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="glass p-7" role="status">
        <div className="font-mono text-[11px] tracking-widest uppercase text-ink-300 mb-2">
          {t("sentEyebrow")}
        </div>
        <p className="text-[15.5px] leading-[1.65] text-ink-200">
          {t(mailConfigured ? "sentBodyMailed" : "sentBody")}
        </p>
        <p className="mt-4 font-mono text-[13px] text-ink-100 [overflow-wrap:anywhere]">
          {t("reference")}: {state.receiptId}
        </p>
      </div>
    );
  }

  const field =
    "mt-2 w-full rounded-lg bg-white/[0.04] border border-white/10 px-4 py-3 text-[15px] text-ink-100 placeholder:text-ink-400 focusable";
  const label = "font-mono text-[11px] tracking-widest uppercase text-ink-300";

  return (
    <form onSubmit={onSubmit} noValidate className="glass p-7 flex flex-col gap-5">
      <div>
        <label className={label} htmlFor={`${id}-name`}>
          {t("name")}
        </label>
        <input id={`${id}-name`} name="name" required maxLength={120} className={field} autoComplete="name" />
      </div>

      <div>
        <label className={label} htmlFor={`${id}-email`}>
          {t("email")}
        </label>
        <input id={`${id}-email`} name="email" type="email" required maxLength={254} className={field} autoComplete="email" />
      </div>

      <div>
        <label className={label} htmlFor={`${id}-company`}>
          {t("company")}
        </label>
        <input id={`${id}-company`} name="company" maxLength={160} className={field} autoComplete="organization" />
      </div>

      <div>
        <label className={label} htmlFor={`${id}-intent`}>
          {t("intent")}
        </label>
        <select
          id={`${id}-intent`}
          name="intent"
          className={field}
          value={intent}
          onChange={(e) => setIntent(e.target.value as Intent)}
        >
          {INTENTS.map((value) => (
            <option key={value} value={value}>
              {t(`intents.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {intent === "product" ? (
        <div>
          <label className={label} htmlFor={`${id}-product`}>
            {t("product")}
          </label>
          <select id={`${id}-product`} name="productSlug" className={field} defaultValue="">
            <option value="">{t("productAny")}</option>
            {products.map((product) => (
              <option key={product.slug} value={product.slug}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor={`${id}-message`}>
          {t("message")}
        </label>
        <textarea id={`${id}-message`} name="message" required maxLength={4000} rows={6} className={field} />
      </div>

      {/* Honeypot. Off-screen rather than display:none, which a bot that
          reads computed styles skips; aria-hidden and tabIndex keep it away
          from anyone using a keyboard or a screen reader. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor={`${id}-website`}>{t("website")}</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <label className="flex items-start gap-3 text-[14px] leading-[1.6] text-ink-300">
        <input type="checkbox" name="consent" required className="mt-1 focusable" />
        <span>
          {t("consent", { version: CURRENT_NOTICE_VERSION })}{" "}
          <a className="underline focusable" href={locale === "tr" ? "/privacy" : "/en/privacy"}>
            {t("consentLink")}
          </a>
        </span>
      </label>

      <div role="status" aria-live="polite" className="min-h-[1.5rem] text-[14px] leading-[1.6]">
        {state.kind === "error" ? (
          <span className="text-[#FF8A8A]">{t(`errors.${errorKey(state.code)}`)}</span>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="self-start rounded-lg bg-[#C3F400] px-6 py-3 font-medium text-black disabled:opacity-60 focusable"
      >
        {state.kind === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}

/**
 * Maps a server error code onto a message.
 *
 * Anything unrecognised becomes the generic message rather than being shown
 * raw: the 400 bodies name the field that failed, which is useful to a
 * developer and meaningless to a person, and echoing an unknown string into
 * the page is how server detail reaches a screen it was never written for.
 */
export function errorKey(code: string): string {
  const known: Record<string, string> = {
    not_accepting_submissions: "closed",
    rate_limited: "rateLimited",
    storage_unavailable: "unavailable",
    too_large: "tooLarge",
    offline: "offline",
    email: "email",
    consent: "consent",
    message: "message",
    name: "name",
  };
  return known[code] ?? "generic";
}
