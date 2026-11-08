import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MOBILE_STATIC_DEFAULT, MOBILE_STATIC_QUERY } from "@/components/experience/mobile-default";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("mobile static default (WEB-P0-03a2, ADR-003 c)", () => {
  it("is on, and scoped to <= 767 px", () => {
    expect(MOBILE_STATIC_DEFAULT).toBe(true);
    expect(MOBILE_STATIC_QUERY).toBe("(max-width: 767px)");
  });

  it("the open3d label exists in all 14 catalogues; tr/en written, the rest English fallback", () => {
    const label = (locale: string) => JSON.parse(read(`messages/${locale}.json`)).experience.open3d as string;
    expect(label("tr")).toBe("3D deneyimi aç");
    expect(label("en")).toBe("Open the 3D experience");
    for (const locale of SUPPORTED_LOCALES) expect(typeof label(locale)).toBe("string");
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "tr")) expect(label(locale)).toBe(label("en"));
  });

  it("page labels the English fallback honestly outside tr/en", () => {
    expect(read("src/app/[locale]/page.tsx")).toContain('open3dLang: locale !== "tr" && locale !== "en" ? "en" : undefined');
  });

  it("CSS gates the static default behind the flag attribute and the media query only", () => {
    const css = read("src/components/experience/Experience.module.css");
    expect(css).toContain('@media (max-width: 767px) {\n  .journey[data-mobile-static-default="true"]:not([data-mobile-3d="true"])');
    expect(css).toContain(".open3d:focus-visible");
    expect(css).toContain("min-height: 48px");
  });

  it("the 3D scene is not requested while the mobile static default is active", () => {
    const source = read("src/components/experience/YulaExperience.tsx");
    expect(source).toMatch(/if \(!mounted \|\| mobileStatic \|\| webgl !== "available" \|\| sceneRequested\) return;/);
  });
});
