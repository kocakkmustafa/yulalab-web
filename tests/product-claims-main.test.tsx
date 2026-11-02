// @vitest-environment jsdom
import type { ReactNode } from "react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ProductFeatures } from "@/components/projects/ProductShowcase";
import { productShowcase, SHOWCASE_LABELS } from "@/data/product-showcase";
import { ostinato } from "@/data/projects/ostinato";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

vi.mock("@/components/common/Reveal", () => ({
  Reveal: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

afterEach(cleanup);

const catalogue = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")) as {
    product: Record<string, Record<string, string>>;
    status: Record<string, string>;
  };

// Stale-claim fixes of 2026-11-02, checked against each product's main
// branch: Ostinato ships the 240-lesson guitar course only (voice, piano and
// ear training are not bundled yet) and its first guitar level (40 lessons)
// is free; Braavolabs desktop and CLI are built but not published.
describe("product claims follow the main branches", () => {
  it("never offers Ostinato courses the app does not carry yet", () => {
    const en = catalogue("en").product.ostinato;
    const copy = [en.lede, en.a1Title, en.a1Body, en.a2Title, en.a2Body, en.r1v, ostinato.short.en, ostinato.description.en].join(" ");
    expect(copy).not.toMatch(/ear training level 1|four courses|every course opens with free lessons/i);
    expect(copy).toMatch(/240 lessons/);
    expect(copy).toMatch(/40 lessons/);
    expect(copy).toMatch(/coming soon/i);
    const tr = catalogue("tr").product.ostinato;
    expect([tr.a1Title, tr.a2Title, tr.r1v].join(" ")).not.toMatch(/Kulak eğitimi|Dört kurs/);
  });

  it.each(SUPPORTED_LOCALES)("states the 40 free guitar lessons in %s", (locale) => {
    expect(catalogue(locale).product.ostinato.r1v).toMatch(/40/);
  });

  it("labels Braavolabs desktop and terminal as coming soon, not as shipped or roadmap", () => {
    const feature = productShowcase.braavolabs.features.find((candidate) => candidate.title.en === "Desktop and terminal.");
    expect(feature?.soon).toBe(true);
    expect(feature?.roadmap).toBeUndefined();
  });

  it.each(["tr", "en", "de", "ja"] as const)("renders the coming-soon chip in %s", (locale) => {
    const { container } = render(<ProductFeatures slug="braavolabs" locale={locale} />);
    const soon = container.querySelectorAll('li[data-soon="true"]');
    expect(soon).toHaveLength(1);
    const chip = soon[0].querySelector("p")?.textContent?.trim();
    expect(chip).toBeTruthy();
    if (locale === "tr") expect(chip).toBe(SHOWCASE_LABELS.soon.tr);
    if (locale === "en") expect(chip).toBe(SHOWCASE_LABELS.soon.en);
    // The chip reads the same as the site's own "Coming soon" status pill.
    expect(chip).toBe(catalogue(locale).status.comingSoon);
  });
});
