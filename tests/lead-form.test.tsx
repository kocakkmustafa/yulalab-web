// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LeadForm, errorKey } from "@/components/contact/LeadForm";
import { CURRENT_NOTICE_VERSION } from "@/lib/consent";

interface Copy {
  leadForm: {
    name: string;
    email: string;
    message: string;
    submit: string;
    sentBody: string;
    sentBodyMailed: string;
    errors: { closed: string; offline: string };
  };
}

const messages = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "../messages/tr.json"), "utf8"),
) as Copy & Record<string, unknown>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderForm(mailConfigured = false) {
  return render(
    <NextIntlClientProvider locale="tr" messages={messages}>
      <LeadForm products={[{ slug: "lifeos", name: "LifeOS" }]} mailConfigured={mailConfigured} />
    </NextIntlClientProvider>,
  );
}

function fill() {
  fireEvent.change(screen.getByLabelText(messages.leadForm.name), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByLabelText(messages.leadForm.email), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText(messages.leadForm.message), {
    target: { value: "merhaba" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

type FetchMock = ReturnType<typeof stubFetch>;

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The JSON body of the first (and only) POST the form made. */
function postedBody(fetchMock: FetchMock): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
}

describe("the consent the person is actually giving", () => {
  it("names the same notice version the server writes to lead_consents", () => {
    // The whole reason consent is a versioned row rather than a boolean is
    // to answer "to what did they agree". If this label and that column can
    // drift, the row answers wrongly and nothing catches it.
    renderForm();
    expect(screen.getByText(new RegExp(CURRENT_NOTICE_VERSION))).toBeTruthy();
  });

  it("cannot be submitted without ticking it", () => {
    renderForm();
    const consent = screen.getByRole("checkbox") as HTMLInputElement;
    expect(consent.required).toBe(true);
  });
});

describe("the honeypot", () => {
  it("is kept away from anyone using a keyboard or a screen reader", () => {
    renderForm();
    const trap = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(trap).toBeTruthy();
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest("[aria-hidden='true']")).toBeTruthy();
    // display:none would be skipped by a bot that reads computed styles.
    expect(trap.closest("div")!.style.display).not.toBe("none");
  });
});

describe("what is posted", () => {
  it("sends exactly the fields the route allows, and no more", async () => {
    // noticeVersion is deliberately NOT in the route's ALLOWED_FIELDS: the
    // server decides it, and sending it is a loud 400. A form that posted it
    // would be rejected on every submission.
    const fetchMock = stubFetch(201, { receiptId: "YL-00000001" });
    renderForm();
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit}));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = postedBody(fetchMock);
    expect(Object.keys(body).sort()).toEqual(
      ["consent", "email", "intent", "locale", "message", "name", "website"].sort(),
    );
    expect(body.consent).toBe(true);
    expect(body.website).toBe("");
  });

  it("omits productSlug unless the subject is a product", async () => {
    // leads has a CHECK that rejects the pair, so a slug attached to a
    // studio enquiry fails the insert — and a routing rule must never read
    // a product nobody asked about.
    const fetchMock = stubFetch(201, { receiptId: "YL-00000001" });
    renderForm();
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = postedBody(fetchMock);
    expect("productSlug" in body).toBe(false);
  });
});

describe("when it does not go through", () => {
  it("points a person at email when the form is closed", async () => {
    stubFetch(503, { error: "not_accepting_submissions" });
    renderForm();
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit}));
    await screen.findByText(messages.leadForm.errors.closed);
  });

  it("does not put a raw server string on the screen", () => {
    // The 400 bodies name the field that failed — useful to a developer,
    // meaningless to a person, and echoing an unknown one into the page is
    // how server detail reaches a screen it was never written for.
    expect(errorKey("some_new_backend_code")).toBe("generic");
    expect(errorKey("not_accepting_submissions")).toBe("closed");
  });

  it("says the server was unreachable rather than blaming the message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network");
    }));
    renderForm();
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit}));
    await screen.findByText(messages.leadForm.errors.offline);
  });
});

describe("after it goes through", () => {
  it("does not claim an email was sent when nothing can send one", async () => {
    stubFetch(201, { receiptId: "YL-0000ABCD" });
    renderForm(false);
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit }));
    await screen.findByText(messages.leadForm.sentBody as string);
  });

  it("says a copy was emailed once the provider is actually configured", async () => {
    // The sentence is chosen from the same value that decides whether a
    // receipt is sent, so it cannot outlive its truth.
    stubFetch(201, { receiptId: "YL-0000ABCD" });
    renderForm(true);
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit }));
    await screen.findByText(messages.leadForm.sentBodyMailed as string);
  });

  it("shows the reference, because it is the only copy the person gets", async () => {
    // The outbox consumer exists but its provider is a founder gate, so the
    // reference on screen is the ONLY copy the person gets.
    stubFetch(201, { receiptId: "YL-0000ABCD" });
    renderForm();
    fill();
    fireEvent.submit(screen.getByRole("button", { name: messages.leadForm.submit}));
    await screen.findByText(/YL-0000ABCD/);
  });
});

describe("the collection switch", () => {
  it("refuses to load in a browser, where it could only answer wrongly", async () => {
    // LEADS_ENABLED is not NEXT_PUBLIC. A client component importing this
    // would read `undefined` and quietly mean "closed" while the server
    // meant "open" — one surface collecting personal data and the other
    // saying it does not.
    await expect(import("@/server/lead-surface")).rejects.toThrow(/server-only/);
  });
});
