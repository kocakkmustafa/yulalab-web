import type { ProjectConfig } from "@/lib/types";

export const ostinato: ProjectConfig = {
  slug: "ostinato",
  name: "Ostinato",
  monogram: "O",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Enstrüman Pratik Koçu",
    en: "Instrument Practice Coach",
  },
  tagline: {
    tr: "Öğretmensiz pratik, artık ölçülebilir.",
    en: "Practice without a teacher, now measurable.",
  },
  description: {
    tr: "Ostinato, kamera ve mikrofonla postürünü ve temel tekniğini analiz eden bir enstrüman pratik koçu. Öğretmensiz geçen pratik saatlerini ölçülebilir kılar — ilk enstrümanı çello.",
    en: "Ostinato is an instrument-practice coach that analyzes your posture and fundamental technique through camera and microphone. It makes your unsupervised practice hours measurable — starting with cello.",
  },
  short: {
    tr: "Kamera + mikrofonla postür ve temel tekniği analiz eder; öğretmensiz pratiği ölçülebilir kılar. İlk enstrüman: çello.",
    en: "Analyzes posture and fundamental technique via camera + mic; makes unsupervised practice measurable. First instrument: cello.",
  },
  brand: {
    primary: "#D8A657",
    secondary: "#8B5E3C",
    accent: "#E8C87A",
    background: "#0C0906",
    foreground: "#F1E9DC",
    gradient: "linear-gradient(135deg, #D8A657 0%, #E8C87A 55%, #8B5E3C 100%)",
    glow: "0 0 70px -10px rgba(216,166,87,0.4)",
    fontDisplay: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    mood: "wood-and-resonance",
  },
  visuals: {
    logo: "/projects/ostinato/logo.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Postür analizi", en: "Posture analysis" },
      description: {
        tr: "Kamera oturuşunu ve enstrüman tutuşunu izler; zamanla yerleşen kötü alışkanlıkları erken yakalar.",
        en: "The camera watches your seating and hold; it catches bad habits early, before they settle in.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Temel teknik kontrolü", en: "Fundamental technique checks" },
      description: {
        tr: "Yay tutuşu, el pozisyonu gibi temel teknik unsurları kamera ve mikrofonla birlikte değerlendirir.",
        en: "Evaluates fundamentals like bow hold and hand position using camera and microphone together.",
      },
      icon: "Microscope",
    },
    {
      title: { tr: "Ölçülebilir pratik saatleri", en: "Measurable practice hours" },
      description: {
        tr: "Öğretmensiz geçen her pratik saatini kayda geçirir; ilerleme zamanla sayılarla görünür.",
        en: "Logs every unsupervised practice hour; progress becomes visible as numbers over time.",
      },
      icon: "TrendingUp",
    },
    {
      title: { tr: "Kamera + mikrofon", en: "Camera + microphone" },
      description: {
        tr: "Görüntü ve sesi birlikte okur — sadece duruşu değil, çıkan sesi de değerlendirmenin parçası yapar.",
        en: "Reads video and audio together — what you sound like is part of the evaluation too, not just how you sit.",
      },
      icon: "Cpu",
    },
  ],
  stats: [
    { value: "···", label: { tr: "Lansman", en: "Launch" } },
    { value: "Cello", label: { tr: "İlk enstrüman", en: "First instrument" } },
  ],
  vision: {
    tr: "Enstrüman pratiğinin, öğretmen olmadan geçen saatlerini de değerli kılmak.",
    en: "Make the hours you practice without a teacher count too.",
  },
  mission: {
    tr: "Postür ve temel teknik hatalarını erken yakalayıp, pratiği bilinçli bir alışkanlığa çevirmek.",
    en: "Catch posture and fundamental-technique mistakes early, turning practice into a deliberate habit.",
  },
  order: 7,
  links: [],
};
