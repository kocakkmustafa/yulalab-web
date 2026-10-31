// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ProductFaq, ProductFeatures } from "@/components/projects/ProductShowcase";
import { productShowcase, SHOWCASE_LABELS } from "@/data/product-showcase";
import { projects } from "@/data/projects";

vi.mock("@/components/common/Reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

const SHOWCASED = ["lifeos", "braavolabs", "ostinato", "jablab", "gravita", "lissom", "choreia"];

describe("finished-product showcase", () => {
  it("covers every showcased product with features and questions", () => {
    for (const slug of SHOWCASED) {
      expect(projects.some((project) => project.slug === slug), slug).toBe(true);
      expect(productShowcase[slug]?.features.length, slug).toBeGreaterThanOrEqual(4);
      expect(productShowcase[slug]?.faq.length, slug).toBeGreaterThanOrEqual(3);
    }
    expect(productShowcase.burunfarki).toBeUndefined();
  });

  // The privacy pages rule these out for the shipped apps today (camera
  // coaching off, AI only for approved text, no cloud memory). A feature
  // that describes them must stay labelled until the release carries it.
  it("keeps capabilities the legal pages rule out today on the roadmap", () => {
    const legalScope = /camera (coaching|follows)|suggests entries|mentor|coding agent|scheduled|tuner|note feedback|690/i;
    for (const [slug, showcase] of Object.entries(productShowcase)) {
      for (const feature of showcase.features) {
        const english = `${feature.title.en} ${feature.body.en}`;
        if (legalScope.test(english)) expect(feature.roadmap, `${slug}: ${feature.title.en}`).toBe(true);
      }
    }
  });

  it("labels roadmap features, and only those, in the visitor's language", () => {
    for (const locale of ["tr", "en", "de"] as const) {
      const { container } = render(<ProductFeatures slug="ostinato" locale={locale} />);
      const items = Array.from(container.querySelectorAll("li"));
      const expected = productShowcase.ostinato.features.map((feature) => Boolean(feature.roadmap));
      expect(items.map((item) => item.dataset.roadmap === "true")).toEqual(expected);
      const label = locale === "tr" ? SHOWCASE_LABELS.roadmap.tr : locale === "en" ? SHOWCASE_LABELS.roadmap.en : null;
      const labelled = items.filter((item) => item.dataset.roadmap === "true");
      for (const item of labelled) {
        const chip = item.querySelector("p");
        expect(chip?.textContent?.trim()).toBeTruthy();
        if (label) expect(chip?.textContent).toBe(label);
      }
      for (const item of items.filter((item) => item.dataset.roadmap !== "true")) {
        expect(within(item).queryByText(SHOWCASE_LABELS.roadmap.en)).toBeNull();
        expect(within(item).queryByText(SHOWCASE_LABELS.roadmap.tr)).toBeNull();
      }
      cleanup();
    }
  });

  it("renders the questions as native disclosure widgets", () => {
    render(<ProductFaq slug="lifeos" locale="en" />);
    expect(screen.getByRole("heading", { name: SHOWCASE_LABELS.faq.en })).toBeTruthy();
    for (const item of productShowcase.lifeos.faq) {
      expect(screen.getByText(item.question.en).closest("summary")).not.toBeNull();
    }
  });

  it("renders nothing for a product without a showcase", () => {
    const { container } = render(<ProductFeatures slug="burunfarki" locale="en" />);
    expect(container.innerHTML).toBe("");
  });
});
