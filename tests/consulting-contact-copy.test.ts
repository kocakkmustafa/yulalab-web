import { describe, expect, it } from "vitest";
import tr from "../messages/tr.json";
import en from "../messages/en.json";
import { readFileSync } from "node:fs";

/** WEB-P0-07e/07b: the consulting copy must be true in both states of the lead form. */
describe("consulting contact copy", () => {
  it("the mailto-only text says nothing is submitted; the form text does not", () => {
    expect(en.consulting.contactBody).toMatch(/nothing is submitted by this page/);
    expect(tr.consulting.contactBody).toMatch(/veri gönderilmez/);
    expect(en.consulting.contactBodyForm).not.toMatch(/nothing is submitted/);
    expect(tr.consulting.contactBodyForm).not.toMatch(/veri gönderilmez/);
    expect(en.consulting.contactBodyForm).toMatch(/form below/);
    expect(tr.consulting.contactBodyForm).toMatch(/formu/);
  });

  it("the page picks the form text exactly when the form is rendered", () => {
    const page = readFileSync(new URL("../src/app/[locale]/consulting/page.tsx", import.meta.url), "utf8");
    expect(page).toContain('t(leadFormOpen ? "contactBodyForm" : "contactBody")');
    expect(page).toContain("{leadFormOpen ? <div");
  });
});
