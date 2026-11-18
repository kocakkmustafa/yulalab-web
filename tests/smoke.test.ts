import { describe, expect, it } from "vitest";
import { projects, getProjectBySlug, getProjectSlugs } from "@/data/projects";
import { company } from "@/data/company";
import type { LocalizedString, ProjectConfig } from "@/lib/types";

function isNonEmpty(s: LocalizedString | undefined, field: string, ctx: string) {
  it(`${ctx}: ${field}.tr is non-empty`, () => {
    expect(s?.tr.trim()).not.toBe("");
  });
  it(`${ctx}: ${field}.en is non-empty`, () => {
    expect(s?.en.trim()).not.toBe("");
  });
}

describe("public registry precursor — project data integrity", () => {
  it("has exactly 7 products (1 live, 1 beta, 5 coming-soon)", () => {
    expect(projects).toHaveLength(7);
  });

  it("every slug is unique", () => {
    const slugs = getProjectSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("order values are unique (ProjectConfig.order is superseded by PRODUCT_ORDER)", () => {
    const orders = projects.map((p) => p.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("every product has a valid status", () => {
    const validStatuses = ["live", "beta", "coming-soon", "in-development"];
    for (const p of projects) {
      expect(validStatuses).toContain(p.status);
    }
  });

  it("status mix matches the public count claim (1 live, 1 beta, 5 coming-soon)", () => {
    const count = (status: string) =>
      projects.filter((p) => p.status === status).length;
    expect(count("live")).toBe(1);
    expect(count("beta")).toBe(1);
    expect(count("coming-soon")).toBe(5);
  });

  for (const p of projects) {
    describe(p.slug, () => {
      const localizedFields: [keyof ProjectConfig, LocalizedString][] = [
        ["category", p.category],
        ["tagline", p.tagline],
        ["description", p.description],
        ["short", p.short],
        ["vision", p.vision],
        ["mission", p.mission],
      ];
      for (const [field, value] of localizedFields) {
        isNonEmpty(value, String(field), p.slug);
      }

      it("has a non-empty name and monogram", () => {
        expect(p.name.trim()).not.toBe("");
        expect(p.monogram.trim()).not.toBe("");
      });

      it("every feature has a non-empty TR/EN title and description", () => {
        for (const f of p.features) {
          expect(f.title.tr.trim()).not.toBe("");
          expect(f.title.en.trim()).not.toBe("");
          expect(f.description.tr.trim()).not.toBe("");
          expect(f.description.en.trim()).not.toBe("");
        }
      });

      it("every stat has a value and a TR/EN label", () => {
        for (const s of p.stats) {
          expect(s.value.trim()).not.toBe("");
          expect(s.label.tr.trim()).not.toBe("");
          expect(s.label.en.trim()).not.toBe("");
        }
      });

      it("getProjectBySlug resolves the same record", () => {
        expect(getProjectBySlug(p.slug)?.slug).toBe(p.slug);
      });
    });
  }
});

describe("public registry precursor — company config integrity", () => {
  it("has a name, legal name and founder contact", () => {
    expect(company.name.trim()).not.toBe("");
    expect(company.legalName.trim()).not.toBe("");
    expect(company.founder.email).toMatch(/.+@.+\..+/);
    expect(company.contact.email).toMatch(/.+@.+\..+/);
  });

  it("carries exactly four values (manifesto structure assumes this)", () => {
    expect(company.values).toHaveLength(4);
  });
});
