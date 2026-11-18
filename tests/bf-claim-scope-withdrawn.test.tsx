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

// Founder decision 2026-11-18: the Burun Farkı product page is removed, so no
// surface (projects list, registry, product page) can render a Burun Farkı figure.
describe("Burun Farkı is no longer a product on the site", () => {
  it("is absent from the projects list and from the public registry", () => {
    expect(projects.some((p) => p.slug === "burunfarki")).toBe(false);
    expect(publicRegistry.some((r) => r.slug === "burunfarki")).toBe(false);
  });
});

describe("the other products keep their screenshots", () => {
  it.each(["braavolabs", "lifeos", "ostinato"])("%s renders exactly the product shots its config declares", (slug) => {
    const project = projects.find((p) => p.slug === slug)!;
    const declared = project.visuals.screenshots.filter((s) => s.kind === "product");
    const container = html(slug, "en");
    // Design previews (data-design-previews) are not product shots and are counted separately.
    const shots = [...container.querySelectorAll("#ekran li img")].filter((img) => !img.closest("[data-design-previews]"));
    expect(shots).toHaveLength(declared.length);
  });

  it("braavolabs declares no product capture after Y2 was removed (design previews are separate)", () => {
    const braavolabs = projects.find((p) => p.slug === "braavolabs")!;
    expect(braavolabs.visuals.screenshots.filter((s) => s.kind === "product")).toHaveLength(0);
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

describe("the withdrawn Burun Farkı claim screenshots are gone from the repository", () => {
  it("public/projects/burunfarki has neither capture (nothing can serve a Top-1/Top-3 image)", async () => {
    const { existsSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "public/projects/burunfarki");
    expect(existsSync(join(dir, "screenshot-honest-stats.png"))).toBe(false);
    expect(existsSync(join(dir, "screenshot-daily-history.png"))).toBe(false);
    expect(readdirSync(dir).filter((f) => f.startsWith("screenshot-"))).toEqual([]);
  });

  it("the published-files manifest no longer lists them", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const manifest = readFileSync(join(process.cwd(), ".github/ci/published-files.json"), "utf8");
    expect(manifest).not.toContain("burunfarki/screenshot-");
  });
});
