// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LeadForm } from "@/components/contact/LeadForm";
import { StudioApplicationForm } from "@/components/studio/StudioApplication";
import { LEAD_SUBMISSION_TIMEOUT_MS, submitLead } from "@/lib/forms/lead-submission";
import { STUDIO_QUALIFIERS } from "@/lib/studio";
import { dedupeKey, type LeadInput } from "@/server/leads";
import { track } from "@/lib/analytics/client";
import tr from "../messages/tr.json";
import en from "../messages/en.json";
import es419 from "../messages/es-419.json";
import ptBR from "../messages/pt-BR.json";
import de from "../messages/de.json";
import fr from "../messages/fr.json";
import ja from "../messages/ja.json";
import ar from "../messages/ar.json";

vi.mock("@/i18n/navigation", () => ({ Link: "a" }));
vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));

type Kind = "lead" | "studio";
const KINDS: Kind[] = ["lead", "studio"];
const NOW = new Date("2026-10-19T12:00:00Z");
const DRAFT = "A sample product enquiry with no private data.";
const COPY = { tr, en };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}

function response(status = 201, body: unknown = { receiptId: "YL-0000ABCD" }) {
  return new Response(JSON.stringify(body), { status });
}

function mount(kind: Kind) {
  const element = (locale: "tr" | "en", open = true) => (
    <NextIntlClientProvider locale={locale} messages={COPY[locale]} now={NOW} timeZone="UTC">
      {kind === "lead" ? (
        <LeadForm
          products={[{ slug: "lifeos", name: "LifeOS" }, { slug: "braavolabs", name: "Braavolabs" }]}
          mailConfigured
          studioEnabled={false}
        />
      ) : <StudioApplicationForm open={open} />}
    </NextIntlClientProvider>
  );
  const view = render(element("tr"));
  const form = view.container.querySelector("form")!;
  const field = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  for (const [name, value] of [
    ["name", "Ada Example"], ["email", "ada@example.com"], ["company", "Example Company"],
    [kind === "lead" ? "message" : "problem", DRAFT],
  ]) fireEvent.change(field(name), { target: { value } });
  if (kind === "lead") fireEvent.change(field("productSlug"), { target: { value: "lifeos" } });
  else for (const qualifier of STUDIO_QUALIFIERS) {
    fireEvent.change(field(qualifier.id), { target: { value: qualifier.options[0].value } });
  }
  fireEvent.click(within(form).getByRole("checkbox"));
  return { ...view, form, field, button: () => within(form).getByRole("button") as HTMLButtonElement,
    language(locale: "tr" | "en") { view.rerender(element(locale)); },
    studioOpen(open: boolean) { view.rerender(element("tr", open)); } };
}

