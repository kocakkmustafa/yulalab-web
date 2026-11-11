// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
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

afterEach(cleanup);

// WEB-P0-06: the flagship product template must show the RIGHT status for
// every product. The expectation table below is written out by hand on
// purpose: deriving it from the data under test would let a wrong status
// pass. It mirrors the registry lifecycle (publicRegistry) as of
// 2026-11-11: two live, one beta, five not yet published.
type PillKey = "live" | "beta" | "comingSoon";
const EXPECTED: Record<string, { lifecycle: string; pill: PillKey }> = {
  braavolabs: { lifecycle: "beta", pill: "beta" },
  burunfarki: { lifecycle: "live", pill: "live" },
  lifeos: { lifecycle: "live", pill: "live" },
  gravita: { lifecycle: "research", pill: "comingSoon" },
  lissom: { lifecycle: "research", pill: "comingSoon" },
  jablab: { lifecycle: "research", pill: "comingSoon" },
  ostinato: { lifecycle: "research", pill: "comingSoon" },
  choreia: { lifecycle: "research", pill: "comingSoon" },
};

function renderProduct(slug: string, locale: "tr" | "en") {
  const project = projects.find((p) => p.slug === slug)!;
  const messages = locale === "tr" ? tr : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
      <ProductPage project={project} />
    </NextIntlClientProvider>,
  );
}

describe("product page shows the correct status per product", () => {
  it("the hand-written table covers exactly the registered products", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(projects.map((p) => p.slug).sort());
    expect(Object.keys(EXPECTED).sort()).toEqual(publicRegistry.map((r) => r.slug).sort());
  });

  it.each(Object.entries(EXPECTED))("%s: registry lifecycle is %j", (slug, expected) => {
    expect(publicRegistry.find((r) => r.slug === slug)!.lifecycle).toBe(expected.lifecycle);
  });

  describe.each(["tr", "en"] as const)("%s", (locale) => {
    const messages = locale === "tr" ? tr : en;

    it.each(Object.entries(EXPECTED))("%s: hero pill and #durum section say the expected status", (slug, expected) => {
      const { container } = renderProduct(slug, locale);
      const label = messages.status[expected.pill];
      const wrong = (["live", "beta", "comingSoon"] as const)
        .filter((key) => key !== expected.pill)
        .map((key) => messages.status[key])
        .filter((text) => text !== label);

      // (1) hero pill + (6) release-status section carry the same label.
      const durum = container.querySelector("#durum");
      expect(durum, `${slug}: #durum section missing`).not.toBeNull();
      expect(within(durum as HTMLElement).getByText(label)).toBeTruthy();

      // StatusPill is the only <span> that renders a status label; other
      // "Coming soon" strings on the page are per-feature roadmap tags (<p>),
      // not the product's publication status.
      const pills = Array.from(container.querySelectorAll("span"))
        .map((el) => el.textContent?.trim())
        .filter((text): text is string => [label, ...wrong].includes(text ?? ""));
      expect(pills.length, `${slug}: expected hero + #durum pills`).toBeGreaterThanOrEqual(2);
      expect(pills.every((text) => text === label), `${slug}: pills ${JSON.stringify(pills)} ≠ "${label}"`).toBe(true);
    });

    it.each(Object.entries(EXPECTED).filter(([, v]) => v.pill === "comingSoon"))(
      "%s: not published, so no store link is offered",
      (slug) => {
        const { container } = renderProduct(slug, locale);
        expect(container.querySelector('a[href*="apps.apple.com"], a[href*="play.google.com"]')).toBeNull();
      },
    );
  });
});
