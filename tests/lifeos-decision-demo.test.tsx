// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LifeosDecisionDemo from "@/components/projects/LifeosDecisionDemo";
import type { LifeosDemoText } from "@/components/projects/LifeosDemoArea";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

const text = en.lifeosDemo as unknown as LifeosDemoText;
const trText = tr.lifeosDemo as unknown as LifeosDemoText;
const fixed = () => new Date("2026-11-15T12:00:00Z");
const view = (t = text, lang: "en" | "tr" = "en") =>
  render(<LifeosDecisionDemo text={t} lang={lang} now={fixed} timeZone="Europe/Istanbul" />);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LifeosDecisionDemo (WEB-P1-01)", () => {
  it("shows the synthetic label and a preview before anything is chosen", () => {
    view();
    expect(screen.getByTestId("lifeos-demo-badge").textContent).toBe("Synthetic example");
    expect(screen.getByTestId("lifeos-preview").textContent).toContain("November 16, 2026");
  });

  it("preview follows the timing choice and the done state names the card", () => {
    view();
    fireEvent.click(screen.getByRole("radio", { name: text.whenWeek }));
    expect(screen.getByTestId("lifeos-preview").textContent).toContain("November 22, 2026");
    fireEvent.click(screen.getByRole("radio", { name: text.card2 }));
    fireEvent.click(screen.getByTestId("lifeos-set"));
    const body = screen.getByTestId("lifeos-done-body").textContent!;
    expect(body).toContain(text.card2);
    expect(body).toContain("November 22, 2026");
    expect(screen.getByRole("heading", { name: text.doneHeading })).toBe(document.activeElement);
    const live = screen.getByTestId("lifeos-announce");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toContain(text.card2);
  });

  it("a custom example name overrides the card and is limited in length", () => {
    view();
    const input = screen.getByLabelText(text.customLabel) as HTMLInputElement;
    expect(input.maxLength).toBe(40);
    fireEvent.change(input, { target: { value: "  Sample plan  " } });
    fireEvent.click(screen.getByTestId("lifeos-set"));
    expect(screen.getByTestId("lifeos-done-body").textContent).toContain("Sample plan");
  });

  it("restart returns to the form and focuses the first choice", () => {
    view();
    fireEvent.click(screen.getByTestId("lifeos-set"));
    fireEvent.click(screen.getByTestId("lifeos-restart"));
    expect(screen.queryByTestId("lifeos-done")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: text.card1 }));
    expect(screen.getByTestId("lifeos-announce").textContent).toBe("");
  });

  it("is fully keyboard-operable: native radios and buttons only", () => {
    const { container } = view();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect(container.querySelectorAll("[tabindex]:not([tabindex='-1'])")).toHaveLength(0);
    expect(container.querySelectorAll("fieldset > legend")).toHaveLength(2);
  });

  it("renders Turkish copy and dates", () => {
    view(trText, "tr");
    expect(screen.getByTestId("lifeos-preview").textContent).toContain("16 Kasım 2026");
    fireEvent.click(screen.getByTestId("lifeos-set"));
    expect(screen.getByRole("heading", { name: trText.doneHeading })).toBeTruthy();
  });

  it("uses no storage, network, notifications or media devices", () => {
    const fetchSpy = vi.fn();
    const xhr = vi.fn();
    const beacon = vi.fn();
    const notif = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("XMLHttpRequest", xhr);
    vi.stubGlobal("Notification", notif);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const cookie = vi.spyOn(document, "cookie", "set");
    const idb = vi.fn();
    vi.stubGlobal("indexedDB", { open: idb });

    view();
    fireEvent.click(screen.getByRole("radio", { name: text.whenWeek }));
    fireEvent.change(screen.getByLabelText(text.customLabel), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("lifeos-set"));
    fireEvent.click(screen.getByTestId("lifeos-restart"));

    for (const spy of [fetchSpy, xhr, beacon, notif, getUserMedia, setItem, getItem, cookie, idb]) expect(spy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
