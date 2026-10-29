import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { presentSurfaces } from "@/lib/proof";

/** Canonical production origin for absolute schema.org URLs. */
const ORIGIN = "https://yulalab.com";

/** schema.org applicationCategory + honest live operatingSystem per product. */
const APP_META: Record<string, { category: string; os: string }> = {
  lifeos: { category: "HealthApplication", os: "iOS" },
  burunfarki: { category: "SportsApplication", os: "Web" },
  braavolabs: { category: "BusinessApplication", os: "iOS, Web" },
};

/**
 * Structured data (JSON-LD) for the umbrella site:
 *   - Organization (the studio)
 *   - WebSite
 *   - one SoftwareApplication per product
 * Emitted once from the root layout. No social `sameAs` until the handles
 * are verified live — the brand rule forbids advertising dead profiles.
 */
export function JsonLd({ now = new Date() }: { now?: Date } = {}) {
  const organization = {
    "@type": "Organization",
    "@id": `${ORIGIN}/#organization`,
    name: company.name,
    address: { "@type": "PostalAddress", addressCountry: "TR" },
    url: ORIGIN,
    email: company.contact.email,
    logo: `${ORIGIN}/brand/yulalab-banner.png`,
    founder: { "@type": "Person", name: company.founder.name },
    foundingDate: "2025",
    areaServed: "TR",
  };

  const website = {
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    url: ORIGIN,
    name: company.name,
    inLanguage: SUPPORTED_LOCALES,
    publisher: { "@id": `${ORIGIN}/#organization` },
  };

  const apps = projects.filter((p) => {
    const record = publicRegistry.find((entry) => entry.slug === p.slug);
    if (!record || (record.lifecycle !== "live" && record.lifecycle !== "beta")) return false;
    const primary = p.links.find((link) => link.kind === (p.primaryCtaKind ?? "web"))?.href;
    return Boolean(primary && presentSurfaces(record, now).some(({ surface, statusConfirmed }) =>
      statusConfirmed && (surface.status === "live" || surface.status === "beta") &&
      surface.url.replace(/\/$/, "") === primary.replace(/\/$/, ""),
    ));
  }).map((p) => {
    const meta = APP_META[p.slug] ?? { category: "MobileApplication", os: "iOS" };
    const canonical =
      p.links.find((l) => l.kind === "web" && l.href)?.href ??
      p.links.find((l) => l.kind === "appstore" && l.href)?.href ??
      `${ORIGIN}/projects/${p.slug}`;
    return {
      "@type": "SoftwareApplication",
      name: p.name,
      applicationCategory: meta.category,
      operatingSystem: meta.os,
      url: canonical,
      description: p.short.en,
      publisher: { "@id": `${ORIGIN}/#organization` },
    };
  });

  const graph = { "@context": "https://schema.org", "@graph": [organization, website, ...apps] };

  return (
    <script
      type="application/ld+json"
      // Static data derived from local config; safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
