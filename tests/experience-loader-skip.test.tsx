// @vitest-environment jsdom
// WEB-UX-05d. CI runners only expose software WebGL, where the product serves
// its static fallback and never draws the opening card, so the native-opening
// e2e tests are @hardware-webgl. This keeps the loader's skip contract covered
// on every CI run.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExperienceLoader } from "@/components/experience/ExperienceLoader";

const intl = vi.hoisted(() => ({ locale: "tr" }));
vi.mock("next-intl", () => ({
  useLocale: () => intl.locale,
  useTranslations: () => (key: string) => (key === "loaderSkip" ? "Girişi atla" : key),
}));

const lines = ["bir", "iki", "üç"] as never;

afterEach(() => {
  cleanup();
  intl.locale = "tr";
});

describe("ExperienceLoader skip", () => {
  it("draws no skip control without a handler (capture, reduced motion)", () => {
    render(<ExperienceLoader lines={lines} progress={0.2} />);
    expect(document.querySelector("[data-yula-loader-skip]")).toBeNull();
  });

  it("renders a real button that hands the card over on click", () => {
    const onSkip = vi.fn();
    render(<ExperienceLoader lines={lines} progress={0.2} onSkip={onSkip} />);
    const button = screen.getByRole("button", { name: "Girişi atla" });
    expect(button.hasAttribute("data-yula-loader-skip")).toBe(true);
    fireEvent.click(button);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("Escape skips once; an Escape another layer already claimed does not", () => {
    const onSkip = vi.fn();
    render(<ExperienceLoader lines={lines} progress={0.2} onSkip={onSkip} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onSkip).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSkip).toHaveBeenCalledOnce();

    const claim = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener("keydown", claim);
    fireEvent.keyDown(document.body, { key: "Escape" });
    document.removeEventListener("keydown", claim);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("removes the Escape listener on unmount", () => {
    const onSkip = vi.fn();
    const { unmount } = render(<ExperienceLoader lines={lines} progress={0.2} onSkip={onSkip} />);
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("marks the English fallback label outside tr and en (WCAG 3.1.2)", () => {
    intl.locale = "de";
    render(<ExperienceLoader lines={lines} progress={0.2} onSkip={() => undefined} />);
    expect(screen.getByRole("button", { name: "Girişi atla" }).getAttribute("lang")).toBe("en");
    cleanup();
    intl.locale = "tr";
    render(<ExperienceLoader lines={lines} progress={0.2} onSkip={() => undefined} />);
    expect(screen.getByRole("button", { name: "Girişi atla" }).hasAttribute("lang")).toBe(false);
  });

  it("keeps the live region on the readout only, not around the skip button", () => {
    render(<ExperienceLoader lines={lines} progress={0.2} onSkip={() => undefined} />);
    const button = screen.getByRole("button", { name: "Girişi atla" });
    expect(button.closest("[aria-live]")).toBeNull();
  });
});
