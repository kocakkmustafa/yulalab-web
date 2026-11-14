import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExperienceProduct } from "@/components/experience/types";
import { publicRegistry } from "@/data/public-registry";
import { isGateExempt } from "@/lib/public-registry";

/**
 * SEC-WEB-01a — the home page and /transparency are ISR pages: `revalidate` is an
 * exported literal <= 1 hour and `now` is read per render (not at module load), so a
 * claim that lapses after build is re-gated on the next regeneration.
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
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img">) => <img alt={alt} src={src} />,
}));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/StaggerWords", () => ({ StaggerWords: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/experience/YulaExperience", () => ({
  YulaExperience: ({ products }: { products: ExperienceProduct[] }) => {
    void products;
    return null;
  },
}));
vi.mock("@/components/landing/HomeScenes", () => ({ HomeScenes: () => null }));

const gatedExpiries = publicRegistry
  .flatMap((r) => r.claims)
  .filter((c) => !isGateExempt(c) && c.expiresAt)
  .map((c) => c.expiresAt as string)
  .sort();
const day = (iso: string, delta: number) => {
  const d = new Date(`${iso}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
};
const BEFORE = day(gatedExpiries[0], -1);
const AFTER = day(gatedExpiries[gatedExpiries.length - 1], 1);

afterEach(() => vi.useRealTimers());

describe("ISR revalidate (SEC-WEB-01a)", () => {
  it("both pages export a literal revalidate <= 3600", async () => {
    const home = await import("@/app/[locale]/page");
    const transparency = await import("@/app/[locale]/transparency/page");
    for (const mod of [home, transparency]) {
      expect(typeof mod.revalidate).toBe("number");
      expect(mod.revalidate).toBeGreaterThan(0);
      expect(mod.revalidate).toBeLessThanOrEqual(3600);
    }
  });

  it("same module, two renders at different clocks: withheld set changes", async () => {
    const { default: LandingPage } = await import("@/app/[locale]/page");
    const withheld = async (now: Date) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(now);
      const ui = await LandingPage({ params: Promise.resolve({ locale: "tr" }) });
      const children = (ui as { props: { children: Array<{ props: { products?: ExperienceProduct[] } }> } }).props.children;
      const products = children.find((c) => c.props.products)!.props.products!;
      return products.flatMap((p) => p.claims).filter((c) => c.withheld).length;
    };
    const before = await withheld(BEFORE);
    const after = await withheld(AFTER);
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(before);
  });
});
