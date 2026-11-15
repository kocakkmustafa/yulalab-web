// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import LandingPage from "@/app/[locale]/page";
import { TrackView } from "@/components/common/TrackView";

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ locale }: { locale: string }) => (key: string) => `${locale}:${key}`,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
vi.mock("@/components/experience/YulaExperience", () => ({ YulaExperience: () => null }));

describe("home page funnel step (WEB-P1-03)", () => {
  it.each(["tr", "en", "ja"])("renders exactly one home_view TrackView in %s", async (locale) => {
    const result = (await LandingPage({ params: Promise.resolve({ locale }) })) as ReactElement<{
      children: ReactElement<{ event?: string; product?: string }>[];
    }>;
    const views = result.props.children.filter((part) => part.type === TrackView);
    expect(views).toHaveLength(1);
    expect(views[0].props.event).toBe("home_view");
    expect(views[0].props.product).toBeUndefined();
  });
});
