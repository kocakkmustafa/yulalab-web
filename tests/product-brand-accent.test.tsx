// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { brandInk } from "@/lib/brand-ink";
import { composite, contrast, readGlobalsCss, toRgb } from "../scripts/contrast-audit";
import tr from "../messages/tr.json";

vi.mock("@/i18n/navigation", () => ({ Link: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
afterEach(cleanup);

const css = readGlobalsCss();
const bySlug = (s: string) => projects.find((p) => p.slug === s)!;

describe("brand foreground CSS picks the right tint per theme", () => {
  it("dark default uses --brand-d, data-theme=light and the media fallback use --brand-l", () => {
    expect(css).toMatch(/\[data-brand-fg\], \[data-brand-var\] \{ --brand-fg: var\(--brand-d\); \}/);
    expect(css).toMatch(/:root\[data-theme="light"\] :is\(\[data-brand-fg\], \[data-brand-var\]\) \{ --brand-fg: var\(--brand-l\); \}/);
    expect(css).toMatch(/prefers-color-scheme: light\) \{ :root:not\(\[data-theme\]\) :is\(\[data-brand-fg\], \[data-brand-var\]\) \{ --brand-fg: var\(--brand-l\); \} \}/);
  });
  it("brandInk exposes both tints; products without a dark tint keep one colour", () => {
    const o = brandInk(bySlug("ostinato").brand) as Record<string, string>;
    expect([o["--brand-d"], o["--brand-l"]]).toEqual(["#8F82BD", "#5F4CA0"]);
    const b = brandInk(bySlug("burunfarki").brand, 87) as Record<string, string>;
    expect(b["--brand-d"]).toBe(b["--brand-l"]);
    expect(b["--brand-a"]).toBe("87%");
  });
});

describe("product page accent follows the app colour", () => {
  it.each(["ostinato", "lifeos"])("%s page wires --accent to the theme-resolved brand colour", (slug) => {
    const { container } = render(
      <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul"><ProductPage project={bySlug(slug)} /></NextIntlClientProvider>,
    );
    const root = container.querySelector("[data-brand-var]") as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue("--accent")).toBe("var(--brand-fg)");
    expect(root.style.getPropertyValue("--brand-l")).toBe(bySlug(slug).brand.primary);
    expect(root.style.getPropertyValue("--brand-d")).toBe(bySlug(slug).brand.primaryOnDark);
  });
  it("other products keep their own accent", () => {
    const { container } = render(
      <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul"><ProductPage project={bySlug("burunfarki")} /></NextIntlClientProvider>,
    );
    expect(container.querySelector("[data-brand-var]")).toBeNull();
  });
});

describe("OG card + dark monogram glyph on the app-colour gradient", () => {
  const STOPS: Record<string, [string, number][]> = {
    ostinato: [["#5F4CA0", 0], ["#E8C87A", 55], ["#8B5E3C", 100]],
    lifeos: [["#76558F", 0], ["#E9B3FF", 60], ["#FFB3B5", 100]],
  };
  const at = (stops: [string, number][], p: number) => {
    for (let i = 0; i < stops.length - 1; i += 1) {
      if (p <= stops[i + 1][1]) {
        const t = (p - stops[i][1]) / (stops[i + 1][1] - stops[i][1]);
        return toRgb(stops[i][0]).map((c, k) => c + (toRgb(stops[i + 1][0])[k] - c) * t) as [number, number, number];
      }
    }
    return toRgb(stops[stops.length - 1][0]);
  };
  it.each(["ostinato", "lifeos"])("%s: dark glyph keeps >=3:1 (large) / >=4.5:1 (OG 'YL') across the glyph band 30-70%", (slug) => {
    for (let p = 30; p <= 70; p += 5) {
      const bg = at(STOPS[slug], p);
      expect(contrast(composite(bg, [0, 0, 0, 0.55]), bg)).toBeGreaterThanOrEqual(3); // card monogram, 120px+
      expect(contrast(toRgb(bySlug(slug).brand.background), bg)).toBeGreaterThanOrEqual(4.5); // OG badge
    }
  });
  it.each(["ostinato", "lifeos"])("%s: OG accent on its dark background is >=4.5:1", (slug) => {
    const b = bySlug(slug).brand;
    expect(contrast(toRgb(b.primaryOnDark ?? b.primary), toRgb(b.background))).toBeGreaterThanOrEqual(4.5);
  });
});
