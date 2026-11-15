// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LeadForm } from "@/components/contact/LeadForm";
import { track } from "@/lib/analytics/client";

vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));

const messages = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../messages/tr.json"), "utf8"),
) as { leadForm: { name: string; email: string; message: string; submit: string } };

const tracked = vi.mocked(track);

beforeEach(() => tracked.mockClear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderForm() {
  return render(
    <NextIntlClientProvider locale="tr" messages={messages}>
      <LeadForm intent="partnership" studioEnabled={false} products={[]} />
    </NextIntlClientProvider>,
  );
}

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(messages.leadForm.name), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(messages.leadForm.email), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText(messages.leadForm.message), { target: { value: "merhaba" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit }));
}

const events = () => tracked.mock.calls.map(([input]) => input.event);

describe("lead form funnel events (WEB-P1-03)", () => {
  it("fires lead_form_started once, on the first real field focus", () => {
    renderForm();
    expect(events()).toEqual([]);
    fireEvent.focus(screen.getByLabelText(messages.leadForm.name));
    fireEvent.focus(screen.getByLabelText(messages.leadForm.email));
    expect(events()).toEqual(["lead_form_started"]);
    // Closed vocabulary: nothing but the event name travels.
    expect(tracked.mock.calls[0][0]).toEqual({ event: "lead_form_started" });
  });

  it("does not fire lead_form_started when the honeypot is focused", () => {
    const { container } = renderForm();
    const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    fireEvent.focus(honeypot);
    expect(events()).toEqual([]);
    fireEvent.focus(screen.getByLabelText(messages.leadForm.name));
    expect(events()).toEqual(["lead_form_started"]);
  });

  it("fires lead_form_submitted on an accepted submission", async () => {
    stubFetch(201, { receiptId: "YL-1" });
    renderForm();
    fillAndSubmit();
    await waitFor(() => expect(events()).toContain("lead_form_submitted"));
    expect(events().filter((e) => e === "lead_form_submitted")).toHaveLength(1);
    expect(tracked.mock.calls.find(([i]) => i.event === "lead_form_submitted")![0]).toEqual({
      event: "lead_form_submitted",
    });
  });

  it("does not fire lead_form_submitted when the server rejects the lead", async () => {
    const fetchMock = stubFetch(400, { error: "invalid" });
    renderForm();
    fillAndSubmit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Let the rejected response settle before asserting the absence.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(screen.queryByText(/YL-/)).toBeNull();
    expect(events()).not.toContain("lead_form_submitted");
  });
});
