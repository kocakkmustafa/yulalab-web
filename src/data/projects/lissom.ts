import type { ProjectConfig } from "@/lib/types";

export const lissom: ProjectConfig = {
  slug: "lissom",
  name: "Lissom",
  monogram: "LS",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Esneklik & Mobilite Koçu",
    en: "Flexibility & Mobility Coach",
  },
  tagline: {
    tr: "Birkaç dakikada ölç, her gün biraz aç.",
    en: "Measure in minutes, open up a little every day.",
  },
  description: {
    tr: "Lissom, birkaç dakikalık bir kamera testiyle hareket kapasiteni ölçen bir esneklik ve mobilite koçu. Ölçüme göre günlük, kısa bir yoga/mobilite programı çıkarır ve dört haftada bir seni yeniden ölçerek ilerlemeni gösterir.",
    en: "Lissom is a flexibility and mobility coach that measures your movement capacity through a few-minute camera test. It builds a short daily yoga/mobility routine from that measurement and re-tests you every four weeks to show progress.",
  },
  short: {
    tr: "Birkaç dakikalık kamera testiyle mobilite ölçer, günlük kısa program çıkarır, 4 haftada yeniden ölçer.",
    en: "Measures mobility with a few-minute camera test, builds a short daily routine, re-measures every 4 weeks.",
  },
  brand: {
    primary: "#6EE7C8",
    secondary: "#B9A6FF",
    accent: "#FFD1E8",
    background: "#070A0C",
    foreground: "#EDF3F1",
    gradient: "linear-gradient(135deg, #6EE7C8 0%, #B9A6FF 55%, #FFD1E8 100%)",
    glow: "0 0 70px -10px rgba(110,231,200,0.4)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "silk-and-breath",
  },
  visuals: {
    logo: "/projects/lissom/logo.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Hızlı kapasite testi", en: "A quick capacity test" },
      description: {
        tr: "Birkaç dakikalık bir kamera testiyle mevcut hareket kapasiteni ölçer — kayıt olmadan başlar.",
        en: "A few-minute camera test measures your current range of motion — no sign-up needed to start.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Günlük kısa program", en: "A short daily routine" },
      description: {
        tr: "Ölçümüne göre kısa, günlük bir yoga/mobilite programı önerir — saatlerce değil, dakikalarca.",
        en: "Suggests a short daily yoga/mobility routine based on your measurement — minutes, not hours.",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "4 haftalık döngü", en: "A 4-week cycle" },
      description: {
        tr: "Dört haftada bir yeniden ölçer; ilerleme bir sonraki testte sayılarla görünür.",
        en: "Re-measures every four weeks; progress shows up as numbers in the next test.",
      },
      icon: "TrendingUp",
    },
    {
      title: { tr: "Kanıta dayalı hareketler", en: "Evidence-based movement" },
      description: {
        tr: "Program, doğrulanmış mobilite ve esneklik pratiklerinden derlenir — trend değil, yöntem.",
        en: "The routine is drawn from validated mobility and flexibility practice — method, not trend.",
      },
      icon: "Microscope",
    },
  ],
  stats: [
    { value: "···", label: { tr: "Lansman", en: "Launch" } },
    {
      value: "4",
      label: { tr: "Haftada bir yeniden ölçüm", en: "Weeks between re-measurements" },
    },
  ],
  vision: {
    tr: "Esnekliği bir yetenek değil, ölçülüp geliştirilebilen bir alışkanlık haline getirmek.",
    en: "Turn flexibility from a talent into a habit you can measure and build.",
  },
  mission: {
    tr: "Günde birkaç dakikayla, kanıta dayalı hareketlerle bedeninin hareket kapasitesini genişletmek.",
    en: "Expand your body's range of motion a few minutes a day, with evidence-based movement.",
  },
  order: 5,
  links: [],
};
