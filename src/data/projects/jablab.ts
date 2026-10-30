import type { ProjectConfig } from "@/lib/types";

export const jablab: ProjectConfig = {
  slug: "jablab",
  name: "JabLab",
  monogram: "JL",
  kind: ["mobile"],
  status: "coming-soon",
  category: {
    tr: "Solo Dövüş Sanatları Pratiği",
    en: "Solo Martial Arts Practice",
  },
  tagline: {
    tr: "Gölge antrenmanını adım adım çalış.",
    en: "Practise shadow training step by step.",
  },
  description: {
    tr: "JabLab, temas içermeyen solo pratik için yazılı kurslar sunar: boks, kickboks, Muay Thai, karate ve tai chi. 129 dersin 39'u ücretsizdir ve hesap gerektirmez; kalan dersler ve bağımsız pratik aşaması JabLab üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Canlı kamera koçluğu bu sürümde kapalıdır.",
    en: "JabLab offers written courses for non-contact solo practice: boxing, kickboxing, Muay Thai, karate and tai chi. 39 of the 129 lessons are free and need no account; the remaining lessons and the independent practice stage open with a JabLab membership or Motion+ subscription through the App Store and Google Play. Live camera coaching is off in this release.",
  },
  short: {
    tr: "Boks, kickboks, Muay Thai, karate ve tai chi için yazılı solo kurslar. 129 dersin 39'u ücretsiz; gerisi App Store ve Google Play üzerinden abonelikle açılır. Kamera koçluğu kapalı.",
    en: "Written solo courses in boxing, kickboxing, Muay Thai, karate and tai chi. 39 of 129 lessons are free; the rest open by subscription through the App Store and Google Play. Camera coaching is off.",
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
    logo: "/projects/jablab/icon.png",
    icon: "/projects/jablab/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Kurslar", en: "Courses" },
      description: {
        tr: "Solo boks (39 ders); Kickboks A, Muay Thai A ve Karate A (16'şar ders); Taikyoku Shodan (10); Tai Chi temelleri (14) ve yazılı Yang ailesi 16 formu (18). Temas yoktur.",
        en: "Solo boxing (39 lessons); Kickboxing A, Muay Thai A and Karate A (16 each); Taikyoku Shodan (10); Tai Chi foundations (14) and the written Yang family 16 form (18). No contact.",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Her kursun ilk dersleri ücretsizdir: boksta ilk iki modül (10 ders); Kickboks, Muay Thai, Karate ve Tai Chi'de 5'er; Taikyoku Shodan'da 3 ve Yang 16'da 6 ders. Ücretsiz dersler için hesap gerekmez.",
        en: "The first lessons of every course are free: the first two boxing modules (10 lessons); 5 each in Kickboxing, Muay Thai, Karate and Tai Chi; 3 in Taikyoku Shodan and 6 in Yang 16. Free lessons need no account.",
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
    { value: "39", label: { tr: "Ücretsiz ders", en: "Free lessons" }, claimId: "jablab-free-lessons" },
    { value: "129", label: { tr: "Toplam ders", en: "Lessons in all" }, claimId: "jablab-free-lessons" },
    { value: "7", label: { tr: "Kurs", en: "Courses" }, claimId: "jablab-free-lessons" },
  ],
  vision: {
    tr: "Antrenman arkadaşı veya salon olmadan da düzenli sürdürülebilen bir solo pratik.",
    en: "Solo practice you can keep up regularly, without a training partner or a gym.",
  },
  mission: {
    tr: "Solo boks pratiğini anlaşılır dersler ve dürüst ilerleme kayıtlarıyla desteklemek.",
    en: "Support solo boxing practice with clear lessons and honest progress records.",
  },
  order: 6,
  links: [],
};