function expectDraft(view: ReturnType<typeof mount>, kind: Kind) {
  expect(view.field("name").value).toBe("Ada Example");
  expect(view.field("email").value).toBe("ada@example.com");
  expect(view.field(kind === "lead" ? "message" : "problem").value).toBe(DRAFT);
  expect((within(view.form).getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
}

function posted(mocked: ReturnType<typeof vi.fn>, index: number): LeadInput {
  expect(mocked.mock.calls[index][0]).toBe("/api/leads");
  return JSON.parse(String(mocked.mock.calls[index][1].body)) as LeadInput;
}

beforeEach(() => {
  // Never fall through to a host/provider request, even if a new path is added.
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected synthetic request"); }));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each(KINDS)("%s real React submission recovery", (kind) => {
  it("keeps ordinary double clicks and a second submit to one pending request", async () => {
    const gate = deferred<Response>();
    const fetched = vi.fn<typeof fetch>(() => gate.promise);
    vi.stubGlobal("fetch", fetched);
    const view = mount(kind);
    fireEvent.click(view.button());
    fireEvent.click(view.button());
    fireEvent.submit(view.form);
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(view.form.getAttribute("aria-busy")).toBe("true");
    expect(view.field("name").disabled).toBe(true);
    expect(view.field(kind === "lead" ? "message" : "problem").disabled).toBe(true);
    await act(async () => { gate.resolve(response()); });
    expect(view.getByText(/YL-0000ABCD/)).toBeTruthy();
  });

  it("latches a synchronous submit re-entry before React renders sending", async () => {
    const gate = deferred<Response>();
    const view = mount(kind);
    let reentered = false;
    const fetched = vi.fn<typeof fetch>(() => {
      if (!reentered) { reentered = true; fireEvent.submit(view.form); }
      return gate.promise;
    });
    vi.stubGlobal("fetch", fetched);
    fireEvent.submit(view.form);
    expect(fetched).toHaveBeenCalledTimes(1);
    await act(async () => { gate.resolve(response()); });
  });

  it("bounds an abort-ignoring request, preserves the draft and ignores its late receipt after retry", async () => {
    vi.useFakeTimers();
    const first = deferred<Response>();
    const fetched = vi.fn<typeof fetch>().mockReturnValueOnce(first.promise).mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetched);
    const view = mount(kind);
    fireEvent.submit(view.form);
    const firstSignal = fetched.mock.calls[0][1]!.signal as AbortSignal;
    await act(async () => { await vi.advanceTimersByTimeAsync(LEAD_SUBMISSION_TIMEOUT_MS); });
    expect(firstSignal.aborted).toBe(true);
    expectDraft(view, kind);
    expect(view.button().disabled).toBe(false);
    expect(view.getByText(kind === "lead" ? tr.leadForm.errors.uncertain : tr.studio.form.errors.uncertain)).toBeTruthy();
    expect(view.getByRole("link", { name: "support@yulalab.com" }).getAttribute("href")).toBe("mailto:support@yulalab.com");
    await act(async () => { fireEvent.submit(view.form); });
    expect(posted(fetched, 1)).toEqual(posted(fetched, 0));
    expect(view.getByText(/YL-0000ABCD/)).toBeTruthy();
    await act(async () => { first.resolve(response(201, { receiptId: "YL-LATE" })); });
    expect(view.queryByText(/YL-LATE/)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("also bounds a stalled response body instead of getting stuck after headers", async () => {
    vi.useFakeTimers();
    const body = deferred<unknown>();
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 201, ok: true, json: () => body.promise })));
    const view = mount(kind);
    await act(async () => { fireEvent.submit(view.form); });
    await act(async () => { await vi.advanceTimersByTimeAsync(LEAD_SUBMISSION_TIMEOUT_MS); });
    expectDraft(view, kind);
    expect(view.button().disabled).toBe(false);
    expect(view.queryByText(/YL-/)).toBeNull();
  });

  it("requires a 201 receipt before showing success or emitting accepted telemetry", async () => {
    const fetched = vi.fn<typeof fetch>().mockResolvedValueOnce(response(201, {})).mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetched);
    const view = mount(kind);
    await act(async () => { fireEvent.submit(view.form); });
    expectDraft(view, kind);
    expect(view.queryByText(/YL-/)).toBeNull();
    expect(vi.mocked(track).mock.calls.some(([event]) => event.event === "studio_application_submitted")).toBe(false);
    await act(async () => { fireEvent.submit(view.form); });
    expect(view.getByText(/YL-0000ABCD/)).toBeTruthy();
    expect(vi.mocked(track).mock.calls.filter(([event]) => event.event === "studio_application_submitted")).toHaveLength(kind === "studio" ? 1 : 0);
  });

  it("aborts on unmount and never treats the abandoned late response as acceptance", async () => {
    const gate = deferred<Response>();
    const fetched = vi.fn<typeof fetch>(() => gate.promise);
    vi.stubGlobal("fetch", fetched);
    const view = mount(kind);
    fireEvent.submit(view.form);
    const signal = fetched.mock.calls[0][1]!.signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { gate.resolve(response()); });
    expect(vi.mocked(track).mock.calls.some(([event]) => event.event === "studio_application_submitted")).toBe(false);
  });
});

it("keeps Studio's business identity across a TR→EN retry without translated labels in the stored message", async () => {
  const fetched = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("response lost")).mockResolvedValueOnce(response());
  vi.stubGlobal("fetch", fetched);
  const view = mount("studio");
  await act(async () => { fireEvent.submit(view.form); });
  view.language("en");
  expectDraft(view, "studio");
  await act(async () => { fireEvent.submit(view.form); });
  const first = posted(fetched, 0), retry = posted(fetched, 1);
  expect(first.locale).toBe("tr");
  expect(retry.locale).toBe("en");
  expect(retry.message).toBe(first.message);
  expect(retry.message).toContain("qualification codes, not currency amounts");
  expect(retry.message).toContain(DRAFT);
  expect(retry.message).not.toContain(STUDIO_QUALIFIERS[0].labelTr);
  expect(dedupeKey(retry, NOW)).toBe(dedupeKey(first, NOW));
  expect(view.getByText(en.studio.form.sentTitle)).toBeTruthy();
});

