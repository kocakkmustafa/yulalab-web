import type { ProjectConfig } from "@/lib/types";

export const lifeos: ProjectConfig = {
  slug: "lifeos",
  name: "LifeOS",
  monogram: "L",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Kişisel Yaşam İşletim Sistemi",
    en: "Personal Life Operating System",
  },
  tagline: {
    tr: "Hayatını yönet, AI ile geliş.",
    en: "Run your life like a system.",
  },
  description: {
    tr: "LifeOS, hayatın 5 alanını (sağlık, finans, ilişkiler, kariyer, anlam) tek bir yerel-öncelikli OS'te yöneten, AES-256 cihaz-üstü şifrelemeli bir kişisel yaşam aracı.",
    en: "LifeOS unifies five life domains (health, finance, relationships, career, meaning) in a single offline-first OS with AES-256 on-device encryption.",
  },
  short: {
    tr: "Yerel-öncelikli, AES-256 ile cihaz üstünde şifrelenen kişisel yaşam OS'i. 5 alan, 9+ algoritma.",
    en: "Offline-first, AES-256 on-device encrypted personal life OS. 5 domains, 9+ validated algorithms.",
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
        tr: "Sağlık, finans, ilişkiler, kariyer, anlam. Her alan, kanıta dayalı bir ölçüm setiyle.",
        en: "Health, finance, relationships, career, meaning. Each with an evidence-based measurement set.",
      },
      icon: "LayoutDashboard",
    },
    {
      title: { tr: "Yerel-öncelikli", en: "Offline-first" },
      description: {
        tr: "Veriniz cihazınızda kalır. AES-256 ile şifrelenir, senkron isteğe bağlıdır.",
        en: "Your data stays on-device. AES-256 encrypted, sync is opt-in.",
      },
      icon: "Lock",
    },
    {
      title: { tr: "AI koç (özel)", en: "AI coach (private)" },
      description: {
        tr: "Modeller cihaz üzerinde çalışır. Hassas veri sunucularımıza asla gönderilmez.",
        en: "Models run on-device. Sensitive data never leaves your phone.",
      },
      icon: "Cpu",
    },
    {
      title: { tr: "Bilimsel algoritmalar", en: "Scientific algorithms" },
      description: {
        tr: "CBT, IFS, atomik alışkanlıklar, İkigai, FIRE — 9+ doğrulanmış çerçeve.",
        en: "CBT, IFS, atomic habits, Ikigai, FIRE — 9+ validated frameworks.",
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
    { value: "9+", label: { tr: "Bilimsel algoritma", en: "Scientific algorithms" } },
    { value: "AES-256", label: { tr: "Cihaz üstü şifreleme", en: "On-device encryption" } },
    { value: "0", label: { tr: "Reklam", en: "Ads" } },
  ],
  vision: {
    tr: "Bir insanın hayatının kalitesini, cihazının dışına bilgi sızdırmadan, ölçebileceği ve geliştirebileceği bir özel OS.",
    en: "A private OS where a person can measure and improve life quality without leaking a single byte off-device.",
  },
  mission: {
    tr: "Veriyi sahibine geri vermek; gizliliği bir özellik değil, başlangıç koşulu yapmak; sade ve bilimsel araçlarla insana dürüst aynayı tutmak.",
    en: "Give data back to its owner; make privacy a starting condition, not a feature; hold up an honest, scientific mirror with calm tools.",
  },
  order: 3,
  links: [
    { kind: "web", href: "https://kocakkmustafa.github.io/lifeos-policies/" },
    { kind: "appstore", href: "#" },
    { kind: "playstore", href: "#" },
    { kind: "x", href: "#" },
    { kind: "instagram", href: "#" },
  ],
  contactEmail: "kocakmkaan@gmail.com",
};
