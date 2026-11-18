// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { BraavolabsRunDemoArea } from "../src/components/projects/BraavolabsRunDemoArea";
import en from "../messages/en.json";
import tr from "../messages/tr.json";
import ar from "../messages/ar.json";

const wrap = (messages: object, locale: string) => (
  <NextIntlClientProvider locale={locale} messages={messages}>
    <BraavolabsRunDemoArea />
  </NextIntlClientProvider>
);
const mount = (messages: object = en, locale = "en") => render(wrap(messages, locale));
const text = (id: string) => screen.getByTestId(id).textContent;
const mql = (matches: boolean) => vi.fn().mockReturnValue({ matches, addEventListener() {}, removeEventListener() {} });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BraavolabsRunDemoArea (WEB-P2-01c)", () => {
  it("renders five steps, labelled as a synthetic example, with the gate awaiting and $0.20 so far", () => {
    mount();
    expect(screen.getByTestId("run-badge").textContent).toBe(en.braavolabsRunDemo.badge);
    expect(text("run-note")).toBe(en.braavolabsRunDemo.note);
    expect(within(screen.getByTestId("run-timeline")).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByTestId("run-step-gate").getAttribute("data-status")).toBe("awaiting");
    expect(text("run-meta-cost")).toBe("$0.20");
    expect(text("run-meta-steps")).toBe("3 / 5");
    expect(screen.getByTestId("run-approve")).toBeTruthy();
    expect(screen.getByTestId("run-reject")).toBeTruthy();
  });

  it("every status shows a word, not only a colour or glyph", () => {
    mount();
    expect(screen.getByTestId("run-step-gate").textContent).toContain(en.braavolabsRunDemo.status.awaiting);
    expect(screen.getByTestId("run-step-done").textContent).toContain(en.braavolabsRunDemo.status.queued);
  });

  it("opens and closes a step with aria-expanded, showing example details only when open", () => {
    mount();
    const btn = screen.getByTestId("run-toggle-tool");
    const panel = screen.getByTestId("run-detail-tool");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(panel.textContent).toBe("");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("hidden")).toBe(false);
    expect(panel.textContent).toContain(en.braavolabsRunDemo.detailTool);
    expect(panel.textContent).toContain(en.braavolabsRunDemo.detailInput);
    expect(panel.textContent).toContain(en.braavolabsRunDemo.detailOutput);
    expect(panel.textContent).toContain(en.braavolabsRunDemo.detailCost);
    expect(panel.textContent).toContain("$0.04");
    expect(panel.textContent).toContain("$0.06");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("approve: gate completes, last step runs, then completes after the beat; total and live region follow", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", mql(false));
    mount();
    expect(text("run-live")).toBe("");
    fireEvent.click(screen.getByTestId("run-approve"));
    expect(screen.getByTestId("run-step-gate").getAttribute("data-status")).toBe("completed");
    expect(screen.getByTestId("run-step-done").getAttribute("data-status")).toBe("running");
    expect(screen.queryByTestId("run-gate-actions")).toBeNull();
    expect(text("run-meta-cost")).toBe("$0.25");
    expect(text("run-live")).toBe(en.braavolabsRunDemo.announceApproved);
    expect(document.activeElement).toBe(screen.getByTestId("run-toggle-gate"));
    act(() => void vi.advanceTimersByTime(1300));
    expect(screen.getByTestId("run-step-done").getAttribute("data-status")).toBe("completed");
    expect(text("run-meta-steps")).toBe("5 / 5");
    expect(text("run-meta-cost")).toBe("$0.25");
    expect(text("run-live")).toBe("Run completed. Total cost, example: $0.25.");
  });

  it("reduced motion: approve goes straight to completed with no timer", () => {
    vi.stubGlobal("matchMedia", mql(true));
    mount();
    fireEvent.click(screen.getByTestId("run-approve"));
    expect(screen.getByTestId("run-step-done").getAttribute("data-status")).toBe("completed");
    expect(text("run-meta-cost")).toBe("$0.25");
  });

  it("reject: gate blocked, last step skipped, cost unchanged, live region announces", () => {
    mount();
    fireEvent.click(screen.getByTestId("run-reject"));
    expect(screen.getByTestId("run-step-gate").getAttribute("data-status")).toBe("blocked");
    expect(screen.getByTestId("run-step-done").getAttribute("data-status")).toBe("skipped");
    expect(text("run-meta-cost")).toBe("$0.20");
    expect(text("run-meta-steps")).toBe("3 / 5");
    expect(text("run-live")).toBe(en.braavolabsRunDemo.announceRejected);
    expect(document.activeElement).toBe(screen.getByTestId("run-toggle-gate"));
  });

  it("reset after approve or reject restores the start; a pending beat cannot complete it later", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", mql(false));
    mount();
    fireEvent.click(screen.getByTestId("run-approve"));
    fireEvent.click(screen.getByTestId("run-reset"));
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByTestId("run-step-gate").getAttribute("data-status")).toBe("awaiting");
    expect(screen.getByTestId("run-step-done").getAttribute("data-status")).toBe("queued");
    expect(text("run-meta-cost")).toBe("$0.20");
    expect(text("run-live")).toBe(en.braavolabsRunDemo.announceReset);
    fireEvent.click(screen.getByTestId("run-reject"));
    fireEvent.click(screen.getByTestId("run-reset"));
    expect(screen.getByTestId("run-approve")).toBeTruthy();
  });

  it("the live region exists before anything changes (pre-rendered, empty)", () => {
    const html = renderToString(wrap(en, "en"));
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"[^>]*data-testid="run-live"[^>]*><\/p>/);
  });

  it("makes no network call and touches no storage", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("matchMedia", mql(true));
    mount();
    fireEvent.click(screen.getByTestId("run-toggle-draft"));
    fireEvent.click(screen.getByTestId("run-approve"));
    fireEvent.click(screen.getByTestId("run-reset"));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("renders translated text in tr and ar, with the page locale as lang", () => {
    mount(tr, "tr");
    expect(screen.getByTestId("braavolabs-run-demo").getAttribute("lang")).toBe("tr");
    expect(text("run-badge")).toBe(tr.braavolabsRunDemo.badge);
    expect(screen.getByTestId("run-approve").textContent).toBe("Onayla");
    expect(text("run-meta-cost")).toMatch(/0,20/);
    cleanup();
    mount(ar, "ar");
    expect(screen.getByTestId("braavolabs-run-demo").getAttribute("lang")).toBe("ar");
    expect(text("run-badge")).toBe(ar.braavolabsRunDemo.badge);
  });
});