it("keeps different product enquiries distinct through the actual server dedupe contract", async () => {
  const fetched = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("response lost")).mockResolvedValueOnce(response());
  vi.stubGlobal("fetch", fetched);
  const view = mount("lead");
  await act(async () => { fireEvent.submit(view.form); });
  view.language("en");
  expectDraft(view, "lead");
  fireEvent.change(view.field("productSlug"), { target: { value: "braavolabs" } });
  await act(async () => { fireEvent.submit(view.form); });
  const first = posted(fetched, 0), next = posted(fetched, 1);
  expect(first.productSlug).toBe("lifeos");
  expect(next.productSlug).toBe("braavolabs");
  expect(next.message).toBe(first.message);
  expect(dedupeKey(next, NOW)).not.toBe(dedupeKey(first, NOW));
  expect(view.getByText(en.leadForm.sentBody)).toBeTruthy();
});

it("does not accept another 2xx status or a blank/non-string receipt as durable success", async () => {
  for (const [status, receiptId] of [[200, "YL-OK"], [202, "YL-OK"], [201, " "], [201, 17], [201, null]] as const) {
    vi.stubGlobal("fetch", vi.fn(async () => response(status, { receiptId })));
    expect(await submitLead({ locale: "tr" })).toEqual({ kind: "uncertain" });
  }
});

it("does not silently enable intake for the six new UI locales", async () => {
  const fetched = vi.fn();
  vi.stubGlobal("fetch", fetched);
  for (const locale of ["es-419", "pt-BR", "de", "fr", "ja", "ar"]) {
    expect(await submitLead({ locale })).toEqual({ kind: "rejected", status: 503, error: "not_accepting_submissions" });
  }
  expect(fetched).not.toHaveBeenCalled();
});

it("keeps the actual Studio form closed for all six new UI locales even when directly opened", async () => {
  const fetched = vi.fn();
  vi.stubGlobal("fetch", fetched);
  for (const [locale, messages] of Object.entries({ "es-419": es419, "pt-BR": ptBR, de, fr, ja, ar })) {
    const view = render(
      <NextIntlClientProvider locale={locale} messages={messages} now={NOW} timeZone="UTC">
        <StudioApplicationForm open />
      </NextIntlClientProvider>,
    );
    const form = view.container.querySelector("form")!;
    const problem = form.querySelector<HTMLTextAreaElement>('[name="problem"]')!;
    fireEvent.change(problem, { target: { value: DRAFT } });
    fireEvent.click(within(form).getByRole("checkbox"));
    await act(async () => { fireEvent.submit(form); });
    expect(within(form).getByRole("alert").textContent).toBe(messages.studio.form.errors.closed);
    expect(problem.value).toBe(DRAFT);
    expect(form.getAttribute("aria-busy")).toBe("false");
    expect(fetched).not.toHaveBeenCalled();
    expect(vi.mocked(track).mock.calls.some(([event]) => event.event === "studio_application_submitted")).toBe(false);
    view.unmount();
  }
});

it("keeps storage/commit failures uncertain while preserving explicit closed-surface rejection", async () => {
  for (const status of [500, 503, 504]) {
    vi.stubGlobal("fetch", vi.fn(async () => response(status, { error: "storage_unavailable" })));
    expect(await submitLead({ locale: "tr" })).toEqual({ kind: "uncertain" });
  }
  for (const error of ["not_accepting_submissions", "studio_not_accepting_submissions"]) {
    vi.stubGlobal("fetch", vi.fn(async () => response(503, { error })));
    expect(await submitLead({ locale: "tr" })).toEqual({ kind: "rejected", status: 503, error });
  }
});

it("aborts a pending Studio submission when the surface closes and does not restore its late success on reopening", async () => {
  const gate = deferred<Response>();
  const fetched = vi.fn<typeof fetch>(() => gate.promise);
  vi.stubGlobal("fetch", fetched);
  const view = mount("studio");
  fireEvent.submit(view.form);
  const signal = fetched.mock.calls[0][1]!.signal as AbortSignal;
  view.studioOpen(false);
  expect(signal.aborted).toBe(true);
  expect(view.getByText(tr.studio.form.closedTitle)).toBeTruthy();
  await act(async () => { gate.resolve(response()); });
  view.studioOpen(true);
  expect(view.queryByText(/YL-0000ABCD/)).toBeNull();
  expect(vi.mocked(track).mock.calls.some(([event]) => event.event === "studio_application_submitted")).toBe(false);
  expect(view.container.querySelector("button[type=submit]")?.hasAttribute("disabled")).toBe(false);
  expect((view.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
});
