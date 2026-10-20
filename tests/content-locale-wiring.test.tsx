// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import LandingPage from "@/app/[locale]/page";
import { generateMetadata } from "@/app/[locale]/projects/[slug]/page";
import { ProofCard } from "@/components/common/ProofCard";
import type { ExperienceCopy, ExperienceProduct } from "@/components/experience/types";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { company } from "@/data/company";
import { SUPPORTED_LOCALES, localePath } from "@/i18n/locales";

// Distinguishable values test the actual consumers' language selection.
// These markers are not translation, browser, or native-speaker acceptance.
vi.mock("@/lib/localized", () => ({
  localized: (value: { tr: string; en: string }, locale: string) => `${locale}::${value.en}`,
  text: (locale: string, _tr: string, en: string, values?: Record<string, string | number>) =>
    `${locale}::${en}`.replace(/\{([^{}]+)\}/g, (token, key: string) =>
      values && key in values ? String(values[key]) : token),
}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ locale }: { locale: string }) => (key: string) => `${locale}:${key}`,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
vi.mock("@/components/experience/YulaExperience", () => ({ YulaExperience: () => null }));
vi.mock("@/components/projects/ProductPage", () => ({ ProductPage: () => null }));

afterEach(cleanup);

const claim = {
  id: "locale-contract", statementTr: "Kaynak iddia", statementEn: "Claim source",
  evidenceKind: "source-code-verified" as const,
  source: "ventures/source/record.ts", scopeTr: "Dar kapsam", scopeEn: "Narrow scope",
  owner: "fixture", verifiedAt: "2026-01-01", expiresAt: "2026-02-01",
};

describe.each(SUPPORTED_LOCALES)("content consumers in %s", (locale) => {
  it("joins all homepage products and provenance using the selected locale", async () => {
    const result = await LandingPage({ params: Promise.resolve({ locale }) });
    const { products, copy } = (result as ReactElement<{ products: ExperienceProduct[]; copy: ExperienceCopy }>).props;
    expect(copy.locale).toBe(locale);
    expect(products).toHaveLength(projects.length);
    for (const [index, product] of products.entries()) {
      const source = projects[index];
      const record = publicRegistry.find((item) => item.slug === source.slug)!;
      expect(product.category).toBe(`${locale}::${source.category.en}`);
      expect(product.tagline).toBe(`${locale}::${source.tagline.en}`);
      expect(product.short).toBe(`${locale}::${source.short.en}`);
      expect(product.href).toBe(localePath(locale, `/projects/${source.slug}`));
      for (const [claimIndex, item] of product.claims.entries()) {
        expect(item.statement).toBe(`${locale}::${record.claims[claimIndex].statementEn}`);
        expect(item.scope).toBe(`${locale}::${record.claims[claimIndex].scopeEn}`);
        expect(item.source).toBe(record.claims[claimIndex].source);
        expect(item.verifiedAt).toBe(record.claims[claimIndex].verifiedAt);
      }
      for (const [shotIndex, shot] of product.screenshots.entries()) {
        expect(shot.alt).toBe(`${locale}::${record.screenshots[shotIndex].altEn}`);
      }
    }
    expect(copy.mission.body).toBe(`${locale}::${company.mission.en}`);
    expect(copy.vision.body).toBe(`${locale}::${company.vision.en}`);
    expect(copy.values.items.map((item) => item.title)).toEqual(company.values.map((value) => `${locale}::${value.title.en}`));
  });

  it("publishes selected-locale project metadata and all approved alternates", async () => {
    const project = projects.find((item) => item.slug === "lifeos")!;
    const metadata = await generateMetadata({ params: Promise.resolve({ locale, slug: project.slug }) });
    expect(metadata.description).toBe(`${locale}::${project.tagline.en}`);
    expect(metadata.openGraph?.description).toBe(`${locale}::${project.description.en}`);
    expect(metadata.alternates?.canonical).toBe(localePath(locale, `/projects/${project.slug}`));
    expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual([...SUPPORTED_LOCALES]);
  });

  it("renders translated claim/source labels and preserves source IDs and dates", () => {
    render(<ProofCard presented={{ kind: "lapsed", claim, expiredOn: "2026-02-02" }} locale={locale} />);
    expect(screen.getByText(`${locale}::Claim source`)).toBeTruthy();
    expect(screen.getByText(`${locale}::verified in source code`)).toBeTruthy();
    expect(screen.getByText(`${locale}::Narrow scope`)).toBeTruthy();
    expect(screen.getByText(`${locale}::needs re-verification — window closed 2026-02-02`)).toBeTruthy();
    expect(screen.getByText(`${locale}::internal record: ventures/source/record.ts`)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

it("rejects an unsupported homepage locale before rendering", async () => {
  await expect(LandingPage({ params: Promise.resolve({ locale: "xx" }) })).rejects.toThrow("not found");
});
