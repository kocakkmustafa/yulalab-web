import type { ProjectConfig } from "@/lib/types";

export const burunfarki: ProjectConfig = {
  slug: "burunfarki",
  name: "Burun Farkı",
  monogram: "BF",
  kind: ["web", "mobile"],
  status: "live",
  category: {
    tr: "Şeffaf AI At Yarışı Analiz Platformu",
    en: "Transparent AI Horse Racing Analytics",
  },
  tagline: {
    tr: "Duyguyla değil, veriyle.",
    en: "Numbers over hunches.",
  },
  description: {
    tr: "Burun Farkı, Türkiye at yarışları için veri odaklı analiz ürünü. Canlı takip performansını burunfark.com/dogruluk kaynağıyla açıklar; modelin neden tahmin ettiğini gizlemez.",
    en: "Burun Farkı is a data-driven analytics product for Turkish horse racing. It documents live-tracking performance at burunfark.com/dogruluk and never hides why the model made a prediction.",
  },
  short: {
    tr: "Türkiye at yarışları için veri odaklı analiz ürünü. Tahminler yarıştan önce kayda geçer; sonuçlar geriye dönük düzeltilmez.",
    en: "A data-driven analytics product for Turkish horse racing. Predictions are recorded before each race, and results are never revised after the fact.",
  },
  brand: {
    primary: "#FAB81F",
    secondary: "#FCD25F",
    accent: "#D4AF37",
    background: "#080C16",
    foreground: "#EDE9E0",
    gradient: "linear-gradient(135deg, #FAB81F 0%, #FCD25F 50%, #8F6D24 100%)",
    glow: "0 0 60px -10px rgba(250,184,31,0.35)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "bloomberg-x-club",
  },
  visuals: {
    logo: "/projects/burunfarki/logo.png",
    icon: "/projects/burunfarki/icon.png",
    ogImage: "/projects/burunfarki/og.png",
    banner: "/projects/burunfarki/hero.jpg",
    screenshots: [
      // Atmosphere, not proof — a stock racing photo, not an app screen.
      // Never eligible for ProductShot until replaced with a real
      // decision-rationale dashboard capture (see FABLE_PLAN §8.4.4).
      {
        src: "/projects/burunfarki/hero.jpg",
        alt: "Türkiye'de bir yarış parkurunda dörtnala koşan atlar.",
        kind: "atmosphere",
      },
    ],
  },
  features: [
    {
      title: { tr: "Açık özellik seti", en: "Open feature set" },
      description: {
        tr: "Modelin gördüğü tüm özellikleri — pist, mesafe, jokey, antrenör — açıkça listeleriz.",
        en: "Every feature the model sees — track, distance, jockey, trainer — listed in plain view.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Karar gerekçesi", en: "Decision rationale" },
      description: {
        tr: "Her tahminin yanında, en etkili 3 faktör sıralı gösterilir — gizli kara kutu yok.",
        en: "Each prediction shows its top 3 factors in ranked order — no hidden black box.",
      },
      icon: "BadgeCheck",
    },
    {
      title: { tr: "Disiplin önerileri", en: "Discipline tools" },
      description: {
        tr: "Bahis değil — bütçe yönetimi, varyans, durma kuralları üzerine eğitsel araçlar.",
        en: "Not betting — educational tools for budget management, variance and stop-rules.",
      },
      icon: "ShieldAlert",
    },
    {
      title: { tr: "Açıklama önerileri", en: "Explainability" },
      description: {
        tr: "Hangi koşucu için neden — kural-tabanlı katkı sıralaması yarış-spesifik dilde anlatılır.",
        en: "Why this runner, why now — a rule-based contribution ranking translated into race-specific language.",
      },
      icon: "Microscope",
    },
  ],
  // Founder decision 2026-11-15 (2a): the Burun Farkı claim is withdrawn from the
  // site, so no accuracy figure is carried here. The registry keeps the claim
  // record only as withheld provenance.
  stats: [],
  vision: {
    tr: "At yarışını duygusal bir kumardan, denetlenebilir bir kantitatif disipline çeviren açık bir araç ekosistemi.",
    en: "An open ecosystem that turns horse racing from emotional gambling into an auditable quantitative discipline.",
  },
  mission: {
    tr: "Spor verisini hak ettiği şeffaflıkta sunmak; insanın sezgisinden vazgeçmeden, veriyi yanına bir analist olarak koymak.",
    en: "Present sports data with the transparency it deserves — without abandoning intuition, just placing data alongside it as an analyst.",
  },
  order: 2,
  links: [
    { kind: "web", href: "https://burunfark.com" },
    { kind: "x", href: "https://x.com/burunfarki" },
    { kind: "instagram", href: "https://instagram.com/burunfarki" },
    { kind: "youtube", href: "https://youtube.com/@burunfarki" },
  ],
  contactEmail: "support@yulalab.com",
};
