import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/data/projects", () => ({ projects: [
  { slug: "fresh", name: "Fresh", primaryCtaKind: "web", links: [{ kind: "web", href: "https://fresh.example/" }], short: { en: "Fresh app" } },
  { slug: "expired", name: "Expired", links: [{ kind: "web", href: "https://expired.example/" }], short: { en: "Old app" } },
  { slug: "research", name: "Research", links: [{ kind: "web", href: "https://research.example/" }], short: { en: "Research" } },
] }));
vi.mock("@/data/public-registry", () => ({ publicRegistry: [
  { slug: "fresh", lifecycle: "live", surfaces: [{ url: "https://fresh.example", status: "live", expiresAt: "2026-10-20" }] },
  { slug: "expired", lifecycle: "live", surfaces: [{ url: "https://expired.example", status: "live", expiresAt: "2026-10-18" }] },
  { slug: "research", lifecycle: "research", surfaces: [{ url: "https://research.example", status: "live", expiresAt: "2026-10-20" }] },
] }));

import { JsonLd } from "@/components/common/JsonLd";

describe("structured publication claims", () => {
  const graph = () => JSON.parse(renderToStaticMarkup(<JsonLd now={new Date("2026-10-19T12:00:00Z")} />).replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))["@graph"];
  it("retains a positively confirmed application, excluding expired and research publication", () => {
    expect(graph().filter((node: Record<string, unknown>) => node["@type"] === "SoftwareApplication").map((node: { name: string }) => node.name)).toEqual(["Fresh"]);
  });
  it("does not publish an unverified free USD offer", () => {
    expect(JSON.stringify(graph())).not.toMatch(/"offers"|"price"|"priceCurrency"/);
  });
  it("expires the same application's structured claim at the next date boundary", () => {
    const value = renderToStaticMarkup(<JsonLd now={new Date("2026-10-21T12:00:00Z")} />);
    expect(value).not.toContain("SoftwareApplication");
    expect(value).toContain("Organization");
    expect(value).toContain("WebSite");
  });
});
