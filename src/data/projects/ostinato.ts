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
    tr: "Enstrüman pratiğini adım adım kur.",
    en: "Build your instrument practice step by step.",
  },
  description: {
    tr: "Ostinato beş yazılı başlangıç kursu sunar: gitar, piyano ve klavye, ukulele, bas ve şan. 155 dersin 44'ü ücretsizdir ve hesap gerektirmez; sonraki dersler Ostinato üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Gitar kursunda isteğe bağlı tek nota gözlemi için mikrofonu sen başlatırsın; ses kaydedilmez veya yüklenmez. Canlı kamera pratiği bu sürümde kapalıdır.",
    en: "Ostinato offers five written beginner courses: guitar, piano and keyboard, ukulele, bass and voice. 44 of the 155 lessons are free and need no account; later lessons open with an Ostinato membership or Motion+ subscription through the App Store and Google Play. In the guitar course you can start the microphone for optional single-note observation; audio is not recorded or uploaded. Live camera practice is off in this release.",
  },
  short: {
    tr: "Gitar, piyano, ukulele, bas ve şan için yazılı başlangıç kursları. 155 dersin 44'ü ücretsiz; gerisi App Store ve Google Play üzerinden abonelikle açılır. Kamera kapalı, mikrofon isteğe bağlı.",
    en: "Written beginner courses in guitar, piano, ukulele, bass and voice. 44 of 155 lessons are free; the rest open by subscription through the App Store and Google Play. Camera off, microphone optional.",
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
    logo: "/projects/ostinato/icon.png",
    icon: "/projects/ostinato/icon.png",
    screenshots: [],
  },
  features: [
    {
      title: { tr: "Kurslar", en: "Courses" },
      description: {
        tr: "Gitar: ilk sesten bağımsız çalmaya (60 ders); piyano ve klavye (25), ukulele (24), dört telli bas (24) ve şan (22) için başlangıç temelleri.",
        en: "Guitar from first sound to independent playing (60 lessons), and beginner foundations in piano and keyboard (25), ukulele (24), four-string bass (24) and voice (22).",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Gitarda 1–12. dersler, piyano, ukulele, bas ve şanda ilk 8 ders ücretsizdir. Ücretsiz dersler hesap, kamera veya mikrofon olmadan çalışır; ilerleme kayıtların her zaman görünür kalır.",
        en: "Lessons 1–12 of guitar and the first 8 lessons of piano, ukulele, bass and voice are free. Free lessons work without an account, camera or microphone; your progress records always stay visible.",
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
      title: { tr: "Kamera kapalı, mikrofon isteğe bağlı", en: "Camera off, microphone optional" },
      description: {
        tr: "Canlı kamera pratiği bu sürümde kapalıdır. Gitar kursunda istersen tek nota gözlemi için mikrofonu başlatırsın; ses yalnız cihazın geçici belleğinde işlenir, kaydedilmez veya yüklenmez ve doğruluk puanı vermez.",
        en: "Live camera practice is off in this release. In the guitar course you can choose to start the microphone to observe a single note; audio is processed only in temporary device memory, is not recorded or uploaded, and gives no correctness score.",
      },
      icon: "Lock",
    },
  ],
  stats: [
    { value: "44", label: { tr: "Ücretsiz ders", en: "Free lessons" }, claimId: "ostinato-free-lessons" },
    { value: "155", label: { tr: "Toplam ders", en: "Lessons in all" }, claimId: "ostinato-free-lessons" },
    { value: "5", label: { tr: "Kurs", en: "Courses" }, claimId: "ostinato-free-lessons" },
  ],
  vision: {
    tr: "Enstrüman pratiğinin, öğretmen olmadan geçen saatlerini de değerli kılmak.",
    en: "Make the hours you practice without a teacher count too.",
  },
  mission: {
    tr: "Gitar pratiğini anlaşılır dersler ve dürüst ilerleme kayıtlarıyla bilinçli bir alışkanlığa çevirmek.",
    en: "Turn guitar practice into a deliberate habit with clear lessons and honest progress records.",
  },
  order: 7,
  links: [],
};
