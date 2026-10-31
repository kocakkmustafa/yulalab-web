// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { lifeos } from "@/data/projects/lifeos";
import { burunfarki } from "@/data/projects/burunfarki";
import { braavolabs } from "@/data/projects/braavolabs";
import { publicRegistry } from "@/data/public-registry";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("@/components/common/Reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Founder decision 2026-10-31: the product page introduces the finished
// product. Publication status, dated claims and their freshness moved to
// /transparency, so the page reads the same before and after a registry
// window lapses, and the store link stays in place.
describe.each(["tr", "en"] as const)("%s product page without publication status", (locale) => {
  const messages = locale === "tr" ? tr : en;
  const surface = publicRegistry.find((record) => record.slug === "lifeos")!
    .surfaces.find((candidate) => candidate.kind === "ios")!;

  function renderAt(project: typeof lifeos, instant: Date) {
    vi.useFakeTimers();
    vi.setSystemTime(instant);
    render(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
        <ProductPage project={project} />
      </NextIntlClientProvider>,
    );
  }

  it.each([
    ["before", `${surface.expiresAt}T12:00:00+03:00`],
    ["long after", "2027-06-01T12:00:00+03:00"],
  ])("keeps the product title and store link %s the registry window", (_label, instant) => {
    renderAt(lifeos, new Date(instant));
    expect(screen.getByRole("heading", { name: messages.product.lifeos.ctaTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: messages.product.lifeos.ctaPrimary }).getAttribute("href")).toBe(surface.url);
    expect(screen.queryByText(messages.product.availabilityUnverified)).toBeNull();
    expect(screen.queryByRole("heading", { name: messages.product.claimsHeading })).toBeNull();
  });

  it("states no publication status in the eyebrows of released products", () => {
    for (const project of [lifeos, burunfarki, braavolabs]) {
      renderAt(project, new Date("2027-06-01T12:00:00+03:00"));
      const eyebrow = messages.product[project.slug as "lifeos" | "burunfarki" | "braavolabs"].eyebrow;
      expect(screen.getByText(eyebrow)).toBeTruthy();
      expect(eyebrow).not.toMatch(/canlı|yayında|beta|önizleme|live|preview/i);
      cleanup();
    }
  });
});
