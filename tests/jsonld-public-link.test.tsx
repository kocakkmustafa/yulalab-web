import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/data/projects", () => ({ projects: [
  { slug: "closed", name: "Closed", primaryCtaKind: "appstore", status: "live", links: [
    { kind: "appstore", href: "https://testflight.apple.com/join/abc" },
  ], short: { en: "Closed" } },
  { slug: "betaweb", name: "BetaWeb", status: "live", links: [
    { kind: "web", href: "https://betaweb.example/" },
    { kind: "appstore", href: "https://beta.itunes.apple.com/x" },
    { kind: "playstore", href: "https://play.google.com/apps/internaltest/123" },
  ], short: { en: "BetaWeb" } },
  { slug: "storeapp", name: "StoreApp", primaryCtaKind: "appstore", status: "live", links: [
    { kind: "appstore", href: "https://apps.apple.com/app/id1" },
  ], short: { en: "StoreApp" } },
  { slug: "soon", name: "Soon", primaryCtaKind: "appstore", status: "coming-soon", links: [
    { kind: "appstore", href: "https://apps.apple.com/app/id2" },
  ], short: { en: "Soon" } },
  { slug: "nolinks", name: "NoLinks", status: "live", links: [], short: { en: "NoLinks" } },
] }));
vi.mock("@/data/public-registry", () => ({ publicRegistry: [
  { slug: "closed", lifecycle: "beta", surfaces: [{ url: "https://testflight.apple.com/join/abc", status: "beta", expiresAt: "2026-10-20" }] },
  { slug: "betaweb", lifecycle: "live", surfaces: [{ url: "https://betaweb.example", status: "live", expiresAt: "2026-10-20" }] },
  { slug: "storeapp", lifecycle: "live", surfaces: [{ url: "https://apps.apple.com/app/id1", status: "live", expiresAt: "2026-10-20" }] },
  { slug: "soon", lifecycle: "live", surfaces: [{ url: "https://apps.apple.com/app/id2", status: "live", expiresAt: "2026-10-20" }] },
  { slug: "nolinks", lifecycle: "live", surfaces: [] },
] }));

import { JsonLd } from "@/components/common/JsonLd";

const graphOf = (now: Date) =>
  JSON.parse(renderToStaticMarkup(<JsonLd now={now} />).replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))["@graph"];
const apps = () =>
  graphOf(new Date("2026-10-19T12:00:00Z")).filter((n: { "@type": string }) => n["@type"] === "SoftwareApplication") as { name: string; url: string }[];

describe("JSON-LD yalniz halka acik baglanti", () => {
  it("kapali test birincil baglantili, coming-soon magaza baglantili ve bos links urunleri girmez", () => {
    expect(apps().map((a) => a.name)).toEqual(["BetaWeb", "StoreApp"]);
  });
  it("web baglantisi korunur", () => {
    expect(apps().find((a) => a.name === "BetaWeb")?.url).toBe("https://betaweb.example/");
  });
  it("halka acik magaza baglantisi canonical olarak kalir", () => {
    expect(apps().find((a) => a.name === "StoreApp")?.url).toBe("https://apps.apple.com/app/id1");
  });
  it("hicbir kapali test baglantisi ciktida gecmez", () => {
    const out = JSON.stringify(graphOf(new Date("2026-10-19T12:00:00Z")));
    expect(out).not.toMatch(/testflight|beta\.itunes|apps\/internaltest|apps\/test/);
  });
});
