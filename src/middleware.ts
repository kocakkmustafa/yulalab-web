import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

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

export default function middleware(req: NextRequest) {
  if (isMetadataRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
