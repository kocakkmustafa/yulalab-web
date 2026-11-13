import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_COMPANY_NAV, FOOTER_LEGAL_NAV, HEADER_CTA, HEADER_NAV, MOBILE_EXTRA_NAV } from "@/components/layout/nav-config";
import { projects } from "@/data/projects";
import { company } from "@/data/company";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

const pagesRoot = path.join(process.cwd(), "src/app/[locale]");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name === "page.tsx" ? [path.join(dir, entry.name)] : [],
  );
}
const routes = walk(pagesRoot).map((file) => {
  const route = "/" + path.relative(pagesRoot, path.dirname(file)).split(path.sep).join("/");
  return route === "/." ? "/" : route;
}).sort();

/** Links a visitor can reach from the header, the mobile menu and the footer (studio counted as enabled). */
const linked = new Set<string>([
  "/",
  ...HEADER_NAV.map((n) => n.href),
  ...MOBILE_EXTRA_NAV.map((n) => n.href),
  HEADER_CTA.href,
  ...FOOTER_COMPANY_NAV.map((n) => n.href),
  ...FOOTER_LEGAL_NAV.map((n) => n.href),
]);

/** Routes not in header/footer on purpose; every entry needs a reason and a reachable parent. */
const ALLOWLIST: Record<string, { reason: string; via: string | null; orphanReason?: string }> = {
  "/[...rest]": { reason: "catch-all that renders the localized 404; not a destination", via: "/" },
  "/privacy/braavolabs": { reason: "per-product privacy notice, listed on the privacy hub", via: "/privacy" },
  "/privacy/burunfarki": { reason: "per-product privacy notice, listed on the privacy hub", via: "/privacy" },
  "/privacy/lifeos": { reason: "per-product privacy notice, listed on the privacy hub", via: "/privacy" },
  "/privacy/motion": { reason: "per-product privacy notice, listed on the privacy hub and support page", via: "/privacy" },
  "/delete-account/lifeos": { reason: "store data-deletion URL for the store listing; also linked from the support page", via: "/support" },
  "/lab": { reason: "home door and /transparency link target (WEB-UX-05d/05e), not a header entry", via: "/" },
  "/prototype/contact": { reason: "WEB-UX-04 prototype route, closed by default (UX_PROTOTYPE!==1 answers 404)", via: null, orphanReason: "closed-by-default prototype; no in-site link by design" },
  "/prototype/projects": { reason: "WEB-UX-04 prototype route, closed by default (UX_PROTOTYPE!==1 answers 404)", via: null, orphanReason: "closed-by-default prototype; no in-site link by design" },
  "/prototype/projects/[slug]": { reason: "WEB-UX-04 prototype route, closed by default (UX_PROTOTYPE!==1 answers 404)", via: null, orphanReason: "closed-by-default prototype; no in-site link by design" },
  "/prototype/start": { reason: "WEB-UX-04 prototype route, closed by default (UX_PROTOTYPE!==1 answers 404)", via: null, orphanReason: "closed-by-default prototype; no in-site link by design" },
  "/delete-account/motion": { reason: "store data-deletion URL for the store listings", via: null, orphanReason: "known orphan: only the sitemap links it; no in-site link today" },
};
/** Dynamic routes are covered by their list page (and, for products, by per-product footer links). */
const DYNAMIC_PARENT: Record<string, string> = {
  "/case-studies/[slug]": "/case-studies",
  "/notes/[slug]": "/notes",
  "/projects/[slug]": "/projects",
};

describe("header and footer route table", () => {
  it("discovers the known page set", () => {
    expect(routes.length).toBeGreaterThanOrEqual(20);
    expect(routes).toContain("/projects");
  });

  it("leaves no page unreachable unless allow-listed with a reason", () => {
    const orphans = routes.filter((route) => {
      if (linked.has(route) || route in ALLOWLIST) return false;
      const parent = DYNAMIC_PARENT[route];
      return !(parent && linked.has(parent));
    });
    expect(orphans).toEqual([]);
  });

  it("keeps allow-list entries real, reasoned and anchored to a linked parent", () => {
    for (const [route, entry] of Object.entries(ALLOWLIST)) {
      expect(routes, `stale allow-list entry ${route}`).toContain(route);
      expect(entry.reason.length).toBeGreaterThan(10);
      if (entry.via === null) {
        expect(entry.orphanReason?.length ?? 0, `${route}: orphans need an orphanReason`).toBeGreaterThan(10);
      } else {
        expect(linked.has(entry.via), `${route} via ${entry.via}`).toBe(true);
      }
      expect(linked.has(route), `${route} is linked; drop it from the allow-list`).toBe(false);
    }
  });

  it("points every header, menu and footer entry at an existing page", () => {
    for (const href of linked) expect(routes, href).toContain(href === "/" ? "/" : href);
  });

  it("exposes the three primary entries and the ticket mapping", () => {
    expect(HEADER_NAV.map((n) => [n.key, n.href])).toEqual([
      ["products", "/projects"], ["lab", "/notes"], ["approach", "/manifesto"], ["collaboration", "/consulting"],
    ]);
    expect(HEADER_NAV.filter((n) => n.primary).map((n) => n.key)).toEqual(["products", "lab", "collaboration"]);
  });

  it("renders a footer product link for every project slug", () => {
    const footer = fs.readFileSync(path.join(process.cwd(), "src/components/layout/Footer.tsx"), "utf8");
    expect(footer).toMatch(/projects\.map\(\(p\) =>[\s\S]*href=\{`\/projects\/\$\{p\.slug\}`\}/);
    expect(projects.length).toBeGreaterThan(0);
    expect(routes).toContain("/projects/[slug]");
  });

  it("never links an unverified store from the footer", () => {
    const footer = fs.readFileSync(path.join(process.cwd(), "src/components/layout/Footer.tsx"), "utf8");
    const nav = fs.readFileSync(path.join(process.cwd(), "src/components/layout/nav-config.ts"), "utf8");
    const store = /apps\.apple\.com|itunes\.apple\.com|play\.google\.com|appstore|google\s*play/i;
    expect(footer).not.toMatch(store);
    expect(nav).not.toMatch(store);
    for (const url of Object.values(company.socials)) expect(url).not.toMatch(store);
  });

  it("carries complete header keys in every language", () => {
    const keys = ["products", "lab", "approach", "collaboration", "home", "contact", "ctaProjects", "menuOpen", "menuClose", "language"];
    for (const locale of SUPPORTED_LOCALES) {
      const header = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")).header;
      for (const key of keys) expect(typeof header[key] === "string" && header[key].trim().length > 0, `${locale}.header.${key}`).toBe(true);
    }
  });
});
