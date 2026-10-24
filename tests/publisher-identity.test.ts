import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { company, CONTROLLER_LINE } from "@/data/company";

const root = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const LOCALES = ["de", "fr", "es-419", "pt-BR", "ja", "ar", "it", "ko", "id", "pl", "hi", "zh-Hans"];

describe("published publisher / data-controller record (REL-03)", () => {
  it("company carries the confirmed record", () => {
    expect(company.legalName).toBe("YULA Lab");
    expect(company.publisher).toEqual({
      controller: "YULA Lab — Mustafa Kaan Koçak",
      address: "Yeniköy Mahallesi, Bülbül Caddesi No: 50/6, Melikgazi/Kayseri",
      country: "Türkiye",
    });
  });

  it("renders the controller without repeating the legal name", () => {
    expect(CONTROLLER_LINE).toBe(
      company.publisher.controller.includes(company.legalName)
        ? company.publisher.controller
        : `${company.legalName} — ${company.publisher.controller}`,
    );
    expect(CONTROLLER_LINE).not.toContain(`${company.legalName} — ${company.legalName}`);
  });

  it.each(["braavolabs", "burunfarki", "lifeos", "motion"])("%s privacy names the controller from company data", (slug) => {
    const page = read(`src/app/[locale]/privacy/${slug}/page.tsx`);
    expect(page).not.toContain("YULA Lab — Mustafa Kaan Koçak");
    expect(page).toContain("{CONTROLLER_LINE}");
    expect(page).toContain("{company.publisher.address}");
  });

  it("main privacy and terms show controller and address", () => {
    for (const rel of ["src/app/[locale]/privacy/page.tsx", "src/app/[locale]/terms/page.tsx"]) {
      const page = read(rel);
      expect(page).toContain("CONTROLLER_LINE");
      expect(page).toContain("company.publisher.address");
    }
  });

  it.each(LOCALES)("%s catalogue translates the Address label", (locale) => {
    const catalogue = JSON.parse(read(`messages/content-${locale}.json`)) as Record<string, string>;
    expect(catalogue.Address?.trim()).toBeTruthy();
  });
});
