// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductUniverse, type UniverseItem } from "@/components/universe/ProductUniverse";
import { projects } from "@/data/projects";
import { groupProducts } from "@/lib/product-index";
import { CLOSED_TEST_HREF, firstPublicLink, isComingSoon, isPublicHref, storeLinksOf, storeSlotsOf } from "@/lib/store-slots";
import type { ProjectConfig } from "@/lib/types";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img"> & { fill?: boolean }) => <img alt={alt} src={src as string} />,
}));

const bySlug = (slug: string) => projects.find((p) => p.slug === slug)!;
const slotMap = (slug: string) =>
  Object.fromEntries((storeSlotsOf(bySlug(slug)) ?? []).map((s) => [s.kind, s.href]));

/** WEB-P0-07d: one store link per product card, "coming soon" where there is none. */
describe("storeSlotsOf", () => {
  it("links the published App Store listings and leaves Google Play as coming soon", () => {
    for (const slug of ["lifeos", "braavolabs"]) {
      const m = slotMap(slug);
      expect(m.appstore).toMatch(/^https:\/\/apps\.apple\.com\//);
      expect(m.playstore).toBeUndefined();
    }
  });

  it("coming-soon products get two slots and no link", () => {
    for (const slug of ["gravita", "lissom", "jablab", "ostinato", "choreia"]) {
      expect(storeSlotsOf(bySlug(slug))).toEqual([
        { kind: "appstore", name: "App Store", href: undefined },
        { kind: "playstore", name: "Google Play", href: undefined },
      ]);
    }
  });

  it("a web product without a store listing gets no store row", () => {
    expect(storeSlotsOf(bySlug("burunfarki"))).toBeUndefined();
  });

  it("never exposes a closed-test / TestFlight listing", () => {
    const fake = (href: string, kind: "appstore" | "playstore"): ProjectConfig => ({
      ...bySlug("lifeos"),
      links: [{ kind, href }],
    });
    for (const href of [
      "https://testflight.apple.com/join/AbCdEf",
      "https://play.google.com/apps/testing/com.example.app",
      "https://play.google.com/apps/internaltest/4700000000000000000",
    ]) {
      const kind = href.includes("testflight") ? "appstore" : "playstore";
      expect((storeSlotsOf(fake(href, kind)) ?? []).every((s) => s.href === undefined)).toBe(true);
    }
    for (const p of projects) {
      for (const s of storeSlotsOf(p) ?? []) {
        expect(s.href ?? "").not.toMatch(/testflight|apps\/(testing|internaltest)/i);
      }
    }
  });

  it("recognises beta.itunes and play apps/test links as closed test", () => {
    for (const href of [
      "https://beta.itunes.apple.com/v1/app/123",
      "https://play.google.com/apps/test/com.example.app/1",
      "https://play.google.com/apps/testing/com.example.app",
    ]) {
      expect(CLOSED_TEST_HREF.test(href)).toBe(true);
      expect(isPublicHref(href)).toBe(false);
    }
    expect(isPublicHref("https://apps.apple.com/app/id1")).toBe(true);
    expect(isPublicHref("https://play.google.com/store/apps/details?id=a.b")).toBe(true);
    expect(isPublicHref(undefined)).toBe(false);
  });

  it("firstPublicLink skips a leading closed-test link and picks the first public one", () => {
    const p: ProjectConfig = {
      ...bySlug("lifeos"),
      links: [
        { kind: "appstore", href: "https://testflight.apple.com/join/X" },
        { kind: "appstore", href: "https://apps.apple.com/app/id1" },
        { kind: "appstore", href: "https://apps.apple.com/app/id2" },
        { kind: "playstore", href: "https://play.google.com/apps/test/a/1" },
      ],
    };
    expect(firstPublicLink(p, "appstore")).toBe("https://apps.apple.com/app/id1");
    expect(firstPublicLink(p, "playstore")).toBeUndefined();
    expect(storeSlotsOf(p)?.find((s) => s.kind === "appstore")?.href).toBe("https://apps.apple.com/app/id1");
  });

  it("closed-test hosts/paths are rejected, public listings are kept", () => {
    for (const href of [
      "https://appdistribution.firebase.google.com/testerapps/1",
      "https://appdistribution.firebase.dev/i/abc",
      "https://play.google.com/apps/internaltest/4700000000",
      "https://play.google.com/store/apps/testing/com.example.app",
    ]) {
      expect(isPublicHref(href), href).toBe(false);
    }
    for (const href of [
      "https://apps.apple.com/app/id1",
      "https://play.google.com/store/apps/details?id=com.appdistribution.x",
      "https://play.google.com/store/apps/details?id=com.example.internaltest",
    ]) {
      expect(isPublicHref(href), href).toBe(true);
    }
    expect(isPublicHref(null)).toBe(false);
  });

  describe("storeLinksOf / firstPublicLink shared by index and product page", () => {
    const mk = (status: ProjectConfig["status"], links: ProjectConfig["links"]): ProjectConfig => ({
      ...bySlug("lifeos"),
      status,
      links,
    });
    const pub = [
      { kind: "appstore", href: "https://apps.apple.com/app/id1" },
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=a.b" },
    ] as ProjectConfig["links"];

    it("coming soon + public links: no store link on any surface", () => {
      for (const status of ["coming-soon", "in-development"] as const) {
        const p = mk(status, pub);
        expect(isComingSoon(p)).toBe(true);
        expect(storeLinksOf(p)).toEqual([]);
        expect(firstPublicLink(p, "appstore")).toBeUndefined();
        expect((storeSlotsOf(p) ?? []).every((s) => s.href === undefined)).toBe(true);
      }
    });
    it("empty links and null href yield nothing", () => {
      expect(storeLinksOf(mk("live" as ProjectConfig["status"], []))).toEqual([]);
      const nul = mk("live" as ProjectConfig["status"], [
        { kind: "appstore", href: null },
      ] as unknown as ProjectConfig["links"]);
      expect(storeLinksOf(nul)).toEqual([]);
      expect(firstPublicLink(nul, "appstore")).toBeUndefined();
    });
    it("published product keeps public links, skips closed-test, honours exceptKind", () => {
      const p = mk("live" as ProjectConfig["status"], [
        { kind: "appstore", href: "https://testflight.apple.com/join/X" },
        ...pub,
      ]);
      expect(storeLinksOf(p).map((l) => l.href)).toEqual([
        "https://apps.apple.com/app/id1",
        "https://play.google.com/store/apps/details?id=a.b",
      ]);
      expect(storeLinksOf(p, "appstore").map((l) => l.kind)).toEqual(["playstore"]);
    });
  });

  it("Ostinato has no store link at all while it is coming soon", () => {
    expect(bySlug("ostinato").links.filter((l) => l.href)).toEqual([]);
    expect(Object.values(slotMap("ostinato")).every((h) => h === undefined)).toBe(true);
  });
});

const groups = groupProducts(projects);
const featured = new Set(groups.featured.map((p) => p.slug));
const ITEMS: UniverseItem[] = [...groups.featured, ...groups.portfolio].map((p) => ({
  slug: p.slug,
  name: p.name,
  status: p.status,
  group: featured.has(p.slug) ? "featured" : "portfolio",
  category: "cat",
  tagline: `tagline ${p.slug}`,
  access: { stores: [], contact: { href: "mailto:x@example.com", label: "Ask" } },
  storeSlots: storeSlotsOf(p),
}));
const STRINGS = { privacy: "Privacy", support: "Support", supportUrl: "/support", statusLink: "Status", screenEmpty: "No screenshot" };

function mount(locale: "tr" | "en") {
  window.matchMedia = ((query: string) => ({
    matches: false, // narrow screen: no side panel, the row itself must carry the stores
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      <ProductUniverse items={ITEMS} strings={STRINGS} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => window.history.replaceState(null, "", "/projects"));
afterEach(cleanup);

describe("ProductUniverse store row", () => {
  it.each([
    ["en", "Coming soon"],
    ["tr", "Yakında"],
  ] as const)("draws a store link or a coming-soon slot on every mobile product row (%s)", (locale, soon) => {
    mount(locale);
    const row = (slug: string) => within(document.querySelector(`[data-testid="universe-row"][data-slug="${slug}"]`) as HTMLElement);

    const lifeos = row("lifeos");
    const appStore = lifeos.getByRole("link", { name: /App Store/ });
    expect(appStore.getAttribute("href")).toMatch(/^https:\/\/apps\.apple\.com\//);
    expect(lifeos.getByText(`Google Play · ${soon}`)).toBeTruthy();
    expect(lifeos.queryByRole("link", { name: /Google Play/ })).toBeNull();

    const ostinato = row("ostinato");
    expect(ostinato.getByText(`App Store · ${soon}`)).toBeTruthy();
    expect(ostinato.getByText(`Google Play · ${soon}`)).toBeTruthy();
    expect(ostinato.queryAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/projects/ostinato"]);

    // a web product keeps its row without any store chips
    expect(document.querySelector('[data-slug="burunfarki"] [data-testid="universe-row-stores"]')).toBeNull();
    expect(screen.getAllByTestId("universe-row-stores").length).toBe(7);
  });
});
