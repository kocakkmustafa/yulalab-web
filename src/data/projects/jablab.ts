import type { ProjectConfig } from "@/lib/types";

export const jablab: ProjectConfig = {
  slug: "jablab",
  name: "JabLab",
  monogram: "JL",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Solo Boks Koçu",
    en: "Solo Boxing Coach",
  },
  tagline: {
    tr: "Gölgeyle çalış, gerçeğini duy.",
    en: "Train the shadow, hear what's real.",
  },
  description: {
    tr: "JabLab, shadow boxing çalışmanı tam vücut kamerayla izleyen bir solo boks koçu. Gardın, duruşun, kombinasyon sıran ve dengen hakkında açıklanabilir, sesli geri bildirim verir — antrenman arkadaşı olmadan da nereni geliştireceğini bilirsin.",
    en: "JabLab is a solo boxing coach that watches your shadow-boxing with full-body camera tracking. It gives explainable, spoken feedback on your guard, stance, combination sequencing and balance — so you know what to fix even without a training partner.",
  },
  short: {
    tr: "Shadow boxing'ini tam vücut izler; gard, duruş, kombinasyon ve denge hakkında açıklanabilir sesli geri bildirim verir.",
    en: "Watches your shadow boxing full-body; gives explainable spoken feedback on guard, stance, combinations and balance.",
  },
  brand: {
    primary: "#FF3B3B",
    secondary: "#FF8A3B",
    accent: "#E8E8EC",
    background: "#0A0A0B",
    foreground: "#F2F0EE",
    gradient: "linear-gradient(135deg, #FF3B3B 0%, #FF8A3B 55%, #E8E8EC 100%)",
    glow: "0 0 70px -10px rgba(255,59,59,0.4)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "canvas-and-grit",
  },
  visuals: {
    logo: "/projects/jablab/logo.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Tam vücut takip", en: "Full-body tracking" },
      description: {
        tr: "Kamera; ayak, kalça, omuz ve el pozisyonunu birlikte izler — tek bir eklemi değil.",
        en: "The camera tracks feet, hips, shoulders and hands together — not a single joint in isolation.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Açıklanabilir geri bildirim", en: "Explainable feedback" },
      description: {
        tr: "Neyin yanlış olduğunu değil, neden yanlış olduğunu söyler — kara kutu geri bildirim yok.",
        en: "Tells you not just what's off, but why — no black-box feedback.",
      },
      icon: "BadgeCheck",
    },
    {
      title: { tr: "Sesli, anlık uyarı", en: "Spoken, real-time cues" },
      description: {
        tr: "Ekrana bakmadan, antrenman sırasında sesli uyarı alırsın.",
        en: "Get spoken cues mid-drill, without breaking eye contact with your imaginary opponent.",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Denge & kombinasyon analizi", en: "Balance & combination analysis" },
      description: {
        tr: "Kombinasyon sıranı ve denge kaybını işaretler; tekrar eden hatalar zamanla görünür olur.",
        en: "Flags your combination sequencing and balance loss; repeated mistakes surface over time.",
      },
      icon: "Microscope",
    },
  ],
  stats: [
    { value: "···", label: { tr: "Lansman", en: "Launch" } },
    {
      value: "4",
      label: {
        tr: "İzlenen unsur · gard, duruş, kombinasyon, denge",
        en: "Tracked elements · guard, stance, combos, balance",
      },
    },
  ],
  vision: {
    tr: "Antrenman arkadaşı olmadan da doğru geri bildirim alabildiğin bir solo boks pratiği.",
    en: "Solo boxing practice that gives you real feedback, even without a training partner.",
  },
  mission: {
    tr: "Gölge boksun görünmeyen hatalarını görünür ve açıklanabilir kılmak.",
    en: "Make the invisible mistakes of shadow boxing visible and explainable.",
  },
  order: 6,
  links: [],
};
