import type { ProjectConfig } from "@/lib/types";

export const lifeos: ProjectConfig = {
  slug: "lifeos",
  name: "LifeOS",
  monogram: "L",
  kind: ["mobile"],
  status: "live",
  category: {
    tr: "Kişisel Yaşam İşletim Sistemi",
    en: "Personal Life Operating System",
  },
  tagline: {
    tr: "Hayatını yönet, AI ile geliş.",
    en: "Run your life like a system.",
  },
  description: {
    tr: "LifeOS, hayatın 5 alanını (sağlık, finans, ilişkiler, kariyer, anlam) tek bir yerel-öncelikli OS'te yöneten, isteğe bağlı senkronu olan bir kişisel yaşam aracı.",
    en: "LifeOS unifies five life domains (health, finance, relationships, career, meaning) in a single offline-first OS with optional sync.",
  },
  short: {
    tr: "Yerel-öncelikli kişisel yaşam OS'i. Beş yaşam alanı bir arada; senkron isteğe bağlıdır.",
    en: "Offline-first personal life OS. Five life domains in one place; sync is optional.",
  },
  brand: {
    primary: "#C3F400",
    secondary: "#E9B3FF",
    accent: "#FFB3B5",
    background: "#000000",
    foreground: "#FFFFFF",
    gradient: "linear-gradient(135deg, #C3F400 0%, #E9B3FF 60%, #FFB3B5 100%)",
    glow: "0 0 80px -10px rgba(195,244,0,0.45)",
    fontDisplay: "Manrope, Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "night-pulse",
  },
  visuals: {
    logo: "/projects/lifeos/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Beş alan, tek panel", en: "Five domains, one panel" },
      description: {
        tr: "Sağlık, finans, ilişkiler, kariyer, anlam. Her alan, kanıta dayalı bir ölçüm setiyle.",
        en: "Health, finance, relationships, career, meaning. Each with an evidence-based measurement set.",
      },
      icon: "LayoutDashboard",
    },
    {
      title: { tr: "Yerel-öncelikli", en: "Offline-first" },
      description: {
        tr: "Temel kayıtlar yerel çalışır; hesap ve bulut senkronu isteğe bağlıdır. Veri kapsamı sürüme göre değişebilir.",
        en: "Core records work locally; accounts and cloud sync are optional. Data coverage can vary by release.",
      },
      icon: "Lock",
    },
    {
      title: { tr: "AI koç (özel)", en: "AI coach (private)" },
      description: {
        tr: "Yerel modelle yapılan AI işlemleri cihazda çalışır. Kullanılabilirlik, cihaz desteğine ve modelin kurulmasına bağlıdır.",
        en: "AI tasks using the local model run on-device. Availability depends on device support and model installation.",
      },
      icon: "Cpu",
    },
    {
      title: { tr: "Yöntemler ve araçlar", en: "Methods and tools" },
      description: {
        tr: "PERMA, alışkanlık şablonları ve FIRE planlama araçları.",
        en: "PERMA, habit templates and FIRE planning tools.",
      },
      icon: "Microscope",
    },
    {
      title: { tr: "Anlamlı raporlar", en: "Meaningful reports" },
      description: {
        tr: "Skor değil — hikaye. Bu hafta nerede ilerlediniz, nerede yavaşladınız.",
        en: "Stories, not scores. Where you moved this week, where you slowed down.",
      },
      icon: "FileText",
    },
    {
      title: { tr: "Sıfır reklam", en: "Zero ads" },
      description: {
        tr: "Tek model: ödeme yapan kullanıcı. Sizi ürün haline getirmiyoruz.",
        en: "Single model: paying users. You're not the product.",
      },
      icon: "Sparkles",
    },
  ],
  stats: [
    { value: "5", label: { tr: "Hayat alanı", en: "Life domains" } },
    {
      value: "AES-256",
      label: { tr: "Cihaz üstü şifreleme", en: "On-device encryption" },
      claimId: "lifeos-on-device-encryption",
    },
    { value: "0", label: { tr: "Reklam", en: "Ads" } },
  ],
  vision: {
    tr: "Bir insanın hayatının kalitesini, kendi veri tercihlerini koruyarak, ölçebileceği ve geliştirebileceği bir özel OS.",
    en: "A private OS where a person can measure and improve life quality while controlling how their data is used.",
  },
  mission: {
    tr: "Veriyi sahibine geri vermek; gizliliği bir özellik değil, başlangıç koşulu yapmak; sade ve bilimsel araçlarla insana dürüst aynayı tutmak.",
    en: "Give data back to its owner; make privacy a starting condition, not a feature; hold up an honest, scientific mirror with calm tools.",
  },
  order: 3,
  // The CTA copy says "Open in the App Store"; this is what makes it true.
  primaryCtaKind: "appstore" as const,
  links: [
    // iOS live on the App Store (verified 2026-07-10). Android still in closed
    // testing → Play link stays hidden until the production track goes live.
    { kind: "appstore", href: "https://apps.apple.com/app/id6771527233" },
    // The legal microsite is not a dedicated product website; keep this
    // hidden until a LifeOS website has a verified live URL.
    { kind: "web", href: null },
    { kind: "playstore", href: null },
    { kind: "x", href: null },
    { kind: "instagram", href: null },
  ],
  contactEmail: "support@yulalab.com",
};
