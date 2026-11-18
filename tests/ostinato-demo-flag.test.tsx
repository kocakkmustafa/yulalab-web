// @vitest-environment node
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { ostinatoDemoEnabled } from "@/server/ostinato-demo-surface";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({ Link: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img"> & { fill?: boolean }) => <img alt={alt} src={src} />,
}));
// The real component is a lazy client chunk; this test is about whether it is rendered at all.
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="lazy-demo-body" /> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/ScrollMarquee", () => ({ ScrollMarquee: () => null }));

afterEach(() => vi.unstubAllEnvs());

function html(slug: string, locale: "tr" | "en" | "de") {
  const project = projects.find((p) => p.slug === slug)!;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      <ProductPage project={project} />
    </NextIntlClientProvider>,
  );
}

describe("OSTINATO_DEMO_ENABLED flag (WEB-P1-02)", () => {
  it("is off by default and only the exact value 1 turns it on", () => {
    expect(ostinatoDemoEnabled()).toBe(false);
    for (const v of ["", "0", "true", "yes", "on"]) {
      vi.stubEnv("OSTINATO_DEMO_ENABLED", v);
      expect(ostinatoDemoEnabled(), v).toBe(false);
    }
    vi.stubEnv("OSTINATO_DEMO_ENABLED", "1");
    expect(ostinatoDemoEnabled()).toBe(true);
  });

  it.each(["tr", "en"] as const)("%s: flag off leaves the Ostinato page without the demo", (locale) => {
    const out = html("ostinato", locale);
    expect(out).not.toContain("ostinato-rhythm-demo");
    expect(out).not.toContain("lazy-demo-body");
  });

  it.each(["tr", "en"] as const)("%s: flag on shows the demo section on Ostinato only", (locale) => {
    vi.stubEnv("OSTINATO_DEMO_ENABLED", "1");
    const out = html("ostinato", locale);
    expect(out).toContain('data-testid="ostinato-rhythm-demo"');
    expect(out).toContain(locale === "tr" ? "Ritim hissi denemesi" : "Rhythm feel try-out");
    expect(out).toContain('lang="' + locale + '"');
    for (const p of projects.filter((x) => x.slug !== "ostinato")) {
      expect(html(p.slug, locale), p.slug).not.toContain("ostinato-rhythm-demo");
    }
  });

  it("other locales show the translated copy marked with their own lang, not en/ltr", () => {
    vi.stubEnv("OSTINATO_DEMO_ENABLED", "1");
    const out = html("ostinato", "de");
    expect(out).toMatch(/<section[^>]*data-testid="ostinato-rhythm-demo"[^>]*>/);
    const tag = out.match(/<section[^>]*data-testid="ostinato-rhythm-demo"[^>]*>/)![0];
    expect(tag).toContain('lang="de"');
    expect(tag).not.toContain('lang="en"');
    expect(tag).not.toContain('dir="ltr"');
  });
});
