import type { ProjectConfig } from "@/lib/types";

export const braavolabs: ProjectConfig = {
  slug: "braavolabs",
  name: "Braavolabs",
  monogram: "B",
  kind: ["platform", "web", "mobile"],
  status: "beta",
  category: {
    tr: "Otonom AI Şirket İşletim Sistemi",
    en: "Autonomous AI Company OS",
  },
  tagline: {
    tr: "AI ekibini tek merkezden yönet.",
    en: "Manage your AI team in one place.",
  },
  description: {
    tr: "Braavolabs, küçük ekiplerin AI ajanlarını ve otomasyonlarını tek panelden kurup yönetmesini sağlayan bir işletim sistemi.",
    en: "Braavolabs is an operating system for small teams to build and manage AI agents and automations from a single panel.",
  },
  short: {
    tr: "Küçük ekipler için otonom AI şirket OS'i. Primitifler, ajan ağları ve şeffaf maliyet — tek panel.",
    en: "An autonomous AI company OS for small teams. Primitives, agent networks and transparent cost — one panel.",
  },
  brand: {
    primary: "#00D1FF",
    secondary: "#4060FF",
    accent: "#6D11AD",
    background: "#050810",
    foreground: "#E1E2EB",
    gradient: "linear-gradient(135deg, #00D1FF 0%, #4060FF 50%, #6D11AD 100%)",
    glow: "0 0 80px -10px rgba(64,96,255,0.55)",
    fontDisplay: '"Space Grotesk", Inter, sans-serif',
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "linear-superhuman-vercel",
  },
  visuals: {
    logo: "/projects/braavolabs/logo.png",
    icon: "/projects/braavolabs/icon.png",
    ogImage: "/projects/braavolabs/og.png",
    // Real captures from the live product (braavolabs.com), not mockups —
    // harvested 2026-07-11 via headless browser, cropped to the UI itself.
    screenshots: [
      {
        src: "/projects/braavolabs/screenshot-audit-trail.png",
        alt: "Braavolabs canlı denetim izi: her ajan adımının araç çağrısı ve maliyeti gerçek zamanlı akıyor.",
        kind: "product",
      },
      {
        src: "/projects/braavolabs/screenshot-builder.png",
        alt: "Braavolabs AI Şirket Kurucusu: tek bir komutla çok-ajanlı bir ekip kuruluyor.",
        kind: "product",
      },
    ],
  },
  features: [
    {
      title: { tr: "Primitive katmanı", en: "Primitive layer" },
      description: {
        tr: "Edinim, satış, teslimat, içerik, operasyon, finans, analitik, bellek ve yönetişim: 9 yeniden kullanılabilir primitif.",
        en: "Acquisition, sales, delivery, content, operations, finance, analytics, memory and governance: 9 reusable primitives.",
      },
      icon: "LayoutGrid",
    },
    {
      title: { tr: "Çoklu sağlayıcı", en: "Multi-provider" },
      description: {
        tr: "OpenAI, Anthropic, Mistral, Gemini ve 10 sağlayıcı daha; kendi anahtarlarınla tek arayüzden bağlanırsın.",
        en: "OpenAI, Anthropic, Mistral, Gemini and 10 more providers, connected with your own keys in one interface.",
      },
      icon: "KeyRound",
    },
    {
      title: { tr: "Şeffaf maliyet", en: "Transparent cost" },
      description: {
        tr: "Her ajan, her token, her saniye — kim ne harcadı, hangi karara mal oldu, açık panelde.",
        en: "Every agent, every token, every second — who spent what for which decision, in plain view.",
      },
      icon: "FileSearch",
    },
    {
      title: { tr: "Harcama onayı", en: "Spend approval" },
      description: {
        tr: "Para harcayan adımlar açık bir insan onayını bekler; her adım denetim izinde görünür.",
        en: "Steps that spend money wait for an explicit human approval; every step shows in the audit trail.",
      },
      icon: "ShieldCheck",
    },
    {
      title: { tr: "Politika motoru", en: "Policy engine" },
      description: {
        tr: "Roller, izinler ve kesin bütçe durdurmaları.",
        en: "Roles, permissions and hard budget stops.",
      },
      icon: "Network",
    },
    {
      title: { tr: "14 dil", en: "14 languages" },
      description: {
        tr: "Braavolabs mobil uygulaması 14 dilde kullanılabilir.",
        en: "The Braavolabs mobile app is available in 14 languages.",
      },
      icon: "Globe",
    },
  ],
  stats: [
    {
      value: "9",
      label: { tr: "Primitif", en: "Primitives" },
      claimId: "braavolabs-primitive-count",
    },
    {
      value: "14",
      label: { tr: "LLM Sağlayıcı", en: "LLM Providers" },
      claimId: "braavolabs-provider-count",
    },
    { value: "14", label: { tr: "Dil (mobil uygulama)", en: "Languages (mobile app)" } },
  ],
  vision: {
    tr: "Her küçük ekibin, kendi otonom dijital iş gücünü onlarca dakika içinde kurabildiği bir dünya.",
    en: "A world where every small team can stand up their own autonomous digital workforce in minutes.",
  },
  mission: {
    tr: "Ajan tabanlı sistemleri spor salonu jargonundan çıkarıp, gerçekten kullanışlı, ölçülebilir, denetlenebilir bir mühendislik disiplinine çevirmek.",
    en: "Move agent-based systems out of marketing jargon and into a useful, measurable, auditable engineering discipline.",
  },
  order: 1,
  links: [
    { kind: "web", href: "https://braavolabs.com" },
    { kind: "appstore", href: "https://apps.apple.com/us/app/braavolabs/id6771440905" },
    { kind: "x", href: "https://x.com/braavolabs" },
    { kind: "linkedin", href: "https://www.linkedin.com/company/braavolabs" },
  ],
  contactEmail: "support@yulalab.com",
};
