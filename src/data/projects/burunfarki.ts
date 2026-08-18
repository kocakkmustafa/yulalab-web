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
    tr: "Burun Farkı, Türkiye at yarışlarının ilk açık ve şeffaf veri-odaklı analiz platformu. 130 binden fazla koşucu, 13 binden fazla yarış — modelin neden tahmin ettiğini gizlemiyor.",
    en: "Burun Farkı is the first open, transparent, data-driven analytics platform for Turkish horse racing. 130k+ runners, 13k+ races — and the model never hides why it predicted what it did.",
  },
  short: {
    tr: "Türkiye at yarışları için açık, şeffaf veri-odaklı analiz. Top-3 doğruluğu ~%61, canlı yayın-sonrası dürüst takip (burunfark.com/model-performance, 2026-07-23). Eğitim-zamanı backtest ayrıca ~%69 Top-3 ölçmüştü.",
    en: "Open, transparent, data-driven analytics for Turkish horse racing. ~61% Top-3 accuracy, honest live post-deployment tracking (burunfark.com/model-performance, 2026-07-23). A separate training-time backtest measured ~69% Top-3.",
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
      // Real captures of the live /dogruluk page (harvested 2026-07-11 via
      // a headless-browser screenshot service, bypassing the need for
      // burunfark-web's CSP change — its Vercel production deploy wasn't
      // picking up that change, so the iframe path (ProjectAsset kind:
      // "live", still supported by ProductShot/types.ts) is on hold until
      // that's sorted. This is the decision-rationale evidence FABLE_PLAN
      // §8.4.4 asked for instead of the stock photo above.
      {
        src: "/projects/burunfarki/screenshot-honest-stats.png",
        alt: "Burun Farkı'nın dürüst performans çerçevesi: Top-1/Top-3 isabet oranları, son 7/30/90 gün.",
        kind: "product",
      },
      {
        src: "/projects/burunfarki/screenshot-daily-history.png",
        alt: "Burun Farkı günlük AI tahmin geçmişi: her günün Top-1/Top-3 isabet detayı.",
        kind: "product",
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
      title: { tr: "Tarihsel arşiv", en: "Historical archive" },
      description: {
        tr: "13.587 koşuda, 130.930 koşucuda — modelin geçmişte nerede yanıldığını da görürsün.",
        en: "13,587 races, 130,930 runners — including where the model has been wrong.",
      },
      icon: "Database",
    },
    {
      title: { tr: "Canlı takip paneli", en: "Live tracking panel" },
      description: {
        tr: "Son 12 ayın gerçek sonuçları üzerinde, modelin getirisini gün gün izle.",
        en: "Track the model's day-by-day performance against the past 12 months of real results.",
      },
      icon: "TrendingUp",
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
  // Honest live (post-deployment) walk-forward accuracy, not training-time
  // backtest. Source: burunfark.com/model-performance, verified 2026-08-19
  // (BF DEFTER B-021 / FABLE_PLAN.md:171). Training-time backtest separately
  // measured ~69% Top-3 — see the `short` field above for that distinction.
  // TODO(Y-P0-003): move source/verifiedAt/expiresAt into the public
  // registry schema once it exists; this comment is a stopgap until then.
  stats: [
    { value: "~%30", label: { tr: "Top-1 (canlı takip)", en: "Top-1 (live tracking)" } },
    { value: "~%61", label: { tr: "Top-3 (canlı takip)", en: "Top-3 (live tracking)" } },
    { value: "13.587", label: { tr: "yarış", en: "races" } },
    { value: "130.930", label: { tr: "koşucu", en: "runners" } },
  ],
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
  contactEmail: "press@burunfark.com",
};
