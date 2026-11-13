import { storeSlotsOf } from "@/lib/store-slots";
import { localeAlternates } from "@/i18n/locales";
import { localized } from "@/lib/localized";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { ProductUniverse, type UniverseItem } from "@/components/universe/ProductUniverse";
import { projects } from "@/data/projects";
import { groupProducts } from "@/lib/product-index";
import { company } from "@/data/company";
import { publicRegistry } from "@/data/public-registry";
import type { Locale, ProjectConfig } from "@/lib/types";
import { GlassSheen } from "@/components/common/GlassSheen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projectsIndex" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: locale === "tr" ? "/projects" : `/${locale}/projects`,
      languages: localeAlternates("/projects"),
    },
  };
}

export default async function ProjectsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectsIndex />;
}

const STORE_NAME = { appstore: "App Store", playstore: "Google Play" } as const;
const NOTIFY_ME = { tr: "Çıkınca haber ver", en: "Notify me at launch" };

/**
 * Access targets of one product: the same rule as the product page (only a
 * real destination is drawn; a product with none keeps the "notify me" mail
 * and the contact mail).
 */
function accessOf(
  project: ProjectConfig,
  locale: Locale,
  p: Record<string, string>,
): UniverseItem["access"] {
  const kind = project.primaryCtaKind ?? "web";
  const web = project.links.find((l) => l.kind === kind)?.href;
  const email = project.contactEmail ?? company.contact.email;
  const comingSoon = project.status === "coming-soon" || project.status === "in-development";
  return {
    primary: web ? { href: web, label: p.ctaPrimary } : undefined,
    stores: project.links
      .filter(
        (l): l is { kind: "appstore" | "playstore"; href: string } =>
          (l.kind === "appstore" || l.kind === "playstore") && Boolean(l.href) && l.kind !== kind,
      )
      .map((l) => ({ kind: l.kind, href: l.href, label: STORE_NAME[l.kind] })),
    notify: comingSoon
      ? {
          href: `mailto:${email}?subject=${encodeURIComponent(`${project.name} — ${localized(NOTIFY_ME, locale)}`)}`,
          label: localized(NOTIFY_ME, locale),
        }
      : undefined,
    contact: { href: `mailto:${email}`, label: p.ctaSecondary },
  };
}

function ProjectsIndex() {
  const t = useTranslations("projectsIndex");
  const tProduct = useTranslations("product");
  const tFooter = useTranslations("footer");
  const locale = useLocale() as Locale;

  // One order for every surface: PRODUCT_ORDER (src/lib/product-index.ts).
  // The `projects` array is already in that order; grouping only splits
  // "Ana ürünler" from "Portföy".
  const groups = groupProducts(projects);
  const featuredSlugs = new Set(groups.featured.map((p) => p.slug));
  const items: UniverseItem[] = [...groups.featured, ...groups.portfolio].map((project) => {
    const p = tProduct.raw(project.slug) as Record<string, string>;
    const record = publicRegistry.find((r) => r.slug === project.slug);
    const shot = project.visuals.screenshots.find((a) => a.kind === "product");
    return {
      slug: project.slug,
      name: project.name,
      status: project.status,
      group: featuredSlugs.has(project.slug) ? "featured" : "portfolio",
      category: localized(project.category, locale),
      tagline: localized(project.tagline, locale),
      access: accessOf(project, locale, p),
      storeSlots: storeSlotsOf(project),
      privacyUrl: record?.privacyUrl,
      screenshot: shot && shot.kind === "product" ? { src: shot.src, alt: shot.alt } : undefined,
    };
  });

  return (
    <div className="page-enter relative project-index">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("eyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[80px]">
          <StaggerWords text={t("title")} />
        </h1>
        <p className="mt-7 max-w-[58ch] text-[16.5px] leading-[1.65] text-ink-300">
          {t("intro")}
        </p>
      </section>

      {/* WEB-UX-05b: grouped list + status filter + desktop-only side panel
          (04-design §E3). Order follows PRODUCT_ORDER; each row carries the
          registry status pill. Publication evidence lives on /transparency. */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-20">
        <ProductUniverse
          items={items}
          strings={{
            privacy: tFooter("navPrivacy"),
            support: tFooter("navSupport"),
            supportUrl: "/support",
            statusLink: t("panelStatusLink"),
            screenEmpty: t("panelScreenEmpty"),
          }}
        />
      </section>
    </div>
  );
}
