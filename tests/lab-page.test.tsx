// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import LabPage from "@/app/[locale]/lab/page";
import { notes } from "@/data/notes";
import { caseStudies } from "@/data/case-studies";
import { publicRegistry } from "@/data/public-registry";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {}, getTranslations: async () => (k: string) => k }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/StaggerWords", () => ({ StaggerWords: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

async function renderLab(locale: string) {
  const ui = await LabPage({ params: Promise.resolve({ locale }) });
  const messages = locale === "tr" ? tr : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("/lab (WEB-UX-05e)", () => {
  it("shows note count and latest date from the data, not typed numbers", async () => {
    await renderLab("tr");
    const latest = [...notes].map((n) => n.date).sort().at(-1)!;
    expect(screen.getByTestId("lab-notes-meta").textContent).toBe(`${notes.length} giriş · son giriş ${latest}`);
  });

  it("derives record counts from the registry", async () => {
    await renderLab("en");
    const claims = publicRegistry.reduce((n, r) => n + r.claims.length, 0);
    expect(screen.getByTestId("lab-os-meta").textContent).toContain(`${publicRegistry.length} product records`);
    expect(screen.getByTestId("lab-os-meta").textContent).toContain(`${claims} claims`);
  });

  it("writes the empty case-study state while none is published", async () => {
    expect(caseStudies).toHaveLength(0);
    await renderLab("tr");
    expect(screen.getByTestId("lab-cases-empty").textContent).toBe(
      "Vaka çalışmalarının kapsamı ve sınırları için Şeffaflık sayfasına bakın.",
    );
    expect(screen.getByTestId("lab-cases-empty").querySelector("a")?.getAttribute("href")).toBe("/transparency");
    cleanup();
    await renderLab("en");
    expect(screen.getByTestId("lab-cases-empty").textContent).toBe(
      "For the scope and limits of case studies, see the Transparency page.",
    );
  });

  it("links only to existing routes and has one h1", async () => {
    const { container } = await renderLab("tr");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/notes", "/operating-system", "/transparency", "/case-studies"]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("falls back to English for a locale without a translation", async () => {
    await renderLab("ko");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Lab");
  });

  it("does not carry the capital / outside-client sentence", async () => {
    const { container } = await renderLab("tr");
    expect(container.textContent).not.toMatch(/Sermaye ya da yatırım|hiçbir dış müşteri işini|Henüz dış müşteri/);
  });
});
