import type { MetadataRoute } from "next";

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://yulalab.com";
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
