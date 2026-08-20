import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Security headers applied to every response. Apple/Google submit
// reviewers (and Lighthouse / Mozilla Observatory) check these.
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  // HSTS — force HTTPS for 2 years, include subdomains, preload-eligible
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disable MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block legacy framing (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Modern frame-ancestors control (covered also by CSP below)
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // No camera / mic / geolocation usage on this site
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Tight CSP — allows inline styles (used by Next.js for CSS-in-JS),
  // Vercel Analytics (if added later), and Google Fonts. `unsafe-eval` is
  // added only in dev: Next.js's Fast Refresh runtime calls eval() to patch
  // modules in place, and without it HMR silently breaks (React Refresh
  // throws, falls back to full reloads / stale chunks). Production never
  // gets this relaxation.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // blob: in script-src + the worker-src directive exist for
      // troika-three-text (the WebGL hero's SDF text engine): it spawns a
      // blob: worker (worker-src) whose module code loads via a blob:
      // script inside that worker (script-src-elem falls back to
      // script-src). Without both, the worker request stalls the scene for
      // 10-15s before troika's main-thread fallback kicks in (measured on
      // /proto). Threat surface: blob code can only be constructed by
      // script already executing under script-src — which already admits
      // 'unsafe-inline' — so neither grant hands an attacker execution
      // they don't already have. If 'unsafe-inline' is ever replaced by
      // nonces (Y-P0-002-CSP-NONCE-SCOPE-KARARI.md), these two MUST be
      // re-evaluated in the same pass.
      // ⚠️ Security-class change: flag in the pre-merge independent review.
      `script-src 'self' 'unsafe-inline' blob:${isDev ? " 'unsafe-eval'" : ""} https://vercel.live https://va.vercel-scripts.com`,
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://vitals.vercel-insights.com https://vercel.live wss://vercel.live",
      // Burun Farkı's own CSP scopes frame-ancestors to this site
      // specifically (see burunfark-web vercel.json) — this is the other
      // half of that handshake, letting us embed its live /dogruluk page
      // as product proof instead of a static screenshot.
      "frame-src https://burunfark.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.braavolabs.com" },
      { protocol: "https", hostname: "**.burunfark.com" },
      { protocol: "https", hostname: "kocakkmustafa.github.io" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // links.yulalab.com (a separate origin) fetches this at runtime
        // (Y-P0-003) — CORS must be explicit and public-GET-only, scoped to
        // just this one static artifact rather than opened site-wide.
        source: "/portfolio-registry.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://links.yulalab.com" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // links.yulalab.com is the single canonical linktree surface — this
      // used to be a byte-identical copy in public/links/, manually kept in
      // sync (and drifting). One source now; short links (/bf, /lo, ...)
      // live entirely on links.yulalab.com's own vercel.json.
      {
        source: "/links",
        destination: "https://links.yulalab.com",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
