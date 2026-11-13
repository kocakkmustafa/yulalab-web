// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import WhyYulaPage, { generateMetadata } from "@/app/[locale]/why-yula/page";
import { publicRegistry } from "@/data/public-registry";
import { articleNotes } from "@/data/notes";
import { evidenceCounts } from "@/lib/operating-system";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async () => (k: string) => k,
}));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/StaggerWords", () => ({ StaggerWords: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

afterEach(cleanup);

async function renderPage(locale: "tr" | "en") {
  const ui = await WhyYulaPage({ params: Promise.resolve({ locale }) });
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("/why-yula (WEB-P0-09)", () => {
  it("renders lifecycle counts and product names from the registry", async () => {
    await renderPage("en");
    const section = screen.getByTestId("why-lifecycle");
    for (const key of ["live", "beta", "research", "archived"] as const) {
      const expected = publicRegistry.filter((r) => r.lifecycle === key);
      const row = section.querySelector(`[data-lifecycle="${key}"]`);
      expect(row, key).not.toBeNull();
      expect(row!.textContent).toContain(`: ${expected.length}`);
      for (const r of expected) expect(row!.textContent).toContain(r.name);
    }
    expect(section.textContent).toContain(`${publicRegistry.length} products`);
  });

  it("derives evidence counts from the registry", async () => {
    await renderPage("tr");
    const counts = evidenceCounts();
    const section = screen.getByTestId("why-levels");
    for (const [kind, n] of Object.entries(counts)) {
      expect(section.querySelector(`[data-evidence="${kind}"]`)!.textContent).toContain(`: ${n}`);
    }
  });

  it("lists sources under every section and links to /lab, /transparency and the articles", async () => {
    const { container } = await renderPage("en");
    for (const id of ["why-evidence", "why-lifecycle", "why-levels", "why-reading"]) {
      expect(screen.getByTestId(id).querySelectorAll("li code").length, id).toBeGreaterThan(0);
    }
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/lab", "/transparency", ...articleNotes.map((n) => `/notes/${n.slug}`)]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("does not repeat the capital / outside-client sentences", async () => {
    const { container } = await renderPage("tr");
    expect(container.textContent).not.toMatch(/sermaye|yatırım sağlamıyoruz|dış müşteri işi/i);
    cleanup();
    const en2 = await renderPage("en");
    expect(en2.container.textContent).not.toMatch(/capital or investment|outside-client work/i);
  });

  it("has canonical and alternates metadata", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.alternates?.canonical).toBe("/en/why-yula");
    expect(Object.keys(meta.alternates?.languages ?? {})).toHaveLength(14);
  });
});
