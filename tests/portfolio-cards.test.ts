import { describe, it, expect } from "vitest";
import { buildPortfolioCards } from "@/lib/three/portfolio-cards";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";

/**
 * The 3D portfolio band inherits the site's locked honesty rule: a product
 * only renders a screenshot texture when the REGISTRY records a real,
 * provenance-stamped capture for it. Research products (and live products
 * nobody has captured yet) get typographic cards — the rule is enforced by
 * the data mapping, not by per-scene judgement calls.
 */
describe("buildPortfolioCards", () => {
  const cards = buildPortfolioCards(publicRegistry, projects);

  it("maps every non-archived registry product to exactly one card", () => {
    const expected = publicRegistry.filter((r) => r.lifecycle !== "archived");
    expect(cards.map((c) => c.slug).sort()).toEqual(expected.map((r) => r.slug).sort());
  });

  it("NEVER gives a research product a screenshot texture", () => {
    for (const card of cards) {
      if (card.lifecycle === "research") {
        expect(card.screenshot, `${card.slug} is research yet carries a screenshot`).toBeNull();
      }
    }
  });

  it("gives a screenshot texture ONLY to products whose registry record has one", () => {
    for (const card of cards) {
      const record = publicRegistry.find((r) => r.slug === card.slug)!;
      if (record.screenshots.length === 0) {
        expect(card.screenshot, `${card.slug} has no recorded capture`).toBeNull();
      } else {
        expect(card.screenshot).toBe(record.screenshots[0].path);
        // A screenshot without provenance is a picture, not proof — the
        // registry validator enforces sourceBuild/capturedAt, and the card
        // carries the capture date so the scene can show it.
        expect(card.capturedAt).toBe(record.screenshots[0].capturedAt);
      }
    }
  });

  it("orders live/beta products before research", () => {
    const firstResearch = cards.findIndex((c) => c.lifecycle === "research");
    const lastShipped = cards.reduce(
      (acc, c, i) => (c.lifecycle !== "research" ? i : acc),
      -1,
    );
    expect(lastShipped).toBeLessThan(firstResearch);
  });

  it("carries each product's own brand colors for the stage light", () => {
    for (const card of cards) {
      const project = projects.find((p) => p.slug === card.slug);
      // Every registry product has a ProjectConfig today; if one ever
      // doesn't, the card must fall back to the neutral stage, not crash.
      if (project) {
        expect(card.brandPrimary).toBe(project.brand.primary);
      } else {
        expect(card.brandPrimary).toBe("#9A9AA3");
      }
    }
  });

  it("localizes the card status label from the record lifecycle", () => {
    const bySlug = Object.fromEntries(cards.map((c) => [c.slug, c]));
    expect(bySlug["burunfarki"].statusTr).toBe("Canlı");
    expect(bySlug["braavolabs"].statusTr).toBe("Beta");
    expect(bySlug["choreia"].statusTr).toBe("Araştırma");
  });
});
