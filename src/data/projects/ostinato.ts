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
    tr: "Ostinato gitar, şan, piyano ve kulak eğitimini ilk sesten itibaren dört kursta, 690 derste öğretir. Her nota için doğru, farklı nota ya da duyamadım diye geri bildirim verir; akort aleti, metronom ve kurulum sihirbazı uygulamanın içindedir. Ücretsiz dersler hesap gerektirmez; sonraki dersler Ostinato üyeliği veya Motion+ aboneliğiyle App Store ve Google Play üzerinden açılır. Mikrofon sesi cihazında işlenir ve yüklenmez.",
    en: "Ostinato teaches guitar, voice, piano and ear training from the first sound, in four courses and 690 lessons. It gives feedback on every note as correct, a different note or couldn't hear, with a tuner, metronome and setup wizard inside the app. Free lessons need no account; later lessons open with an Ostinato membership or Motion+ subscription through the App Store and Google Play. Microphone audio is processed on your device and is not uploaded.",
  },
  short: {
    tr: "Gitar, şan, piyano ve kulak eğitimi için dört kurs, 690 ders. Ücretsiz dersler hesapsız açılır; gerisi App Store ve Google Play üzerinden abonelikle açılır.",
    en: "Four courses and 690 lessons in guitar, voice, piano and ear training. Free lessons open without an account; the rest open by subscription through the App Store and Google Play.",
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
  // Lesson counts are stated in the copy; a stat card would need a registry claim.
  stats: [],
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
