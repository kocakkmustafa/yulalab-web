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
    tr: "Hayatını tek bir sistemde topla.",
    en: "Run your life like a system.",
  },
  description: {
    tr: "LifeOS beş yaşam alanını (sağlık, finans, varlıklar, eğitim ve yaşam) çevrimdışı öncelikli tek bir uygulamada toplar. Kayıtlar cihazında kalır ve hesap gerekmez; bazı özellikler App Store aboneliği gerektirir.",
    en: "LifeOS brings five life areas (health, finance, assets, education and life) into one offline-first app. Records stay on your device and no account is needed; some features need an App Store subscription.",
  },
  short: {
    tr: "Çevrimdışı öncelikli kişisel yaşam uygulaması. Beş yaşam alanı bir arada; hesap gerekmez.",
    en: "Offline-first personal life app. Five life areas in one place; no account needed.",
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
    icon: "/projects/lifeos/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Beş alan, tek panel", en: "Five domains, one panel" },
      description: {
        tr: "Sağlık, finans, varlıklar, eğitim ve yaşam.",
        en: "Health, finance, assets, education and life.",
      },
      icon: "LayoutDashboard",
    },
    {
      title: { tr: "Yerel-öncelikli", en: "Offline-first" },
      description: {
        tr: "Temel kayıtlar yerel çalışır; hesap gerekmez ve bu sürümde bulut senkronu sunulmaz.",
        en: "Core records work locally; no account is needed and cloud sync is not offered in this version.",
      },
      icon: "Lock",
    },
    {
      title: { tr: "Sağlık verisi, yalnız okuma", en: "Health data, read-only" },
      description: {
        tr: "İzin verirsen adım, kalp atışı, uyku, egzersiz, kilo ve kan oksijeni Apple Health veya Health Connect'ten okunur ve cihazda işlenir; sunucuya gönderilmez.",
        en: "With your permission, steps, heart rate, sleep, workouts, weight and blood oxygen are read from Apple Health or Health Connect and processed on the device; they are not sent to a server.",
      },
      icon: "ShieldCheck",
    },
    {
      title: { tr: "Sıfır reklam", en: "Zero ads" },
      description: {
        tr: "Reklam ve reklam takibi yok.",
        en: "No ads and no ad tracking.",
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
