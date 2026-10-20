/** One stable public origin for canonicals, sitemap and structured metadata. */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return explicit ? explicit.replace(/\/+$/, "") : "https://yulalab.com";
}
