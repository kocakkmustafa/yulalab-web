import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {}, getTranslations: async () => (k: string) => k }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

import { assertPrototypeEnabled, prototypeEnabled } from "@/components/prototype/gate";
import { GATES } from "@/components/prototype/gates";

const appDir = path.resolve(import.meta.dirname, "../src/app/[locale]");
const pageExists = (route: string) => existsSync(path.join(appDir, route, "page.tsx"));

describe("prototype gate (closed by default)", () => {
  it("is closed unless UX_PROTOTYPE is exactly 1", () => {
    expect(prototypeEnabled({})).toBe(false);
    expect(prototypeEnabled({ UX_PROTOTYPE: "0" })).toBe(false);
    expect(prototypeEnabled({ UX_PROTOTYPE: "true" })).toBe(false);
    expect(prototypeEnabled({ UX_PROTOTYPE: "1" })).toBe(true);
  });
  it("answers notFound when closed and passes when open", () => {
    expect(() => assertPrototypeEnabled({})).toThrow("NEXT_NOT_FOUND");
    expect(() => assertPrototypeEnabled({ UX_PROTOTYPE: "1" })).not.toThrow();
  });
  it("every prototype page calls the gate", async () => {
    const { readFileSync } = await import("node:fs");
    for (const r of ["prototype/start", "prototype/projects", "prototype/projects/[slug]", "prototype/contact"]) {
      expect(readFileSync(path.join(appDir, r, "page.tsx"), "utf8"), r).toContain("assertPrototypeEnabled()");
    }
  });
  it("the layout gates too", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(path.join(appDir, "prototype/layout.tsx"), "utf8")).toContain("assertPrototypeEnabled()");
    const Layout = (await import("@/app/[locale]/prototype/layout")).default;
    delete process.env.UX_PROTOTYPE;
    expect(() => Layout({ children: null })).toThrow("NEXT_NOT_FOUND");
    process.env.UX_PROTOTYPE = "1";
    expect(() => Layout({ children: null })).not.toThrow();
    delete process.env.UX_PROTOTYPE;
  });
  it("closed gate makes the real page 404", async () => {
    delete process.env.UX_PROTOTYPE;
    const start = (await import("@/app/[locale]/prototype/start/page")).default;
    await expect(start({ params: Promise.resolve({ locale: "tr" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("four doors point at real routes", () => {
  it("has exactly the four doors in order", () => {
    expect(GATES.map((g) => g.id)).toEqual(["products", "business", "collab", "review"]);
  });
  it("business, collab and review go to existing pages; products to the prototype universe", () => {
    const href = Object.fromEntries(GATES.map((g) => [g.id, g.href]));
    expect(href).toMatchObject({ products: "/prototype/projects", business: "/consulting", collab: "/contact", review: "/transparency" });
    for (const g of GATES) expect(pageExists(g.href), g.href).toBe(true);
  });
  it("extra links are real routes or mailto", () => {
    for (const x of GATES.flatMap((g) => g.extra)) {
      if (x.href.startsWith("mailto:")) expect(x.href).toMatch(/^mailto:[^@\s]+@[^@\s]+$/);
      else expect(pageExists(x.href), x.href).toBe(true);
    }
  });
});

describe("localized product text language", () => {
  it("LocalizedText labels text with the page locale and rtl for ar", async () => {
    const { LocalizedText } = await import("@/components/prototype/LocalizedText");
    const ar = LocalizedText({ locale: "ar", children: "x" }) as unknown as { props: Record<string, unknown> };
    expect(ar.props.lang).toBe("ar");
    expect(ar.props.dir).toBe("rtl");
    const ja = LocalizedText({ locale: "ja", children: "x" }) as unknown as { props: Record<string, unknown> };
    expect(ja.props.lang).toBe("ja");
    expect(ja.props.dir).toBeUndefined();
  });
  it("product text in the detail page goes through LocalizedText", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(path.join(appDir, "prototype/projects/[slug]/page.tsx"), "utf8");
    expect(src.match(/<LocalizedText/g)?.length).toBeGreaterThanOrEqual(6);
  });
});
