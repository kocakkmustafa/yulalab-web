import type { ProjectConfig } from "@/lib/types";

export const choreia: ProjectConfig = {
  slug: "choreia",
  name: "Choreia",
  monogram: "CH",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Solo Dans Pratiği",
    en: "Solo Dance Practice",
  },
  tagline: {
    tr: "Dans adımlarını kendi hızında çalış.",
    en: "Practise dance steps at your own pace.",
  },
  description: {
    tr: "Choreia beş yazılı solo dans kursu sunar: Salsa On1, Hip-Hop temelleri, Line Dance, düşük tempolu Latin Fusion ve özgün kısa form dans. 88 dersin 33'ü ücretsizdir ve hesap gerektirmez; kalanı Choreia üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Canlı kamera pratiği bu sürümde kapalıdır.",
    en: "Choreia offers five written solo dance courses: Salsa On1, Hip-Hop foundations, Line Dance, low-impact Latin Fusion and original short-form dance. 33 of the 88 lessons are free and need no account; the rest open with a Choreia membership or Motion+ subscription through the App Store and Google Play. Live camera practice is off in this release.",
  },
  short: {
    tr: "Salsa On1, Hip-Hop, Line Dance, Latin Fusion ve kısa form dans için yazılı solo kurslar. 88 dersin 33'ü ücretsiz; gerisi App Store ve Google Play üzerinden abonelikle açılır. Kamera kapalı.",
    en: "Written solo courses in Salsa On1, Hip-Hop, Line Dance, Latin Fusion and short-form dance. 33 of 88 lessons are free; the rest open by subscription through the App Store and Google Play. Camera is off.",
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
    logo: "/projects/choreia/icon.png",
    icon: "/projects/choreia/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Kurslar", en: "Courses" },
      description: {
        tr: "Salsa On1 solo yolculuk (48 ders), Hip-Hop temelleri (8), Line Dance başlangıç (12), düşük tempolu Latin Fusion temelleri (10) ve özgün kısa form dans (10).",
        en: "Salsa On1 solo journey (48 lessons), Hip-Hop foundations (8), Line Dance beginner (12), low-impact Latin Fusion foundations (10) and original short-form dance (10).",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Salsa'da 8 modülün ilk 3'ü (18 ders), Hip-Hop'ta 3, Line Dance, Latin Fusion ve kısa form dansta 4'er ders ücretsizdir. Ücretsiz dersler için hesap veya kamera gerekmez.",
        en: "The first 3 of 8 Salsa modules (18 lessons), 3 Hip-Hop lessons and 4 lessons each in Line Dance, Latin Fusion and short-form dance are free. Free lessons need no account or camera.",
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
  // Lesson counts are stated in the copy; a stat card would need a registry claim.
  stats: [],
  vision: {
    tr: "Dans pratiğini kendi odanda, kendi hızında sürdürebilmek.",
    en: "Dance practice you can keep up in your own room, at your own pace.",
  },
  mission: {
    tr: "Dans pratiğini anlaşılır kurs adımları ve dürüst ilerleme kayıtlarıyla desteklemek.",
    en: "Support dance practice with clear course steps and honest progress records.",
  },
  order: 8,
  links: [],
};
