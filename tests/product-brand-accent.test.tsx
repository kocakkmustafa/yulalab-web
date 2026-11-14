// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { brandInk, monogramPanel } from "@/lib/brand-ink";
import { ProjectCard } from "@/components/landing/ProjectCard";
import fs from "node:fs";
import path from "node:path";
import { composite, contrast, readGlobalsCss, toRgb } from "../scripts/contrast-audit";
import tr from "../messages/tr.json";

vi.mock("@/i18n/navigation", () => ({ Link: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
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
  it.each(["burunfarki", "braavolabs"])("%s keeps its ACCENT-map accent (no theme wiring)", (slug) => {
    const { container } = render(
      <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul"><ProductPage project={bySlug(slug)} /></NextIntlClientProvider>,
    );
    expect(container.querySelector("[data-brand-var]")).toBeNull();
    const expected = { burunfarki: "#7FD8B0", braavolabs: "#D8B87F" }[slug as "burunfarki" | "braavolabs"];
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--accent").toLowerCase()).toBe(expected.toLowerCase());
  });
});

describe("data-brand-fg stays on the consumers", () => {
  const copy = { category: "c", tagline: "t", short: "s" };
  it.each(["ostinato", "lifeos"])("%s: compact and big ProjectCard carry data-brand-fg with the dark tint", (slug) => {
    const project = bySlug(slug);
    for (const props of [{ variant: "compact" as const }, { variant: "big" as const, index: 0, total: 2 }]) {
      const { container, unmount } = render(
        <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul"><ProjectCard project={project} copy={copy} {...props} /></NextIntlClientProvider>,
      );
      const el = container.querySelector("[data-brand-fg]") as HTMLElement;
      expect(el, `${props.variant}`).toBeTruthy();
      expect(el.style.getPropertyValue("--brand-d")).toBe(project.brand.primaryOnDark);
      unmount();
    }
  });
  it("transparency page keeps data-brand-fg on all three brand-coloured spots", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../src/app/[locale]/transparency/page.tsx"), "utf8");
    expect(src.match(/data-brand-fg="true"/g)?.length).toBe(3);
    expect(src.match(/brandInk\(/g)?.length).toBeGreaterThanOrEqual(3);
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
  // Real BigCard layers: gradient at monogramPanel opacity over brand.background,
  // glyph on top, then the card's black overlay (from-black/60 via-black/10 to-black/30,
  // so 0.10-0.35 across the glyph's vertical extent) over both.
  it.each(["ostinato", "lifeos"])("%s: card monogram glyph keeps >=3:1 on the real layer stack, glyph band 30-70%", (slug) => {
    const { gradientOpacity, glyphAlpha } = monogramPanel(bySlug(slug).brand);
    for (let p = 30; p <= 70; p += 5) for (const overlay of [0.1, 0.2, 0.35]) {
      const base = composite(toRgb(bySlug(slug).brand.background), [...at(STOPS[slug], p), gradientOpacity] as [number, number, number, number]);
      const glyph = composite(base, [0, 0, 0, glyphAlpha]);
      expect(contrast(composite(glyph, [0, 0, 0, overlay]), composite(base, [0, 0, 0, overlay]))).toBeGreaterThanOrEqual(3);
    }
  });
  it.each(["ostinato", "lifeos"])("%s: OG 'YL' badge glyph keeps >=4.5:1 across the band 30-70%", (slug) => {
    for (let p = 30; p <= 70; p += 5) {
      const bg = at(STOPS[slug], p);
      expect(contrast(toRgb(bySlug(slug).brand.background), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it.each(["ostinato", "lifeos"])("%s: OG accent on its dark background is >=4.5:1", (slug) => {
    const b = bySlug(slug).brand;
    expect(contrast(toRgb(b.primaryOnDark ?? b.primary), toRgb(b.background))).toBeGreaterThanOrEqual(4.5);
  });
});
