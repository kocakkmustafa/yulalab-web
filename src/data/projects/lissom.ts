import type { ProjectConfig } from "@/lib/types";

export const lissom: ProjectConfig = {
  slug: "lissom",
  name: "Lissom",
  monogram: "LS",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Yoga ve Mobilite",
    en: "Yoga & Mobility",
  },
  tagline: {
    tr: "Kısa pratiklerle hareket alışkanlığı kur.",
    en: "Build a movement habit with short practice.",
  },
  description: {
    tr: "Lissom beş yazılı yoga kursu sunar: Hatha, sandalye ve ofis yogası, destekli ayakta Vinyasa, destekli Yin ve Ashtanga temelleri. 120 dersin 47'si ücretsizdir ve hesap gerektirmez; kalan dersler Lissom üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Canlı kamera ölçümü bu sürümde kapalıdır.",
    en: "Lissom offers five written yoga courses: Hatha, chair and office yoga, supported standing Vinyasa, supported Yin and Ashtanga foundations. 47 of the 120 lessons are free and need no account; the remaining lessons open with a Lissom membership or Motion+ subscription through the App Store and Google Play. Live camera measurement is off in this release.",
  },
  short: {
    tr: "Hatha, sandalye ve ofis, Vinyasa, Yin ve Ashtanga için yazılı yoga kursları. 120 dersin 47'si ücretsiz; gerisi App Store ve Google Play üzerinden abonelikle açılır. Kamera kapalı.",
    en: "Written yoga courses in Hatha, chair and office, Vinyasa, Yin and Ashtanga. 47 of 120 lessons are free; the rest open by subscription through the App Store and Google Play. Camera is off.",
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
    logo: "/projects/lissom/icon.png",
    icon: "/projects/lissom/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Kurslar", en: "Courses" },
      description: {
        tr: "Hatha (60 ders), sandalye ve ofis yogası (15), destekli ayakta Vinyasa (14), destekli Yin (12) ve Ashtanga temelleri (19).",
        en: "Hatha (60 lessons), chair and office yoga (15), supported standing Vinyasa (14), supported Yin (12) and Ashtanga foundations (19).",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Her kursun ilk bölümü ücretsizdir: Hatha'da 60 dersin ilk 24'ü, sandalye ve ofiste 6, Vinyasa ve Yin'de 5'er, Ashtanga'da 7 ders. Ücretsiz dersler için hesap veya kamera gerekmez.",
        en: "The first part of every course is free: the first 24 of 60 Hatha lessons, 6 in chair and office, 5 each in Vinyasa and Yin, and 7 in Ashtanga. Free lessons need no account or camera.",
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
    { value: "47/120", label: { tr: "Ücretsiz ders / toplam", en: "Free lessons / total" } },
    { value: "5", label: { tr: "Kurs", en: "Courses" } },
  ],
  vision: {
    tr: "Esnekliği ve hareketliliği kısa, düzenli pratiklerle sürdürülebilir bir alışkanlığa çevirmek.",
    en: "Turn flexibility and mobility into a sustainable habit through short, regular practice.",
  },
  mission: {
    tr: "Yoga pratiğini anlaşılır dersler ve sürdürülebilir çalışma alışkanlıklarıyla desteklemek.",
    en: "Support yoga practice with clear lessons and sustainable practice habits.",
  },
  order: 5,
  links: [],
};
