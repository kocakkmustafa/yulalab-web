import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { filterUnsupportedChineseLanguages, normalizeLocale, type Locale } from "@/i18n/locales";

const intl = createMiddleware(routing);

// next-intl's locale middleware should not run on Next.js metadata-file
// routes (opengraph-image, twitter-image, icon, etc.). Those live at fixed
// top-level paths and a `localePrefix: "as-needed"` rewrite would
// 404 them. The dot-exclusion in the matcher catches `/sitemap.xml`
// and `/robots.txt`, but the metadata route segments have no extension
// in the URL — so we filter them in middleware code instead.
const METADATA_ROUTES = [
  "opengraph-image",
  "twitter-image",
  "icon",
  "apple-icon",
  "manifest",
];

function isMetadataRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const last = segments[segments.length - 1];
  return METADATA_ROUTES.some(
    (name) => last === name || last.startsWith(`${name}.`),
  );
}

function canonicalRedirect(req: NextRequest, pathname: string, locale: Locale) {
  const destination = new URL(req.url);
  destination.pathname = pathname;
  const response = NextResponse.redirect(destination);
  // Explicit locale paths take precedence over a previous cookie or the
  // browser language, including after TR's as-needed prefix is removed.
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
  return response;
}

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Netlify can forward next-intl's internal /tr rewrite before evaluating
  // Next config redirects. Resolve this external alias before locale routing
  // so /links cannot become an unknown localized page. Never forward query
  // values: the destination is the fixed public hub, not a caller's returnTo.
  const linksMatch = /^\/(?:([^/]+)\/)?links\/?$/.exec(decoded);
  const linksLocale = linksMatch?.[1] ? normalizeLocale(linksMatch[1]) : undefined;
  if (linksMatch && (!linksMatch[1] || linksLocale)) {
    const destination = new URL("https://links.yulalab.com/");
    if (linksLocale) destination.searchParams.set("lang", linksLocale);
    return NextResponse.redirect(destination, 308);
  }

  // Config headers match the encoded URL, while route matching can decode
  // segments. Canonicalize capability aliases before a successful response
  // so the generic policy cannot mask the route's random nonce policy.
  // The Motion parental-consent page is the same kind of capability document.
  const capability = /^\/(?:([^/]+)\/)?(data-request\/verify|motion\/consent)\/?$/.exec(decoded);
  const capabilityLocale = capability?.[1] ? normalizeLocale(capability[1]) : "tr";
  if (capability && capabilityLocale) {
    const canonical = capabilityLocale === "tr"
      ? `/${capability[2]}`
      : `/${capabilityLocale}/${capability[2]}`;
    if (pathname !== canonical) {
      return canonicalRedirect(req, canonical, capabilityLocale);
    }
  }

  // Canonicalize explicit locale aliases here only. A config redirect would run
  // again after Netlify forwards next-intl's internal /tr rewrite to Next.
  const firstSegment = decoded.split("/")[1];
  const normalizedLocale = normalizeLocale(firstSegment);
  if (normalizedLocale && (firstSegment !== normalizedLocale || normalizedLocale === "tr")) {
    const remainder = decoded.slice(firstSegment.length + 1) || "/";
    const canonical = normalizedLocale === "tr" ? remainder : `/${normalizedLocale}${remainder === "/" ? "" : remainder}`;
    const decodedCanonical = remainder;
    if (/^\/[\\/]/.test(decodedCanonical) || decodedCanonical.includes("\\")) {
      return new NextResponse(null, { status: 400 });
    }
    return canonicalRedirect(req, canonical, normalizedLocale);
  }

  if (isMetadataRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (
    /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(firstSegment) &&
    !routing.locales.some((locale) => locale === firstSegment)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const languageHeader = req.headers.get("accept-language");
  const supportedLanguages = filterUnsupportedChineseLanguages(languageHeader);
  if (supportedLanguages !== languageHeader) {
    const headers = new Headers(req.headers);
    if (supportedLanguages) headers.set("accept-language", supportedLanguages);
    else headers.delete("accept-language");
    // Keep ordinary language negotiation and the locale cookie. A Traditional
    // Chinese preference must not be best-fit matched to Simplified Chinese.
    return intl(new NextRequest(req, { headers }));
  }
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
