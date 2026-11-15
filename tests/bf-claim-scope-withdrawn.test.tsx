// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { buildRegistryExport } from "@/lib/public-registry";
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

// Founder decision 2026-11-15 (2a): withdrawing the Burun Farkı claim also
// withdraws the product-page screenshots, the fixed stats and their scope text.
function html(slug: string, locale: "tr" | "en") {
  const project = projects.find((p) => p.slug === slug)!;
  const { container } = render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      <ProductPage project={project} />
    </NextIntlClientProvider>,
  );
  return container;
}

describe.each(["tr", "en"] as const)("Burun Farkı product page carries no claim (%s)", (locale) => {
  it("has no accuracy figure, no Top-1/Top-3 wording and no claim screenshot in the HTML", () => {
    const markup = html("burunfarki", locale).innerHTML;
    for (const needle of ["screenshot-honest-stats", "screenshot-daily-history", "1.225", "1,225", "%29", "%62", "29%", "62%", "Top-1", "Top-3"]) {
      expect(markup, needle).not.toContain(needle);
    }
  });

  it("renders the honest empty state, not an empty gallery or a broken card", () => {
    const container = html("burunfarki", locale);
    expect(container.querySelector("#ekran img")).toBeNull();
    expect(container.querySelector("#ekran ul")).toBeNull();
    expect(container.querySelector('[data-testid="screen-empty"]')?.textContent?.trim()).toBeTruthy();
  });
});

describe("the other products keep their screenshots", () => {
  it.each(["braavolabs", "lifeos", "ostinato"])("%s renders exactly the product shots its config declares", (slug) => {
    const project = projects.find((p) => p.slug === slug)!;
    const declared = project.visuals.screenshots.filter((s) => s.kind === "product");
    const container = html(slug, "en");
    expect(container.querySelectorAll("#ekran li img")).toHaveLength(declared.length);
  });

  it("braavolabs still shows its two real captures", () => {
    const braavolabs = projects.find((p) => p.slug === "braavolabs")!;
    expect(braavolabs.visuals.screenshots.filter((s) => s.kind === "product")).toHaveLength(2);
  });
});

describe("Burun Farkı data surfaces carry no figure", () => {
  const bf = projects.find((p) => p.slug === "burunfarki")!;
  const record = publicRegistry.find((r) => r.slug === "burunfarki")!;

  it("config has no product screenshot, no stats and no numeric feature text", () => {
    expect(bf.visuals.screenshots.filter((s) => s.kind === "product")).toEqual([]);
    expect(bf.stats).toEqual([]);
    const text = JSON.stringify([bf.features, bf.description, bf.short]);
    for (const needle of ["1.225", "1,225", "69 g", "69-day", "%29", "%62"]) expect(text, needle).not.toContain(needle);
  });

  it("registry declares no screenshots for it, so the linear experience and prototype page show none", () => {
    expect(record.screenshots).toEqual([]);
  });
});

describe("registry export withholds scope together with the statement", () => {
  const afterAll = new Date("2099-01-01T12:00:00+03:00");
  const exported = buildRegistryExport(publicRegistry, afterAll).products;

  it("every withheld claim, of any product, has empty statement and empty scope", () => {
    const claims = exported.flatMap((p) => p.claims);
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(claim.presentation).toBe("withheld");
      expect(claim.scopeTr, claim.id).toBe("");
      expect(claim.scopeEn, claim.id).toBe("");
      expect(claim.statementTr).toBe("");
      expect(claim.statementEn).toBe("");
    }
  });

  it("covers LifeOS and Braavolabs when they lapse, not only Burun Farkı", () => {
    for (const slug of ["lifeos", "braavolabs"]) {
      const claims = exported.find((p) => p.slug === slug)!.claims;
      expect(claims.length).toBeGreaterThan(0);
      for (const claim of claims) expect([claim.scopeTr, claim.scopeEn]).toEqual(["", ""]);
    }
  });

  it("a presentable claim keeps its scope untouched", () => {
    const early = buildRegistryExport(publicRegistry, new Date("2026-11-14T12:00:00+03:00")).products;
    const lifeos = publicRegistry.find((r) => r.slug === "lifeos")!.claims[0];
    expect(early.find((p) => p.slug === "lifeos")!.claims[0].scopeEn).toBe(lifeos.scopeEn);
  });

  it("the Burun Farkı scope text (69-day / 1,225-race window) is absent from the committed JSON", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const file = readFileSync(join(process.cwd(), "public/portfolio-registry.json"), "utf8");
    expect(file).not.toContain("1,225");
    expect(file).not.toContain("1.225");
    expect(file).not.toContain("screenshot-honest-stats");
  });
});
