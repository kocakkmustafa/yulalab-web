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

export type ProjectAsset = {
  src: string;
  alt: string;
  caption?: string;
};

export type ProjectFeature = {
  title: LocalizedString;
  description: LocalizedString;
  icon?: string;
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
  href: string;
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
    logo: string;
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
