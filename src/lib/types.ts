export type LocalizedString = {
  tr: string;
  en: string;
};

export type Locale = "tr" | "en";

export type ProjectStatus = "live" | "beta" | "coming-soon" | "in-development";

export type ProjectKind = "web" | "mobile" | "platform" | "research";

export type ProjectBrand = {
  /** Hero / call-to-action color. */
  primary: string;
  /** Secondary accent (gradients, hover states). */
  secondary: string;
  /** Tertiary highlight color. */
  accent: string;
  /** Page background — usually deep / near-black. */
  background: string;
  /** Body / heading text base color on the project page. */
  foreground: string;
  /** A pre-built CSS gradient string used in hero, buttons, headings. */
  gradient: string;
  /** Soft brand glow used on the hero card. */
  glow: string;
  /** CSS font-family value for the project page display typeface. */
  fontDisplay: string;
  /** CSS font-family value for the project page body typeface. */
  fontBody: string;
  /** CSS font-family value for the project page mono typeface. */
  fontMono: string;
  /** Vibe label that can shape future visual variants. */
  mood?: string;
};

/**
 * "product" = a real screenshot from the shipped app/site — eligible for
 * the hero/evidence-strip ProductShot. "atmosphere" = mood/marketing
 * imagery (e.g. a stock photo) — never rendered as product proof.
 * "live" = the actual site embedded in an iframe (requires the target's
 * CSP to allow framing by this origin — see burunfark-web's vercel.json).
 * The discriminant keeps the honesty promise mechanical: an unlabeled or
 * atmosphere asset simply cannot reach ProductShot, and only a "live"
 * asset carries a `url` instead of a static `src`.
 */
export type ProjectAsset =
  | { kind: "product"; src: string; alt: string; caption?: string }
  | { kind: "atmosphere"; src: string; alt: string; caption?: string }
  | { kind: "live"; url: string; alt: string; caption?: string };

/** Names allowed for a feature icon — every value must exist in FEATURE_ICON
 *  (see components/common/icons.tsx). An unknown name fails typecheck, so a
 *  mistyped icon breaks the build instead of rendering a blank tile. */
export type FeatureIconName =
  | "LayoutDashboard"
  | "Lock"
  | "Cpu"
  | "Microscope"
  | "FileText"
  | "Sparkles"
  | "Eye"
  | "BadgeCheck"
  | "Database"
  | "TrendingUp"
  | "ShieldAlert"
  | "LayoutGrid"
  | "KeyRound"
  | "FileSearch"
  | "Network"
  | "ShieldCheck"
  | "Globe";

export type ProjectFeature = {
  title: LocalizedString;
  description: LocalizedString;
  icon?: FeatureIconName;
};

export type ProjectStat = {
  /** Big numeric / short value (locale-agnostic by default; localized when needed). */
  value: string;
  /** Caption underneath the value. */
  label: LocalizedString;
  /** Optional supporting line. */
  description?: LocalizedString;
};

export type LinkKind =
  | "web"
  | "github"
  | "appstore"
  | "playstore"
  | "x"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "discord"
  | "telegram"
  | "documentation"
  | "pressKit";

export type ProjectLink = {
  kind: LinkKind;
  /** Absolute URL. `null` marks a placeholder that must not render. */
  href: string | null;
};

export type ProjectSocials = Partial<Record<LinkKind, string>>;

export type ProjectConfig = {
  slug: string;
  name: string;
  /** One- or two-letter monogram used in fallback brand panels. */
  monogram: string;
  kind: ProjectKind[];
  status: ProjectStatus;
  /** Short category badge — e.g. "AI Operating System", "Mobile App". */
  category: LocalizedString;
  /** Single-sentence promise shown on cards and the project hero. */
  tagline: LocalizedString;
  /** 2–3 sentence summary; renders directly under the hero. */
  description: LocalizedString;
  /** Compact one-paragraph pitch used on the project index card and the showcase "Ne yapıyor?" block. */
  short: LocalizedString;

  brand: ProjectBrand;

  visuals: {
    logo: string;
    icon?: string;
    banner?: string;
    ogImage?: string;
    screenshots: ProjectAsset[];
  };

  features: ProjectFeature[];
  stats: ProjectStat[];

  vision: LocalizedString;
  mission: LocalizedString;

  /** Order on the projects index. Lower numbers come first. */
  order: number;

  /** Ordered array of outbound links shown as pills on the showcase. */
  links: ProjectLink[];
  /**
   * Which of `links` the product page's primary CTA points at.
   *
   * Explicit rather than inferred, because inferring it went wrong on the
   * live site: the CTA fell back to the `web` link for every product, so
   * LifeOS — whose button reads "Open in the App Store" — sent visitors to
   * its legal microsite while its real App Store URL sat unused two lines
   * away in the same array. A priority rule ("prefer appstore") would have
   * broken Braavolabs, whose button correctly promises its own beta queue.
   * The destination is per-product data, so it is stated as data.
   */
  primaryCtaKind?: LinkKind;

  /** Optional contact email shown in the project footer. */
  contactEmail?: string;
};

