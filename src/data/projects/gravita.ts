import type { ProjectConfig } from "@/lib/types";

export const gravita: ProjectConfig = {
  slug: "gravita",
  name: "Gravita",
  monogram: "G",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Handstand & Vücut Becerileri Koçu",
    en: "Handstand & Bodyweight Skills Coach",
  },
  tagline: {
    tr: "Telefonun, en önemli hatanı görsün.",
    en: "Let your phone catch your biggest flaw.",
  },
  description: {
    tr: "Gravita, telefon kamerasıyla handstand ve vücut becerisi denemelerini analiz eden bir hareket koçu. Her denemede seni en çok geride tutan tek hatayı söyler ve ölçülebilir bir ilerleme planıyla bir sonraki seviyeye taşır.",
    en: "Gravita is a movement coach that analyzes your handstand and bodyweight-skill attempts through your phone's camera. Each try, it names the single flaw holding you back most and moves you forward with a measurable progression plan.",
  },
  short: {
    tr: "Kamera kayıtlarını cihazda analiz eden bir handstand & vücut becerisi koçu. En önemli hatanı söyler, ölçülebilir ilerlemeyle seni bir sonraki seviyeye taşır.",
    en: "An on-device handstand and bodyweight-skills coach. Names your single biggest flaw and moves you forward with measurable progression.",
  },
  brand: {
    primary: "#FF6A45",
    secondary: "#FFB199",
    accent: "#FFD166",
    background: "#0B0805",
    foreground: "#F5EFE8",
    gradient: "linear-gradient(135deg, #FF6A45 0%, #FFB199 55%, #FFD166 100%)",
    glow: "0 0 70px -10px rgba(255,106,69,0.4)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "forge-and-form",
  },
  visuals: {
    logo: "/projects/gravita/logo.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Tek en önemli hata", en: "Your single biggest flaw" },
      description: {
        tr: "Kamera her denemeni izler ve seni en çok geride tutan tek hatayı söyler — on tane değil, bir tane.",
        en: "The camera watches every attempt and names the one flaw holding you back most — not ten, just one.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Ölçülebilir ilerleme", en: "Measurable progression" },
      description: {
        tr: "Her deneme bir öncekiyle karşılaştırılır; ilerleme hissiyat değil, ölçümdür.",
        en: "Every attempt is compared against the last; progress is a measurement, not a feeling.",
      },
      icon: "TrendingUp",
    },
    {
      title: { tr: "Cihazda işlenir", en: "Processed on-device" },
      description: {
        tr: "Kamera analizi telefonunda çalışır. Ham video cihazından çıkmaz.",
        en: "Camera analysis runs on your phone. Raw video never leaves the device.",
      },
      icon: "Lock",
    },
    {
      title: { tr: "Bilimsel hareket kırılımı", en: "Evidence-based movement breakdown" },
      description: {
        tr: "Denge, hizalama ve omuz açısı gibi ölçülebilir kriterlerle değerlendirir — tahmin değil.",
        en: "Evaluated on measurable criteria — balance, alignment, shoulder angle — not guesswork.",
      },
      icon: "Microscope",
    },
  ],
  stats: [
    { value: "···", label: { tr: "Lansman", en: "Launch" } },
    {
      value: "0",
      label: { tr: "Cihaz dışına çıkan ham video", en: "Raw video leaving the device" },
    },
  ],
  vision: {
    tr: "Herkesin, kişisel bir hareket koçuna cebinden ulaşabildiği bir dünya.",
    en: "A world where everyone carries a personal movement coach in their pocket.",
  },
  mission: {
    tr: "Vücut becerisi öğrenimini tahminden çıkarıp, kameranın gördüğü tek bir dürüst geri bildirime indirgemek.",
    en: "Take the guesswork out of learning bodyweight skills and reduce it to one honest, camera-verified piece of feedback.",
  },
  order: 4,
  links: [],
};
