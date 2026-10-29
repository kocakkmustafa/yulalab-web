import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { company, CONTROLLER_LINE, providerLine } from "@/data/company";

const root = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const LOCALES = ["de", "fr", "es-419", "pt-BR", "ja", "ar", "it", "ko", "id", "pl", "hi", "zh-Hans"];

describe("published publisher / data-controller record (REL-03, founder decision 2026-10-29)", () => {
  it("company carries the confirmed record: sole proprietorship, email only", () => {
    expect(company.legalName).toBe("YULA Lab");
    expect(company.publisher).toEqual({
      controller: "Mustafa Kaan Koçak (YULA Lab)",
      businessType: { tr: "şahıs işletmesi", en: "sole proprietorship" },
      country: "Türkiye",
    });
    expect(company.contact.email).toBe("support@yulalab.com");
  });

  it("renders the controller without repeating the legal name, followed by the business type", () => {
    expect(CONTROLLER_LINE).toBe(
      company.publisher.controller.includes(company.legalName)
        ? company.publisher.controller
        : `${company.legalName} — ${company.publisher.controller}`,
    );
    expect(CONTROLLER_LINE).not.toContain(`${company.legalName} — ${company.legalName}`);
    expect(providerLine("tr")).toBe("Mustafa Kaan Koçak (YULA Lab) — şahıs işletmesi");
    expect(providerLine("en")).toBe("Mustafa Kaan Koçak (YULA Lab) — sole proprietorship");
  });

  it.each(["braavolabs", "burunfarki", "lifeos", "motion"])("%s privacy names the provider line and no postal address", (slug) => {
    const page = read(`src/app/[locale]/privacy/${slug}/page.tsx`);
    expect(page).toContain("{providerLine(locale)}");
    expect(page).not.toMatch(/publisher\.address|"Adres"|Kayseri|Melikgazi/);
  });

  it("main privacy, terms and structured data show no postal address", () => {
    for (const rel of ["src/app/[locale]/privacy/page.tsx", "src/app/[locale]/terms/page.tsx"]) {
      const page = read(rel);
      expect(page).toContain("providerLine(locale)");
      expect(page).not.toMatch(/publisher\.address|"Adres"|Kayseri|Melikgazi/);
    }
    expect(read("src/components/common/JsonLd.tsx")).not.toMatch(/publisher\.address|legalName/);
  });

  it.each(LOCALES)("%s catalogue translates the business type and drops the Address label", (locale) => {
    const catalogue = JSON.parse(read(`messages/content-${locale}.json`)) as Record<string, string>;
    expect(catalogue["sole proprietorship"]?.trim()).toBeTruthy();
    expect(catalogue).not.toHaveProperty(["Address"]);
    expect(JSON.stringify(catalogue)).not.toMatch(/Kayseri|Melikgazi|Bülbül/);
  });
});