export type CompanyConfig = {
  name: string;
  legalName: string;
  tagline: LocalizedString;
  shortDescription: LocalizedString;
  vision: LocalizedString;
  mission: LocalizedString;
  values: { title: LocalizedString; description: LocalizedString }[];
  founder: { name: string; role: LocalizedString; email: string };
  contact: { email: string; press?: string };
  socials: ProjectSocials;
  brand: {
    banner: string;
    favicon?: string;
  };
};

export const STATUS_KEY: Record<ProjectStatus, string> = {
  live: "live",
  beta: "beta",
  "coming-soon": "comingSoon",
  "in-development": "inDevelopment",
};

// ---------------------------------------------------------------------------
// Public registry (Y-P0-003) — single source of truth for sanitised public
// claim/status/source data, consumed by both the main site and
// links.yulalab.com. See ventures/yulalab-com/site/src/data/public-registry.ts
// for the data and src/lib/public-registry.ts for the read/validation layer.
//
// ProductLifecycle is deliberately its own enum, not ProjectStatus: the
// registry's public-facing vocabulary ("research" for anything without a
// shippable UI yet) differs from the internal ProjectConfig.status used to
// drive the existing showcase pages. See public-registry.ts for the mapping.
// ---------------------------------------------------------------------------

export type ProductLifecycle = "live" | "beta" | "research" | "archived";

/**
 * How a claim/surface was established. Not a quality ranking — a scope
 * label so a reader (or a future stricter gate) can tell "I read the
 * runtime code and counted" apart from "the product's own copy says so and
 * nobody independently re-checked it this session."
 */
export type EvidenceKind =
  | "measured"
  | "source-code-verified"
  | "self-reported"
  | "third-party-verified";

export type SurfaceKind = "web" | "ios" | "android" | "desktop" | "cli";

export type SurfaceStatus = "live" | "beta" | "coming-soon" | "unavailable";

export type ProductSurface = {
  kind: SurfaceKind;
  url: string;
  status: SurfaceStatus;
  /** Where this status was confirmed — a URL, a dated code comment, an ASC/Play console screenshot, etc. */
  source: string;
  /** ISO date the status was last confirmed true. */
  verifiedAt: string;
  /** ISO date after which this status must be re-confirmed before being trusted. */
  expiresAt: string;
};

export type ProductPrimaryCta = {
  labelTr: string;
  labelEn: string;
  url: string;
};

export type ProductScreenshot = {
  path: string;
  /** Commit SHA, build tag, or harvest method (e.g. "headless browser capture") the image came from. */
  sourceBuild: string;
  /** ISO date the screenshot was captured. */
  capturedAt: string;
  altTr: string;
  altEn: string;
};

export type ProductClaim = {
  /** Stable id — used as a React key and to diff claims across registry exports. */
  id: string;
  statementTr: string;
  statementEn: string;
  evidenceKind: EvidenceKind;
  /** File path, URL, or dated note the claim traces back to. */
  source: string;
  /** What the claim does and does NOT cover — the exact boundary of the number. */
  scope: string;
  /** Which venture/team owns re-verifying this claim. */
  owner: string;
  verifiedAt: string;
  expiresAt: string;
};

export type ProductPublicRecord = {
  slug: string;
  name: string;
  lifecycle: ProductLifecycle;
  surfaces: ProductSurface[];
  primaryCta: ProductPrimaryCta;
  screenshots: ProductScreenshot[];
  claims: ProductClaim[];
  privacyUrl: string;
  supportUrl: string;
  /** ISO date this record itself was last edited (not per-field verifiedAt). */
  updatedAt: string;
};
