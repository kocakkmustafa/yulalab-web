// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeControl } from "@/components/theme/ThemeControl";
import { THEME_COPY, themeCopy } from "@/components/theme/theme-copy";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

let dark = false;
let listeners: Set<(event: MediaQueryListEvent) => void>;
let add: ReturnType<typeof vi.fn>;
let remove: ReturnType<typeof vi.fn>;
function wrapper(locale = "tr") {
  return <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC"><ThemeProvider><ThemeControl /></ThemeProvider></NextIntlClientProvider>;
}
function system(next: boolean) {
  dark = next;
  act(() => { for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent); });
}
function choose(value: string) { fireEvent.change(screen.getByRole("combobox"), { target: { value } }); }
beforeEach(() => {
  localStorage.clear();
  dark = false;
  listeners = new Set();
  add = vi.fn((_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener));
  remove = vi.fn((_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ get matches() { return dark; }, addEventListener: add, removeEventListener: remove })));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected request in theme simulation"); }));
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
  document.documentElement.style.colorScheme = "";
  document.head.innerHTML = '<meta name="theme-color" content="#09060e">';
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("actual theme provider and native control, local synthetic environment", () => {
  it("follows OS only in system mode, persists explicit choices and cleans up its media listener", () => {
    const view = render(wrapper());
    expect(document.documentElement.dataset.theme).toBe("light");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("system");
    system(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    choose("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    system(false); system(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    choose("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    system(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#f5f3ee");
    expect(fetch).not.toHaveBeenCalled();
    view.unmount();
    expect(remove).toHaveBeenCalledOnce();
    expect(listeners.size).toBe(0);
  });

  it("restores an explicit preference and retains it while the UI locale rerenders", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const view = render(wrapper("tr"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    choose("light");
    view.rerender(wrapper("ar"));
    const selector = screen.getByRole("combobox", { name: THEME_COPY.ar.label }) as HTMLSelectElement;
    expect(selector.value).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("keeps the chosen tab theme usable when storage reads and writes throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    render(wrapper());
    expect(document.documentElement.dataset.themePreference).toBe("system");
    choose("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("dark");
    expect(screen.getByRole("status").textContent).toBe(THEME_COPY.tr.sessionOnly);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains a failed-persistence notice across OS changes until a successful choice", () => {
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    render(wrapper());
    choose("system");
    expect(screen.getByRole("status").textContent).toBe(THEME_COPY.tr.sessionOnly);
    system(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("status").textContent).toBe(THEME_COPY.tr.sessionOnly);
    write.mockRestore();
    choose("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("normalizes invalid saved state, synchronizes same-key events and resets to system on removal", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    render(wrapper());
    expect(document.documentElement.dataset.themePreference).toBe("system");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "dark" })));
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" })));
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: null })));
    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("keeps a usable deterministic fallback when the media API is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(wrapper());
    expect(document.documentElement.dataset.theme).toBe("dark");
    choose("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("server-renders a stable control without reading browser preference APIs", () => {
    const saved = vi.spyOn(Storage.prototype, "getItem");
    const html = renderToString(wrapper());
    expect(html).toContain("system");
    expect(html).toContain("disabled");
    expect(saved).not.toHaveBeenCalled();
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("renders all 14 complete localized controls with exactly the three semantic choices", () => {
    const expected = ["tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar", "it", "id", "ko", "pl", "hi", "zh-Hans"];
    expect(Object.keys(THEME_COPY)).toEqual(expected);
    expect(new Set(SUPPORTED_LOCALES)).toEqual(new Set(expected));
    for (const locale of expected) {
      const copy = themeCopy(locale);
      expect(Object.keys(copy).sort()).toEqual(["label", "light", "dark", "system", "sessionOnly"].sort());
      for (const value of Object.values(copy)) expect(value.trim()).not.toBe("");
      const view = render(wrapper(locale));
      const selector = view.getByRole("combobox", { name: copy.label });
      expect(within(selector).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual(["system", "light", "dark"]);
      view.unmount();
    }
    expect(() => themeCopy("xx")).toThrow("Unsupported theme locale");
  });
});
