// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StatusPill } from "@/components/common/StatusPill";
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

// Founder decision 2026-10-31: cards introduce finished products. They state
// no publication status; only an app that is not in a store yet says
// "Coming soon". Publication evidence lives on /transparency.
describe("status pill on product cards", () => {
  it.each(["live", "beta"] as const)("says nothing about publication for a %s product", (status) => {
    const { container } = show(status);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByText(en.status[status])).toBeNull();
    expect(screen.queryByText(en.product.availabilityUnverified)).toBeNull();
  });

  it.each(["coming-soon", "in-development"] as const)("reads Coming soon for a %s product", (status) => {
    show(status);
    expect(screen.getByText(en.status.comingSoon)).toBeTruthy();
    expect(screen.queryByText(en.status.inDevelopment)).toBeNull();
  });

  it("reads Coming soon in Turkish too", () => {
    show("coming-soon", "tr");
    expect(screen.getByText(tr.status.comingSoon)).toBeTruthy();
  });
});
