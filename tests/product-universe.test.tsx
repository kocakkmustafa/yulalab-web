// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductUniverse, type UniverseItem } from "@/components/universe/ProductUniverse";
import { projects } from "@/data/projects";
import { groupProducts } from "@/lib/product-index";
import {
  matchesFilter,
  parseLayer,
  statusBucket,
  summariseStatus,
  withLayer,
} from "@/lib/product-universe";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img"> & { fill?: boolean }) => <img alt={alt} src={src as string} />,
}));

function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const groups = groupProducts(projects);
const featured = new Set(groups.featured.map((p) => p.slug));
const ITEMS: UniverseItem[] = [...groups.featured, ...groups.portfolio].map((p) => ({
  slug: p.slug,
  name: p.name,
  status: p.status,
  group: featured.has(p.slug) ? "featured" : "portfolio",
  category: "cat",
  tagline: `tagline ${p.slug}`,
  access: {
    primary: (() => {
      const href = p.links.find((l) => l.kind === (p.primaryCtaKind ?? "web"))?.href;
      return href ? { href, label: "Go" } : undefined;
    })(),
    stores: [],
    contact: { href: "mailto:x@example.com", label: "Ask" },
  },
  privacyUrl: "/privacy/motion",
  screenshot: undefined,
}));

const STRINGS = { privacy: "Privacy", support: "Support", supportUrl: "/support", statusLink: "Status", screenEmpty: "No screenshot" };

function mount(locale: "tr" | "en" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      <ProductUniverse items={ITEMS} strings={STRINGS} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/projects");
});
afterEach(cleanup);

describe("product-universe logic", () => {
  it("buckets statuses the way the pill words them", () => {
    expect(statusBucket("live")).toBe("live");
    expect(statusBucket("beta")).toBe("beta");
    expect(statusBucket("coming-soon")).toBe("soon");
    expect(statusBucket("in-development")).toBe("soon");
    expect(matchesFilter("beta", "all")).toBe(true);
    expect(matchesFilter("beta", "live")).toBe(false);
  });
  it("derives the summary from the catalogue, not from typed numbers", () => {
    expect(summariseStatus(projects)).toEqual({ live: 2, beta: 1, soon: 5 });
  });
  it("parses ?katman= only for known slugs and keeps other params", () => {
    const slugs = projects.map((p) => p.slug);
    expect(parseLayer("?katman=lifeos", slugs)).toBe("lifeos");
    expect(parseLayer("?katman=nope", slugs)).toBeNull();
    expect(parseLayer("", slugs)).toBeNull();
    expect(withLayer("?a=1", "lifeos")).toBe("?a=1&katman=lifeos");
    expect(withLayer("?katman=lifeos&a=1", null)).toBe("?a=1");
    expect(withLayer("?katman=lifeos", null)).toBe("");
  });
});

describe("ProductUniverse (desktop)", () => {
  beforeEach(() => setWide(true));

  it("lists all eight products in the single order, grouped, with a pill each", () => {
    mount();
    for (const i of ITEMS) {
      expect(screen.getByRole("link", { name: i.name }).getAttribute("href")).toBe(`/projects/${i.slug}`);
    }
    const rows = screen.getAllByTestId("universe-row").map((r) => r.getAttribute("data-slug"));
    expect(rows).toEqual(ITEMS.map((i) => i.slug));
    expect(within(screen.getByTestId("universe-group-featured")).getAllByTestId("universe-row")).toHaveLength(3);
    expect(screen.getByTestId("status-summary").textContent).toBe("2 live · 1 beta · 5 coming soon");
  });

  it("draws no .glass while the panel is closed", () => {
    const { container } = mount();
    expect(container.querySelectorAll(".glass")).toHaveLength(0);
    expect(screen.getByTestId("universe-panel-hint")).toBeTruthy();
  });

  it("opens the panel on selection as a non-modal region (no dialog, no inert)", () => {
    const { container } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Preview: LifeOS" }));
    expect(screen.getByTestId("universe-panel-open")).toBeTruthy();
    expect(container.querySelector('[role="dialog"], [aria-modal], [inert]')).toBeNull();
    expect(container.querySelectorAll(".glass")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Preview: LifeOS" }).getAttribute("aria-expanded")).toBe("true");
    expect(window.location.search).toBe("?katman=lifeos");
    expect(screen.getByTestId("panel-open-full").getAttribute("href")).toBe("/projects/lifeos");
    expect(screen.getByTestId("panel-privacy").getAttribute("href")).toBe("/privacy/motion");
    expect(screen.getByTestId("panel-status").getAttribute("href")).toBe("/transparency");
    expect(screen.getByTestId("panel-screen-empty").textContent).toBe("No screenshot");
  });

  it("Esc closes the panel, returns focus to the row's button, and clears the URL", () => {
    mount();
    const trigger = screen.getByRole("button", { name: "Preview: Braavolabs" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByTestId("universe-panel-open")).toBeTruthy();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByTestId("universe-panel-open")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(window.location.search).toBe("");
  });

  it("opens the panel from the ?katman= deep link and ignores unknown values", () => {
    window.history.replaceState(null, "", "/projects?katman=ostinato");
    mount();
    expect(screen.getByTestId("universe-panel-open").textContent).toContain("Ostinato");
    cleanup();
    window.history.replaceState(null, "", "/projects?katman=zzz");
    mount();
    expect(screen.queryByTestId("universe-panel-open")).toBeNull();
  });

  it("filters by status with real buttons, announces the count, and closes a hidden selection", () => {
    mount();
    const group = screen.getByTestId("universe-filter");
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    fireEvent.click(screen.getByRole("button", { name: "Preview: LifeOS" }));
    fireEvent.click(within(group).getByRole("button", { name: "Beta" }));
    expect(screen.getAllByTestId("universe-row")).toHaveLength(1);
    expect(screen.getByTestId("universe-count").textContent).toBe("Showing 1 products");
    expect(screen.queryByTestId("universe-panel-open")).toBeNull();
    expect(window.location.search).toBe("");
    // the summary stays the whole catalogue
    expect(screen.getByTestId("status-summary").textContent).toBe("2 live · 1 beta · 5 coming soon");
    fireEvent.click(within(group).getByRole("button", { name: "Coming soon" }));
    expect(screen.getAllByTestId("universe-row")).toHaveLength(5);
  });
});

describe("ProductUniverse (mobile / no panel)", () => {
  beforeEach(() => setWide(false));

  it("has no panel and renders each product as a link to its page", () => {
    const { container } = mount("tr");
    expect(screen.queryByTestId("universe-panel")).toBeNull();
    expect(container.querySelector("aside")).toBeNull();
    const link = screen.getByRole("link", { name: "LifeOS" });
    expect(link.getAttribute("href")).toBe("/projects/lifeos");
    expect(screen.queryByRole("button", { name: /LifeOS/ })).toBeNull();
  });

  it("ignores the deep link (no panel to open)", () => {
    window.history.replaceState(null, "", "/projects?katman=lifeos");
    mount();
    expect(screen.queryByTestId("universe-panel-open")).toBeNull();
  });

  it("the filter still works", () => {
    mount("tr");
    fireEvent.click(within(screen.getByTestId("universe-filter")).getByRole("button", { name: "Yayında" }));
    expect(screen.getAllByTestId("universe-row")).toHaveLength(2);
  });
});
