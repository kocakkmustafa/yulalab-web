import { describe, expect, it } from "vitest";
import { recordLangAttrs } from "../src/components/landing/record-lang";

describe("recordLangAttrs (WCAG 3.1.2 for tr/en-only records)", () => {
  it("adds nothing when the page is in the record's language or the record has none", () => {
    expect(recordLangAttrs("en", "en")).toEqual({});
    expect(recordLangAttrs("tr", "tr")).toEqual({});
    expect(recordLangAttrs(undefined, "ar")).toEqual({});
  });
  it("marks the record language on a translated ltr page", () => {
    expect(recordLangAttrs("en", "de")).toEqual({ lang: "en" });
    expect(recordLangAttrs("tr", "zh-Hans")).toEqual({ lang: "tr" });
  });
  it("also keeps ltr direction on a right-to-left page", () => {
    expect(recordLangAttrs("en", "ar")).toEqual({ lang: "en", dir: "ltr" });
  });
});
