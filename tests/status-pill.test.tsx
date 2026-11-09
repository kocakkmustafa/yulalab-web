// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StatusPill, STATUS_PILL_KEY } from "@/components/common/StatusPill";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import type { ProjectStatus } from "@/lib/types";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

afterEach(cleanup);

function show(status: ProjectStatus, locale: "tr" | "en" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : tr} timeZone="Europe/Istanbul">
      <StatusPill slug="any" status={status} />
    </NextIntlClientProvider>,
  );
}

// Founder decision 2026-11-09 ("Evet, rozet ekle"): every card carries a status
// pill drawn from the registry lifecycle; it supersedes the 2026-10-31 rule.
describe("status pill on product cards", () => {
  it.each([
    ["live", "live"],
    ["beta", "beta"],
    ["coming-soon", "comingSoon"],
    ["in-development", "comingSoon"],
  ] as const)("renders the %s label", (status, key) => {
    show(status);
    expect(screen.getByText(en.status[key])).toBeTruthy();
  });

  it("reads Yayinda / Beta / Yakinda in Turkish", () => {
    show("live", "tr");
    expect(screen.getByText(tr.status.live)).toBeTruthy();
    cleanup();
    show("coming-soon", "tr");
    expect(screen.getByText(tr.status.comingSoon)).toBeTruthy();
  });

  it("maps every project's status to the label its registry lifecycle implies (no 'all live' implication)", () => {
    const expected = { live: "live", beta: "beta", research: "comingSoon" } as const;
    for (const p of projects) {
      const record = publicRegistry.find((r) => r.slug === p.slug)!;
      expect(STATUS_PILL_KEY[p.status], p.slug).toBe(expected[record.lifecycle as keyof typeof expected]);
    }
    expect(STATUS_PILL_KEY[projects.find((p) => p.slug === "ostinato")!.status]).toBe("comingSoon");
  });
});
