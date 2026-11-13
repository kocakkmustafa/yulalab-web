// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src, className }: ComponentProps<"img"> & { fill?: boolean }) => <img alt={alt} src={src} className={className} />,
}));
vi.mock("@/components/common/Reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/ScrollMarquee", () => ({ ScrollMarquee: () => null }));

beforeAll(() => {
  // jsdom has no matchMedia; ResponsiveDetails asks for the desktop query.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

function renderPage(slug: string, locale: "tr" | "en") {
  const project = projects.find((p) => p.slug === slug)!;
  const messages = locale === "tr" ? tr : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Istanbul">
      <ProductPage project={project} />
    </NextIntlClientProvider>,
  );
}

const itemOf = (el: Element) => Number((el.closest("[data-item]") as HTMLElement).dataset.item);

describe.each(["tr", "en"] as const)("%s product detail template (WEB-UX-05c)", (locale) => {
  const messages = locale === "tr" ? tr : en;

  it.each(projects.map((p) => p.slug))("%s: items appear in the 04-design §E4 order", (slug) => {
    const { container } = renderPage(slug, locale);
    const seen = [...container.querySelectorAll("[data-item]")].map((el) => Number((el as HTMLElement).dataset.item));
    // (8) the access card sits right after (1) in the DOM so mobile reads
    // value → access; desktop moves it to the right column with CSS.
    const rest = seen.filter((n) => n !== 8);
    expect(rest).toEqual([...rest].sort((a, b) => a - b));
    expect(seen).toContain(8);
    expect(seen.indexOf(8)).toBe(seen[0] === 1 ? 1 : 0);
    for (const n of [2, 3, 4, 5, 6]) expect(seen, `item ${n}`).toContain(n);
  });

  it.each(projects.map((p) => p.slug))("%s: no call to action without a real destination", (slug) => {
    renderPage(slug, locale);
    const links = within(screen.getByTestId("product-access")).getAllByRole("link");
    for (const a of links) {
      const href = a.getAttribute("href") ?? "";
      expect(href, `${slug}: placeholder href`).toMatch(/^(https?:\/\/|mailto:|\/)/);
    }
    expect(links.length).toBeGreaterThan(0);
  });

  it.each(publicRegistry.map((r) => r.slug))("%s: privacy link comes from the registry", (slug) => {
    const record = publicRegistry.find((r) => r.slug === slug)!;
    renderPage(slug, locale);
    expect(screen.getByTestId("trust-privacy").getAttribute("href")).toBe(record.privacyUrl);
    expect(screen.getByTestId("access-privacy").getAttribute("href")).toBe(record.privacyUrl);
  });

  it("states the release status and links it to its /transparency#<slug> record", () => {
    renderPage("lifeos", locale);
    const link = screen.getByTestId("status-link");
    expect(link.getAttribute("href")).toBe("/transparency#lifeos");
    expect(link.textContent).toBe(messages.product.statusLink);
    expect(itemOf(link)).toBe(6);
  });

  it("labels the only demo as an example simulation and draws no demo elsewhere", () => {
    renderPage("braavolabs", locale);
    expect(screen.getByTestId("demo-label").textContent).toBe(messages.product.demoLabel);
    expect(screen.getByTestId("demo-area").querySelector('[data-testid="braavolabs-plan-demo"]')).toBeTruthy();
    cleanup();
    for (const p of projects.filter((x) => x.slug !== "braavolabs")) {
      renderPage(p.slug, locale);
      expect(document.getElementById("dene"), `${p.slug} must not have #dene`).toBeNull();
      expect(screen.queryByTestId("demo-label")).toBeNull();
      cleanup();
    }
  });

  it("writes the empty screen state when the catalogue has no product screenshot", () => {
    renderPage("lifeos", locale);
    expect(screen.getByTestId("screen-empty").textContent).toBe(messages.product.screenEmpty);
    cleanup();
    renderPage("braavolabs", locale);
    expect(screen.queryByTestId("screen-empty")).toBeNull();
  });

  it("hides the vision item when the product has no registered roadmap material", () => {
    renderPage("lifeos", locale);
    expect(screen.queryByTestId("pd-vizyon")).toBeNull();
    cleanup();
    renderPage("braavolabs", locale);
    expect(screen.getByTestId("pd-vizyon")).toBeTruthy();
  });

  it("never makes the access card sticky", () => {
    renderPage("lifeos", locale);
    expect(screen.getByTestId("product-access").className).not.toMatch(/sticky|fixed/);
  });
});
