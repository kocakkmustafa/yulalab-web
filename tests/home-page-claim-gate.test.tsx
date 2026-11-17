import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExperienceProduct } from "@/components/experience/types";
import { publicRegistry } from "@/data/public-registry";

/**
 * SEC-WEB-01c — page-level proof that src/app/[locale]/page.tsx runs the claim
 * expiry gate: an expired claim reaches the home experience
 * redacted. The clock is pinned per test.
 */
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (k: string) => k,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/components/experience/YulaExperience", () => ({
  YulaExperience: ({ products }: { products: ExperienceProduct[] }) => {
    void products;
    return null;
  },
}));
vi.mock("@/components/landing/HomeScenes", () => ({ HomeScenes: () => null }));

// Dates derive from the registry so renewing claims does not break the tests.
const all = publicRegistry.flatMap((r) => r.claims);
const gatedExpiries = all
  .filter((c) => c.expiresAt)
  .map((c) => c.expiresAt as string)
  .sort();
const day = (iso: string, delta: number) => {
  const d = new Date(`${iso}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
};
const NOW = day(gatedExpiries[0], -1); // inside every claim's window
const AFTER_ALL = day(gatedExpiries[gatedExpiries.length - 1], 1); // past the last one

afterEach(() => vi.useRealTimers());

async function renderHome(now: Date) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const { default: LandingPage } = await import("@/app/[locale]/page");
  const ui = await LandingPage({ params: Promise.resolve({ locale: "tr" }) });
  // The page returns <YulaExperience products=.../>; read the props the page built.
  const children = (ui as { props: { children: Array<{ props: { products?: ExperienceProduct[] } }> } }).props.children;
  const products = children.find((c) => c.props.products)!.props.products!;
  return products.flatMap((p) => p.claims);
}

describe("home page claim gate (page.tsx)", () => {
  it("inside every window nothing is withheld, and the removed Burun Farkı claims are gone", async () => {
    const claims = await renderHome(NOW);
    expect(claims).toHaveLength(all.length);
    expect(claims.filter((c) => c.withheld)).toEqual([]);
    expect(claims.every((c) => c.statement !== "")).toBe(true);
    const ids = claims.map((c) => c.id);
    expect(ids).not.toContain("burunfarki-topk-accuracy");
    expect(ids).not.toContain("burunfarki-explainability");
  });

  it("after expiry the page redacts every claim", async () => {
    const claims = await renderHome(AFTER_ALL);
    expect(claims).toHaveLength(all.length);
    for (const c of claims) {
      expect(c.withheld).toBe(true);
      expect([c.statement, c.scope, c.source, c.figure ?? ""]).toEqual(["", "", "", ""]);
      expect(c.expiresAt).toBeTruthy();
    }
  });
});
