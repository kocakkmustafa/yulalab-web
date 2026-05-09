export type LocalizedString = {
  tr: string;
  en: string;
};

export type ProjectStatus = "live" | "beta" | "pre-launch" | "in-development";

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
  /** Optional Google Font family for headings on this project's page. */
  fontDisplay?: string;
  /** Optional Google Font family for body text on this project's page. */
  fontBody?: string;
  /** Optional Google Font family for monospace / numerical UI. */
  fontMono?: string;
  /** Optional vibe note that influences the visual treatment of the page. */
  mood?: string;
};

export type ProjectAsset = {
  src: string;
  alt: string;
  caption?: string;
};

export type ProjectFeature = {
  title: string;
  description: string;
  /** Lucide icon name; matched dynamically inside the component. */
  icon?: string;
};

export type ProjectStat = {
  label: string;
  value: string;
  description?: string;
};

export type ProjectLinks = {
  website?: string;
  appStore?: string;
  playStore?: string;
  webApp?: string;
  github?: string;
  pressKit?: string;
  documentation?: string;
};

export type ProjectSocials = {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  discord?: string;
  telegram?: string;
};

export type ProjectConfig = {
  slug: string;
  name: string;
  kind: ProjectKind[];
  status: ProjectStatus;
  /** Short category badge — e.g. "AI Operating System", "Mobile App". */
  category: LocalizedString;
  /** Single-sentence promise shown on cards and the project hero. */
  tagline: LocalizedString;
  /** 2–3 sentence summary; renders directly under the hero. */
  description: LocalizedString;
  /** 30-second elevator pitch; renders inside the "Ne yapıyor?" section. */
  pitch: LocalizedString;

  brand: ProjectBrand;

  visuals: {
    logo: string;
    icon?: string;
    banner?: string;
    ogImage?: string;
    screenshots: ProjectAsset[];
  };

  features: ProjectFeature[];
  stats?: ProjectStat[];

  vision?: LocalizedString;
  mission?: LocalizedString;

  /** Order on the projects index. Lower numbers come first. */
  order: number;

  links: ProjectLinks;
  socials: ProjectSocials;

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
