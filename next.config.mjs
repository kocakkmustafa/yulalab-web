import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Security headers applied to every response. Apple/Google submit
// reviewers (and Lighthouse / Mozilla Observatory) check these.
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
  // Vercel Analytics (if added later), and Google Fonts.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://vitals.vercel-insights.com https://vercel.live wss://vercel.live",
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
    ];
  },
};

export default withNextIntl(nextConfig);
