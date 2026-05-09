import type { ProjectConfig } from "@/lib/types";

export const burunfarki: ProjectConfig = {
  slug: "burunfarki",
  name: "Burun Farkı",
  kind: ["web", "mobile"],
  status: "pre-launch",
  category: {
    tr: "Şeffaf AI At Yarışı Analiz Platformu",
    en: "Transparent AI Horse Racing Analytics",
  },
  tagline: {
    tr: "Duyguyla değil, veriyle.",
    en: "Numbers over hunches.",
  },
  description: {
    tr: "Türkiye Jokey Kulübü'nün 2 yıllık resmi verisini 12 parametreli yapay zeka modeliyle analiz eder, doğruluk oranını şeffaf yayınlar. Bahis sitesi değildir; sistemli yaklaşım için analiz platformudur.",
    en: "Burun Farkı turns 2 years of official Turkish Jockey Club data into calibrated win-probabilities with a 12-parameter ensemble model. It is an analytics platform, not a sportsbook.",
  },
  pitch: {
    tr: "13.587 yarış ve 130.930 koşucudan eğitilen ensemble modelimiz, her tahmininin arkasındaki ağırlıkları (piyasa, form, jokey sinerjisi, hız, mesafe uyumu, yük, dinlenme…) açıkça gösterir. 611 yarışlık testte %40,8 Top-1 ve %72,2 Top-3 doğruluk.",
    en: "Our ensemble — trained on 13,587 races and 130,930 runners — exposes the feature weights behind every prediction (market, form, jockey synergy, speed, surface fit, weight, rest…). 40.8% Top-1 and 72.2% Top-3 on 611 out-of-sample races.",
  },
  brand: {
    primary: "#FAB81F",
    secondary: "#FCD25F",
    accent: "#D4AF37",
    background: "#080C16",
    foreground: "#EDE9E0",
    gradient:
      "linear-gradient(135deg, #FAB81F 0%, #FCD25F 50%, #8F6D24 100%)",
    fontDisplay: "Inter",
    fontBody: "Inter",
    fontMono: "JetBrains Mono",
    mood: "Bloomberg Terminal × premium yarış kulübü — siyah üzerine altın, soft gold glow.",
  },
  visuals: {
    logo: "/projects/burunfarki/logo.png",
    icon: "/projects/burunfarki/icon.png",
    ogImage: "/projects/burunfarki/og.png",
    banner: "/projects/burunfarki/hero.jpg",
    screenshots: [
      {
        src: "/projects/burunfarki/hero.jpg",
        alt: "Türkiye'de bir yarış parkurunda dörtnala koşan atlar.",
      },
    ],
  },
  features: [
    {
      title: "Şeffaf metodoloji",
      description:
        "Her tahmin, kendi feature ağırlıklarını gösterir. Kara kutu yok; her satır izlenebilir.",
      icon: "Eye",
    },
    {
      title: "12 parametreli ensemble",
      description:
        "Piyasa oranları, form, jokey sinerjisi, hız, yüzey/mesafe uyumu, yük, dinlenme, sınıf, antrenör, momentum…",
      icon: "Cpu",
    },
    {
      title: "Doğrulanmış performans",
      description:
        "611 yarış out-of-sample test: Top-1 %40,8 · Top-3 %72,2 · Brier 0,098.",
      icon: "BadgeCheck",
    },
    {
      title: "Value Betting & Kelly",
      description:
        "Modelin tahmini AGF oranlarına göre pozitif beklenen değerli koşuları öne çıkarır.",
      icon: "TrendingUp",
    },
    {
      title: "Web + iOS + Android",
      description:
        "React + Vite web platformu ve Flutter mobil uygulama, ortak Supabase backend ile senkron.",
      icon: "Smartphone",
    },
    {
      title: "Sorumlu kullanım",
      description:
        "18+ kapısı, KVKK uyumu, Yeşilay 182 yardım hattı her sayfada görünür. Bahis değil, analiz.",
      icon: "ShieldAlert",
    },
  ],
  stats: [
    { label: "Top-1 doğruluk", value: "%40,8", description: "611 yarış testi" },
    { label: "Top-3 doğruluk", value: "%72,2" },
    { label: "Eğitim verisi", value: "13.587", description: "yarış · 2 yıl resmi TJK verisi" },
    { label: "Koşucu", value: "130.930" },
  ],
  vision: {
    tr: "Türk at yarışı topluluğunda 'tahmin' yerine 'analiz' kültürünü kurmak.",
    en: "Replace tipster culture with transparent analytics in Turkish horse racing.",
  },
  mission: {
    tr: "Şeffaf metodoloji, doğrulanmış performans ve sorumlu kullanım çerçevesinde, herkesin anlayabileceği bir analiz platformu sunmak.",
    en: "Deliver an analytics platform that combines transparent methodology, verified performance and responsible use.",
  },
  order: 2,
  links: {
    website: "https://burunfark.com",
    pressKit: "https://burunfark.com/press-kit",
  },
  socials: {
    twitter: "https://x.com/burunfarki",
  },
  contactEmail: "press@burunfark.com",
};
