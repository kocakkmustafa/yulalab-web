import type { ProjectConfig } from "@/lib/types";

export const gravita: ProjectConfig = {
  slug: "gravita",
  name: "Gravita",
  monogram: "G",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Kalistenik ve Kuvvet Pratiği",
    en: "Calisthenics & Strength Practice",
  },
  tagline: {
    tr: "Vücut ağırlığı pratiğini adım adım kur.",
    en: "Build your bodyweight practice step by step.",
  },
  description: {
    tr: "Gravita, kuvvet ve beceri temelleri için yedi yazılı kurs sunar: 56 derslik kalistenik kursu, dambıl ve kettlebell yolları, halter, alçak halka ve el desteği temelleri. 117 dersin 44'ü ücretsizdir; kalan dersler, program oluşturma ve yeni seans kaydı Gravita üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Canlı kamera koçluğu bu sürümde kapalıdır.",
    en: "Gravita offers seven written courses on strength and skill foundations: a 56-lesson calisthenics course, dumbbell and kettlebell paths, and barbell, low-ring and hand-support foundations. 44 of the 117 lessons are free; the remaining lessons, program creation and logging new sessions open with a Gravita membership or Motion+ subscription through the App Store and Google Play. Live camera coaching is off in this release.",
  },
  short: {
    tr: "Kalistenik, dambıl ve kettlebell, halter, halka ve el desteği için yedi yazılı kurs. 117 dersin 44'ü ücretsiz; gerisi App Store ve Google Play üzerinden abonelikle açılır. Kamera koçluğu kapalı.",
    en: "Seven written courses in calisthenics, dumbbell and kettlebell, barbell, rings and hand support. 44 of 117 lessons are free; the rest open by subscription through the App Store and Google Play. Camera coaching is off.",
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
    logo: "/projects/gravita/icon.png",
    icon: "/projects/gravita/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Kurslar", en: "Courses" },
      description: {
        tr: "Kalistenik: eksiksiz temel (56 ders); dambıl ve kettlebell yazılı temeller (12), kontrollü kullanım (11) ve geçişler (2); halter, alçak halka ve el desteği temelleri (12'şer ders).",
        en: "Calisthenics: a complete foundation (56 lessons); dumbbell and kettlebell written foundations (12), controlled handling (11) and transitions (2); barbell, low-ring and hand-support foundations (12 lessons each).",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Her kursun baştaki modülleri ücretsizdir; 117 dersin 44'ü. Kalistenik kursunda 56 dersin 21'i ücretsizdir; kurs misafir olarak, hesap açmadan incelenebilir.",
        en: "The opening modules of each course are free, 44 of 117 lessons in all. In the calisthenics course 21 of 56 lessons are free; you can explore it as a guest, without an account.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Abonelik", en: "Subscription" },
      description: {
        tr: "Uygulama üyeliği bu uygulamadaki ücretli dersleri açar; Motion+ beş Motion uygulamasında bugün açık olan ücretli dersleri ve pratiği açar. Kamera koçluğu ve henüz yayımlanmamış dersler dahil değildir. Uygun yeni aboneler 14 günlük ücretsiz denemeyle başlar; fiyat ülkeye göre değişir ve App Store ya da Google Play'de gösterilir. İptal mağaza hesabından yapılır.",
        en: "An app membership opens the paid lessons in this app; Motion+ unlocks the paid lessons and practice available today in all five Motion apps. Camera coaching and lessons not yet released are not included. Eligible new subscribers start with a 14-day free trial; the price varies by country and is shown in the App Store or Google Play. Cancel in your store account.",
      },
      icon: "BadgeCheck",
    },
    {
      title: { tr: "Kamera kapalı", en: "Camera off" },
      description: {
        tr: "Canlı kamera koçluğu bu sürümde kapalıdır; kamera puanı, form düzeltmesi veya otomatik sayım yoktur. İlerlemeyi kendin kaydedersin; bu bir beceri puanı değildir.",
        en: "Live camera coaching is off in this release; there is no camera score, form correction or automatic counting. You record progress yourself; it is not a skill score.",
      },
      icon: "Lock",
    },
  ],
  stats: [
    { value: "44/117", label: { tr: "Ücretsiz ders / toplam", en: "Free lessons / total" } },
    { value: "7", label: { tr: "Kurs", en: "Courses" } },
  ],
  vision: {
    tr: "Kuvvet ve beceri pratiğini herkesin kendi temposunda, anlaşılır adımlarla kurabilmesi.",
    en: "Strength and skill practice that anyone can build at their own pace, in clear steps.",
  },
  mission: {
    tr: "Vücut becerisi pratiğini anlaşılır kurs adımları ve dürüst ilerleme kayıtlarıyla desteklemek.",
    en: "Support bodyweight-skills practice with clear course steps and honest progress records.",
  },
  order: 4,
  links: [],
};
