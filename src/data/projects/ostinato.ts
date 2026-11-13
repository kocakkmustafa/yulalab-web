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
    tr: "Ostinato gitarı ilk sesten itibaren ölçülü pratikle öğretir; kulağını alıştırmalar ve alkışla eğitir. Gitar kursu dört seviyede 240 dersle, kulak eğitimi iki seviyede 50 dersle gelir. Kulak eğitiminde ekran alıştırmaları, klikle alkış ve bölüm bölüm testler var; şarkı söyleme ölçülmez, onu kendin kontrol edersin. Şan ve piyano yakında ve program 690 derse büyüyor. Her nota için doğru, farklı nota ya da duyamadım diye geri bildirim verir; akort aleti, metronom ve kurulum sihirbazı uygulamanın içindedir. Gitarın ilk seviyesi (40 ders) ve kulak eğitiminin ilk seviyesi (25 ders) ücretsizdir ve hesap gerektirmez; sonraki dersler Ostinato üyeliğiyle App Store ve Google Play üzerinden açılır. Mikrofon sesi cihazında işlenir ve yüklenmez.",
    en: "Ostinato teaches guitar from the first sound through measured practice, and trains your ear with drills and clapping. The guitar course comes with 240 lessons across four levels, and ear training with 50 lessons across two levels. Ear training uses on-screen drills, clapping with the click and part-by-part tests; singing is not measured, so you check it yourself. Voice and piano are coming soon, and the programme grows to 690 lessons. It gives feedback on every note as correct, a different note or couldn't hear, with a tuner, metronome and setup wizard inside the app. Guitar level 1 (40 lessons) and ear training level 1 (25 lessons) are free and need no account; later lessons open with an Ostinato membership through the App Store and Google Play. Microphone audio is processed on your device and is not uploaded.",
  },
  short: {
    tr: "Gitar 240 dersle, kulak eğitimi 50 dersle gelir; şan ve piyano yakında, program 690 derse büyüyor. Gitarın ilk seviyesi (40 ders) ve kulak eğitiminin ilk seviyesi (25 ders) ücretsiz ve hesapsız; gerisi Ostinato üyeliğiyle App Store ve Google Play üzerinden açılır.",
    en: "Guitar comes with 240 lessons and ear training with 50; voice and piano are coming soon, and the programme grows to 690 lessons. Guitar level 1 (40 lessons) and ear training level 1 (25 lessons) are free, with no account. The rest opens with an Ostinato membership through the App Store and Google Play.",
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
        tr: "Gitar kursu dört seviyede 240 dersle, kulak eğitimi iki seviyede 50 dersle açık; şan ve piyano yakında.",
        en: "The guitar course is open with 240 lessons across four levels, and ear training with 50 lessons across two levels; voice and piano are coming soon.",
      },
      icon: "Sparkles",
    },
    {
      title: { tr: "Ücretsiz kısım", en: "Free part" },
      description: {
        tr: "Gitarın ilk seviyesi (40 ders) ve kulak eğitiminin ilk seviyesi (25 ders) ücretsizdir. Ücretsiz dersler hesap, kamera veya mikrofon olmadan çalışır; ilerleme kayıtların her zaman görünür kalır.",
        en: "Guitar level 1 (40 lessons) and ear training level 1 (25 lessons) are free. Free lessons work without an account, camera or microphone; your progress records always stay visible.",
      },
      icon: "Eye",
    },
    {
      title: { tr: "Abonelik", en: "Subscription" },
      description: {
        tr: "Uygulama üyeliği bu uygulamadaki ücretli dersleri açar; Motion+ beş Motion uygulamasında yayımlanan ücretli dersleri ve pratiği açar. Kamera koçluğu ve henüz yayımlanmamış dersler dahil değildir. Uygun yeni aboneler 14 günlük ücretsiz denemeyle başlar; fiyat ülkeye göre değişir ve App Store ya da Google Play'de gösterilir. İptal mağaza hesabından yapılır.",
        en: "An app membership opens the paid lessons in this app; Motion+ unlocks the paid lessons and practice released in all five Motion apps. Camera coaching and lessons not yet released are not included. Eligible new subscribers start with a 14-day free trial; the price varies by country and is shown in the App Store or Google Play. Cancel in your store account.",
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
