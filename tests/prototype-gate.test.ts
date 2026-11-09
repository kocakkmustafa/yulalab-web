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
