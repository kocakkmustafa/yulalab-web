import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { projects } from "@/data/projects";
import { siteOrigin } from "@/lib/site-origin";

const STATIC_PATHS = [
  "/",
  "/manifesto",
  "/transparency",
  "/projects",
  "/notes",
  "/case-studies",
  "/operating-system",
  "/contact",
  "/consulting",
  "/support",
  "/terms",
  "/privacy",
  "/privacy/lifeos",
  "/delete-account/lifeos",
  "/privacy/braavolabs",
  "/privacy/burunfarki",
  "/privacy/motion",
];


function url(origin: string, locale: string, path: string): string {
  const isDefault = locale === routing.defaultLocale;
  const prefix = isDefault ? "" : `/${locale}`;
  const tail = path === "/" ? "" : path;
  return `${origin}${prefix}${tail || "/"}`.replace(/\/+$/, "") || `${origin}/`;
}

function altLanguages(origin: string, path: string): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, url(origin, locale, path)]),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const dynamicProjectPaths = projects.map((p) => `/projects/${p.slug}`);
  const allPaths = [...STATIC_PATHS, ...dynamicProjectPaths];

  const priorityFor = (path: string, isDefaultLocale: boolean): number => {
    const base = (() => {
      if (path === "/") return 1.0;
      if (path === "/projects") return 0.9;
      if (path.startsWith("/projects/")) return 0.8;
      if (path === "/transparency") return 0.8;
      if (path === "/notes") return 0.6;
      if (path === "/privacy" || path === "/support" || path === "/terms") return 0.5;
      if (path.startsWith("/privacy/")) return 0.4;
      return 0.7;
    })();
    return isDefaultLocale ? base : Math.max(0.5, base - 0.1);
  };

  return routing.locales.flatMap((locale) =>
    allPaths.map((path) => ({
      url: url(origin, locale, path),
      changeFrequency: "monthly" as const,
      priority: priorityFor(path, locale === routing.defaultLocale),
      alternates: { languages: altLanguages(origin, path) },
    })),
  );
}
