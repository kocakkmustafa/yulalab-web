// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

const navigation = vi.hoisted(() => ({
  locale: "tr", pathname: "/privacy/motion", replace: vi.fn(),
}));
vi.mock("next-intl", () => ({ useLocale: () => navigation.locale, useTranslations: () => () => "Language" }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));
afterEach(() => {
  cleanup();
  navigation.replace.mockClear();
  navigation.locale = "tr";
  window.history.replaceState({}, "", "/");
});

describe("LocaleSwitcher", () => {
  it("exposes all fourteen self-named choices in compact mode", () => {
    render(<LocaleSwitcher compact />);
    expect(screen.getAllByRole("option")).toHaveLength(SUPPORTED_LOCALES.length);
    expect(screen.getByRole("option", {name:"العربية"}).getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("option", {name:"日本語"}).getAttribute("lang")).toBe("ja");
    expect(screen.getByRole("option", {name:"简体中文"}).getAttribute("lang")).toBe("zh-Hans");
  });
  it.each(SUPPORTED_LOCALES)("keeps the account deletion section when leaving %s", (locale) => {
    navigation.locale = locale;
    window.history.replaceState({}, "", "/privacy/motion#motion-account-deletion");
    const onNavigate = vi.fn();
    render(<LocaleSwitcher onNavigate={onNavigate} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: locale === "tr" ? "en" : "tr" } });
    expect(navigation.replace).toHaveBeenCalledWith(
      "/privacy/motion#motion-account-deletion", { locale: locale === "tr" ? "en" : "tr" },
    );
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("does not propagate query values to a different locale", () => {
    window.history.replaceState({}, "", "/privacy/motion?email=private%40example.com#motion-account-deletion");
    render(<LocaleSwitcher />);
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "en" } });
    expect(navigation.replace).toHaveBeenCalledWith(
      "/privacy/motion#motion-account-deletion", { locale: "en" },
    );
  });
});
