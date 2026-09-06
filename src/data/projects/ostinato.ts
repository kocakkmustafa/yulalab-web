import type { ProjectConfig } from "@/lib/types";

export const ostinato: ProjectConfig = {
  slug: "ostinato",
  name: "Ostinato",
  monogram: "O",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Enstrüman Pratik Koçu",
    en: "Instrument & Music Practice Coach",
  },
  tagline: {
    tr: "Öğretmensiz pratiği ölçülebilir kılmak için.",
    en: "Towards measurable practice without a teacher.",
  },
  description: {
    tr: "Kamera ve ses analizini birleştiren bir enstrüman pratik koçu geliştiriyoruz. Hedefimiz, öğretmensiz geçen pratik saatlerini ölçülebilir kılmak; ilk odak çello.",
    en: "We are developing an instrument-practice coach that combines camera and audio analysis. Our goal is measurable practice between lessons, starting with cello.",
  },
  short: {
    tr: "Kamera ve ses analizini birleştirecek bir pratik koçu geliştiriyoruz. İlk odak: çello.",
    en: "An instrument-practice coach in development, combining camera and audio analysis. First focus: cello.",
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
        tr: "Hedef: kamerayla oturuş ve enstrüman tutuşunu izleyerek postür çalışmasını desteklemek.",
        en: "Goal: support posture practice by observing seating and instrument hold through the camera.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Temel teknik kontrolü", en: "Fundamental technique checks" },
      description: {
        tr: "Hedef: yay tutuşu ve el pozisyonu gibi teknik unsurları görüntü ve sesle birlikte değerlendirmek.",
        en: "Goal: evaluate fundamentals such as bow hold and hand position using video and audio together.",
      },
      icon: "Microscope",
    },
    {
      title: { tr: "Ölçülebilir pratik saatleri", en: "Measurable practice hours" },
      description: {
        tr: "Hedef: dersler arasındaki pratik süresini ve zaman içindeki ilerlemeyi görünür kılmak.",
        en: "Goal: make practice time between lessons and progress over time visible.",
      },
      icon: "TrendingUp",
    },
    {
      title: { tr: "Kamera + mikrofon", en: "Camera + microphone" },
      description: {
        tr: "Görüntü ve sesin birlikte değerlendirilmesi üzerinde çalışıyoruz; kullanılabilir yetenekler ilk sürümle açıklanacak.",
        en: "We are working on combined video and audio assessment; available capabilities will be documented with the first release.",
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
