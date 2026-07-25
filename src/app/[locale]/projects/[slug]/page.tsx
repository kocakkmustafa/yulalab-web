import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getProjectBySlug, getProjectSlugs } from "@/data/projects";
import { ProductPage } from "@/components/projects/ProductPage";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = getProjectSlugs();
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const lang = locale as Locale;
  return {
    title: project.name,
    description: project.tagline[lang],
    alternates: {
      canonical: locale === "tr" ? `/projects/${slug}` : `/${locale}/projects/${slug}`,
      languages: {
        tr: `/projects/${slug}`,
        en: `/en/projects/${slug}`,
      },
    },
    openGraph: {
      title: `${project.name} — ${project.tagline[lang]}`,
      description: project.description[lang],
      images: [
        { url: `/projects/${slug}/opengraph-image`, width: 1200, height: 630 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} — ${project.tagline[lang]}`,
      description: project.description[lang],
      images: [`/projects/${slug}/opengraph-image`],
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  return <ProductPage project={project} />;
}
