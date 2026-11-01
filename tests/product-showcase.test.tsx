// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ProductCompany, ProductFaq, ProductFeatures, ProductPrice } from "@/components/projects/ProductShowcase";
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
  // coaching off, AI only for approved text, no cloud memory), or the
  // product's main branch does not carry them yet. A feature that describes
  // them must stay labelled until the release carries it.
  it("keeps capabilities the legal pages rule out today on the roadmap", () => {
    const legalScope = /camera (coaching|follows)|suggests entries|mentor|coding agent|MIDI|placement test|progress sync/i;
    for (const [slug, showcase] of Object.entries(productShowcase)) {
      for (const feature of showcase.features) {
        const english = `${feature.title.en} ${feature.body.en}`;
        if (legalScope.test(english)) expect(feature.roadmap, `${slug}: ${feature.title.en}`).toBe(true);
      }
    }
  });

  // The opposite staleness: once a capability is merged into the product's
  // main branch (Ostinato #12, #14, #15; LifeOS cross-area insights;
  // Braavolabs desktop, CLI and scheduled pipelines), it must not keep its
  // roadmap label.
  it("does not label capabilities the main branches already carry as roadmap", () => {
    const shipped: Record<string, string[]> = {
      ostinato: ["Honest note feedback.", "Metronome, moving tab and loops.", "A setup wizard.", "A built-in tuner.", "Alternate tunings.", "Streaks and a weekly goal."],
      lifeos: ["Connections across areas."],
      braavolabs: ["Multi-model chat.", "Scheduled tasks.", "Desktop and terminal."],
    };
    for (const [slug, titles] of Object.entries(shipped)) {
      for (const title of titles) {
        const feature = productShowcase[slug]!.features.find((candidate) => candidate.title.en === title);
        expect(feature, `${slug}: ${title}`).toBeDefined();
        expect(feature!.roadmap, `${slug}: ${title}`).toBeUndefined();
      }
    }
  });

  // Founder-approved microphone text (Ostinato #13): audio is not uploaded;
  // a recording the user chooses to hear back stays on the device and is
  // deleted when the session ends. "Not recorded" would contradict it.
  it("states the approved microphone scope for Ostinato", () => {
    const ostinato = productShowcase.ostinato!;
    const copy = [...ostinato.features.map((f) => f.body), ...ostinato.faq.map((q) => q.answer)];
    for (const text of copy) {
      expect(text.en).not.toMatch(/not recorded/i);
      expect(text.tr).not.toMatch(/kaydedilmez/);
    }
    expect(copy.some((text) => /deleted when the session ends/.test(text.en))).toBe(true);
    expect(copy.some((text) => /oturum sonunda silinir/.test(text.tr))).toBe(true);
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

  it("draws Braavolabs' Company as a labelled org chart under the General Manager", () => {
    const company = productShowcase.braavolabs.company!;
    expect(company.roadmap).toBe(true);
    render(<ProductCompany slug="braavolabs" locale="tr" />);
    expect(screen.getByRole("heading", { name: "Şirket" })).toBeTruthy();
    expect(screen.getByText(SHOWCASE_LABELS.roadmap.tr)).toBeTruthy();
    const org = screen.getByRole("list", { name: company.head.name.tr });
    const names = Array.from(org.querySelectorAll("li > div")).map((node) => node.textContent);
    expect(names).toEqual([
      "Pazar Analisti",
      "İçerik ve Sosyal Medya Sorumlusu",
      "Müşteri Sesi Analisti",
      "Finans Takipçisi",
      "Teknik Lider",
      "Sürüm ve Bağımlılık Takipçisi",
    ]);
    cleanup();
    const { container } = render(<ProductCompany slug="lifeos" locale="en" />);
    expect(container.innerHTML).toBe("");
  });

  // Founder decision K6 (2026-10-31): one store-app price, TRY in Turkish and
  // USD elsewhere; Braavolabs Individual is monthly only; coming-soon apps
  // keep their label beside the price.
  it("shows the approved prices in the visitor's currency", () => {
    const text = (slug: string, locale: "tr" | "en" | "de", comingSoon?: string) => {
      const { container } = render(<ProductPrice slug={slug} locale={locale} comingSoon={comingSoon} />);
      const content = container.textContent ?? "";
      cleanup();
      return content;
    };
    const ostinatoTr = text("ostinato", "tr", "Yakında");
    expect(ostinatoTr).toContain("₺299,99");
    expect(ostinatoTr).toContain("₺1.499,99");
    expect(ostinatoTr).toContain("Yakında");
    expect(ostinatoTr).not.toContain("$");
    const lifeosEn = text("lifeos", "en");
    expect(lifeosEn).toContain("$11.99");
    expect(lifeosEn).toContain("$69.99");
    expect(lifeosEn).not.toContain("Coming soon");
    expect(text("gravita", "de")).toMatch(/11,99\s?\$/);
    const braavo = text("braavolabs", "tr");
    expect(braavo).toContain("Individual");
    expect(braavo).toMatch(/\$19,99/);
    expect(braavo).not.toContain("yıllık");
    expect(text("burunfarki", "en")).toBe("");
  });

  it("renders nothing for a product without a showcase", () => {
    const { container } = render(<ProductFeatures slug="burunfarki" locale="en" />);
    expect(container.innerHTML).toBe("");
  });
});
