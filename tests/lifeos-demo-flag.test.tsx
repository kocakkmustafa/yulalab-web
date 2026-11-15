// @vitest-environment node
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { lifeosDemoEnabled } from "@/server/lifeos-demo-surface";
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

describe("LIFEOS_DEMO_ENABLED flag (WEB-P1-01)", () => {
  it("is off by default and only the exact value 1 turns it on", () => {
    expect(lifeosDemoEnabled()).toBe(false);
    for (const v of ["", "0", "true", "yes", "on"]) {
      vi.stubEnv("LIFEOS_DEMO_ENABLED", v);
      expect(lifeosDemoEnabled(), v).toBe(false);
    }
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "1");
    expect(lifeosDemoEnabled()).toBe(true);
  });

  it.each(["tr", "en"] as const)("%s: flag off leaves the LifeOS page without the demo", (locale) => {
    const out = html("lifeos", locale);
    expect(out).not.toContain("lifeos-decision-demo");
    expect(out).not.toContain("lazy-demo-body");
  });

  it.each(["tr", "en"] as const)("%s: flag on shows the demo section on LifeOS only", (locale) => {
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "1");
    const out = html("lifeos", locale);
    expect(out).toContain('data-testid="lifeos-decision-demo"');
    expect(out).toContain(locale === "tr" ? "Sentetik karar ve hatırlatma denemesi" : "Synthetic decision and reminder try-out");
    expect(out).toContain('lang="' + locale + '"');
    for (const p of projects.filter((x) => x.slug !== "lifeos")) {
      expect(html(p.slug, locale), p.slug).not.toContain("lifeos-decision-demo");
    }
  });

  it("other locales show the English copy marked lang=en dir=ltr", () => {
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "1");
    const out = html("lifeos", "de");
    expect(out).toMatch(/<section[^>]*data-testid="lifeos-decision-demo"[^>]*>/);
    const tag = out.match(/<section[^>]*data-testid="lifeos-decision-demo"[^>]*>/)![0];
    expect(tag).toContain('lang="en"');
    expect(tag).toContain('dir="ltr"');
  });
});
