import type { ProjectConfig } from "@/lib/types";

export const choreia: ProjectConfig = {
  slug: "choreia",
  name: "Choreia",
  monogram: "CH",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Global Dans Koçu",
    en: "Global Dance Coach",
  },
  tagline: {
    tr: "Adımını izlesin, hocan gibi seslensin.",
    en: "Let it watch your steps and talk like your teacher.",
  },
  description: {
    tr: "Choreia, telefon kamerasıyla tam vücut hareketini izleyen bir dans koçu. Adımlarını, zamanlamanı ve formunu analiz eder; dans hocan yanındaymış gibi sesli yönlendirmeler vererek dünyanın her yerinden dansları öğrenmeni sağlar.",
    en: "Choreia is a dance coach that watches your full-body movement through your phone's camera. It analyzes your steps, timing and form, and guides you with spoken cues — as if a real dance teacher were right there — so you can learn dances from anywhere in the world.",
  },
  short: {
    tr: "Kamera tam vücudunu izler; adım, zamanlama ve formunu analiz eder. Dans hocan yanındaymış gibi sesli yönlendirmeyle global dansları öğrenirsin.",
    en: "The camera watches your full body and analyzes your steps, timing and form. Learn dances from around the world with spoken guidance, as if your teacher were right there.",
  },
  brand: {
    primary: "#FF3DA6",
    secondary: "#7B5CFA",
    accent: "#4DE8FF",
    background: "#0A0710",
    foreground: "#F5EEF8",
    gradient: "linear-gradient(135deg, #FF3DA6 0%, #7B5CFA 55%, #4DE8FF 100%)",
    glow: "0 0 70px -10px rgba(255,61,166,0.4)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "stage-and-pulse",
  },
  visuals: {
    logo: "/projects/choreia/logo.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Tam vücut takip", en: "Full-body tracking" },
      description: {
        tr: "Kamera; ayak, kalça, omuz ve kol hareketlerini birlikte izler — koreografinin bütününü görür, tek bir adımı değil.",
        en: "The camera tracks feet, hips, shoulders and arms together — it sees the whole choreography, not a single step in isolation.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Adım, zamanlama, form", en: "Step, timing, form" },
      description: {
        tr: "Her hareketini referans koreografiyle karşılaştırır; zamanlaman ve formun ayrı ayrı değerlendirilir.",
        en: "Every move is compared against the reference choreography; your timing and form are scored separately.",
      },
      icon: "Microscope",
    },
    {
      title: { tr: "Hocan yanındaymış gibi", en: "Like your teacher is right there" },
      description: {
        tr: "Sesli yönlendirme, ekrana bakmana gerek kalmadan anlık düzeltme sağlar — antrenman arkadaşı değil, gerçek bir eğitmen hissi.",
        en: "Spoken guidance corrects you in real time without breaking your focus on the mirror — it feels like a real instructor, not a training partner.",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Global dans kütüphanesi", en: "A global dance library" },
      description: {
        tr: "Dünyanın farklı yerlerinden dansları aynı yöntemle öğrenirsin — tek bir tarz değil, geniş bir repertuvar.",
        en: "Learn dances from around the world with the same method — not a single style, but a wide repertoire.",
      },
      icon: "Globe",
    },
  ],
  stats: [
    { value: "···", label: { tr: "Lansman", en: "Launch" } },
    {
      value: "3",
      label: {
        tr: "İzlenen unsur · adım, zamanlama, form",
        en: "Tracked elements · steps, timing, form",
      },
    },
  ],
  vision: {
    tr: "Herkesin, dünyanın her yerinden bir dans hocasına kendi salonunda ulaşabildiği bir dünya.",
    en: "A world where everyone can reach a dance teacher from anywhere, right in their own living room.",
  },
  mission: {
    tr: "Global dansları, yanında gerçek bir eğitmen varmış hissiyle adım adım öğrenilebilir kılmak.",
    en: "Make global dances learnable step by step, with the feel of a real teacher standing right beside you.",
  },
  order: 8,
  links: [],
};
