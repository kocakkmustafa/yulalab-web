/**
 * Single source for the header, mobile menu and footer link sets. Routes are
 * never renamed here: each entry only maps a visitor-facing label key to an
 * existing route. `tests/header-footer-routes.test.ts` compares these sets
 * with every `src/app/[locale]/**` page so no route silently becomes
 * unreachable. Rationale: docs/yula-execution/header-footer-routes.md.
 */
export type HeaderKey = "products" | "lab" | "approach" | "collaboration";
export type HeaderHref = "/projects" | "/notes" | "/manifesto" | "/consulting";

/** Desktop order follows the ticket; `primary` entries are the three prominent mobile entries. */
export const HEADER_NAV: ReadonlyArray<{ key: HeaderKey; href: HeaderHref; primary: boolean }> = [
  { key: "products", href: "/projects", primary: true },
  { key: "lab", href: "/notes", primary: true },
  { key: "approach", href: "/manifesto", primary: false },
  { key: "collaboration", href: "/consulting", primary: true },
];

/** Secondary mobile-only entries (smaller type, below the three primary ones). */
export const MOBILE_EXTRA_NAV = [
  { key: "home", href: "/" },
  { key: "contact", href: "/contact" },
] as const;

/** Header call-to-action (desktop pill and the mobile panel's closing action). */
export const HEADER_CTA = { key: "ctaProjects", href: "/projects" } as const;

export type FooterCompanyKey =
  | "navConsulting" | "navManifesto" | "navTransparency" | "navWhyYula" | "navProjects" | "navNotes"
  | "navStudio" | "navCaseStudies" | "navOperatingSystem" | "navContact";

/** `header` entries reuse a `header.*` label (e.g. `header.doors`) instead of a `footer.*` one. */
export const FOOTER_COMPANY_NAV: ReadonlyArray<
  | { key: FooterCompanyKey; href: string; studioOnly?: boolean; ns?: undefined }
  | { key: "doors"; href: string; studioOnly?: boolean; ns: "header" }
> = [
  { key: "doors", href: "/start", ns: "header" },
  { key: "navConsulting", href: "/consulting" },
  { key: "navManifesto", href: "/manifesto" },
  { key: "navTransparency", href: "/transparency" },
  { key: "navWhyYula", href: "/why-yula" },
  { key: "navProjects", href: "/projects" },
  { key: "navNotes", href: "/notes" },
  { key: "navStudio", href: "/studio", studioOnly: true },
  { key: "navCaseStudies", href: "/case-studies" },
  { key: "navOperatingSystem", href: "/operating-system" },
  { key: "navContact", href: "/contact" },
];

export const FOOTER_LEGAL_NAV = [
  { key: "navPrivacy", href: "/privacy" },
  { key: "navTerms", href: "/terms" },
  { key: "navSupport", href: "/support" },
] as const;

/** Footer social labels: proper names, identical in every language. */
export const SOCIAL_LABEL = { x: "X", linkedin: "LinkedIn", instagram: "Instagram" } as const;
