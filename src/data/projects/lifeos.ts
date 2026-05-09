import type { ProjectConfig } from "@/lib/types";

export const lifeos: ProjectConfig = {
  slug: "lifeos",
  name: "LifeOS",
  kind: ["mobile"],
  status: "pre-launch",
  category: {
    tr: "Kişisel Yaşam İşletim Sistemi",
    en: "Personal Life Operating System",
  },
  tagline: {
    tr: "Hayatını yönet, AI ile geliş.",
    en: "Run your life like a system.",
  },
  description: {
    tr: "Sağlık, finans, eğitim, yaşam ve araç — tüm hayatınızı tek bir çevrim dışı uygulamada birleştirir. Verileriniz cihazınızda AES-256 ile şifrelenir; yapay zeka rehberiniz size günde 5 dakikada anlamlı içgörüler sunar.",
    en: "LifeOS unifies five life domains — health, finance, education, life and vehicle — into one privacy-first mobile app. AES-256 on-device encryption; a Gemini-powered companion delivers a 5-minute daily debrief with cross-domain insights.",
  },
  pitch: {
    tr: "HRV, FSRS, Monte Carlo, PERMA, SWLS gibi kanıta dayalı algoritmalarla beslenen LifeOS, beş hayat alanını ortak bir grafikte birleştirir. AI yoldaşınız Z-Raporu ile günü 5 dakikada özetler, alanlar arası bağlantıları (uyku → stres → harcama) Türkçe hikaye olarak anlatır.",
    en: "Powered by validated algorithms (HRV norms, FSRS, Monte Carlo, PERMA, SWLS), LifeOS unifies five life domains in one chart. Its companion produces a 5-minute daily debrief and connects cross-domain dots (sleep → stress → spending) as a readable story.",
  },
  brand: {
    primary: "#C3F400",
    secondary: "#E9B3FF",
    accent: "#FFB3B5",
    background: "#000000",
    foreground: "#FFFFFF",
    gradient:
      "linear-gradient(135deg, #C3F400 0%, #E9B3FF 60%, #FFB3B5 100%)",
    fontDisplay: "Manrope",
    fontBody: "Inter",
    mood: "Night Pulse — siyah, neon lime + electric violet, glassmorphism, animated rings.",
  },
  visuals: {
    logo: "/projects/lifeos/icon.png",
    icon: "/projects/lifeos/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: "5 hayat alanı, tek panel",
      description: "Sağlık, finans, eğitim, yaşam ve araç tek dashboardda; her modülün kendi rengi var.",
      icon: "LayoutDashboard",
    },
    {
      title: "AI yoldaş + Z-Raporu",
      description: "Sesli ya da yazılı 5 dakikalık günlük özet; AI veriyi doğru modüle otomatik yönlendirir.",
      icon: "Mic",
    },
    {
      title: "Energy Score",
      description: "Uyku · aktivite · stres · iyileşme · beslenme bileşik 0-100 puanı.",
      icon: "Activity",
    },
    {
      title: "Bilimsel temel",
      description: "HRV, VO2max, FSRS spaced repetition, PSQI, SWLS, PERMA — kanıta dayalı algoritmalar.",
      icon: "Microscope",
    },
    {
      title: "Cross-Domain Insights",
      description: "Pearson korelasyon zincirleri (uyku → stres → harcama) Türkçe anlatımla.",
      icon: "GitBranch",
    },
    {
      title: "Gizlilik öncelikli",
      description: "Hive AES-256 + Drift SQLCipher, opt-in Supabase senkron, reklam yok, takip yok.",
      icon: "Lock",
    },
  ],
  stats: [
    { label: "Hayat alanı", value: "5", description: "Sağlık · Finans · Eğitim · Yaşam · Araç" },
    { label: "Bilimsel algoritma", value: "9+", description: "HRV · FSRS · Monte Carlo · PERMA …" },
    { label: "Şifreleme", value: "AES-256", description: "Cihaz üstü" },
    { label: "Reklam", value: "0", description: "Hiç olmayacak" },
  ],
  vision: {
    tr: "Hayatını anlayan, planlayan ve kullanıcısının yanında büyüyen sade bir kişisel işletim sistemi.",
    en: "A calm personal OS that understands, plans, and grows alongside the user.",
  },
  mission: {
    tr: "Bilimsel doğrulanmış yöntemleri kullanıcının cebine taşımak; AI'yı abartmadan, gizliliği bozmadan, gerçek bir hayat yardımı sunmak.",
    en: "Bring scientifically validated methods to the user's pocket — calm AI, real privacy, real life help.",
  },
  order: 3,
  links: {
    website: "https://kocakkmustafa.github.io/lifeos-policies/",
    documentation: "https://kocakkmustafa.github.io/lifeos-policies/support.html",
  },
  socials: {},
  contactEmail: "kocakmkaan@gmail.com",
};
