/**
 * Finished-product showcase for each product page (founder decision K3,
 * 2026-10-31): the page introduces the product we are building, and every
 * capability that is not in the shipped app today carries `roadmap: true`,
 * rendered as an "On the roadmap" label. Today's facts (courses, free
 * lessons, camera and audio scope) stay in the page's "in the app" section
 * and in the legal pages; nothing here may contradict them. A capability
 * that the privacy pages currently rule out (camera coaching, AI parsing,
 * mentor memory, local-only processing) is always marked roadmap.
 *
 * Source drafts: scratch/2026-10-31-rakip-analizi/yulalab/_icerik-denetimi.tr.md §4,
 * contradiction list §5.3. Secondary locales come from messages/content-*.json.
 */
type Copy = { tr: string; en: string };

export type ShowcaseFeature = { title: Copy; body: Copy; roadmap?: true };
export type ShowcaseQuestion = { question: Copy; answer: Copy };
export type CompanyRole = { name: Copy; reports?: CompanyRole[] };
export type ShowcaseCompany = { title: Copy; body: Copy; roadmap?: true; head: CompanyRole };
/**
 * Founder decision K6 (2026-10-31). Store apps share one price: TRY in the
 * Turkish locale, USD in every other. Amounts are in major units and are
 * formatted per locale with Intl.NumberFormat.
 */
export type ShowcasePrice = {
  plan?: string;
  monthly: { TRY?: number; USD: number };
  yearly?: { TRY?: number; USD: number };
  /** Store subscription: the price shown in the App Store / Google Play applies. */
  store: boolean;
};

const STORE_APP_PRICE: ShowcasePrice = {
  monthly: { TRY: 299.99, USD: 11.99 },
  yearly: { TRY: 1499.99, USD: 69.99 },
  store: true,
};

export type ProductShowcase = {
  features: ShowcaseFeature[];
  faq: ShowcaseQuestion[];
  price?: ShowcasePrice;
  /** Braavolabs' "Company": a ready-made agent org (founder naming, 2026-10-31). */
  company?: ShowcaseCompany;
};

export const SHOWCASE_LABELS = {
  features: { tr: "Özellikler", en: "Features" },
  roadmap: { tr: "Yol haritasında", en: "On the roadmap" },
  faq: { tr: "Sık sorulanlar", en: "Questions" },
  pricing: { tr: "Fiyat", en: "Pricing" },
  perMonth: { tr: "aylık", en: "per month" },
  perYear: { tr: "yıllık", en: "per year" },
  storePriceNote: {
    tr: "Fiyatlar ülkeye göre değişebilir; App Store'da ya da Google Play'de gösterilen fiyat geçerlidir.",
    en: "Prices can vary by country; the price shown in the App Store or Google Play applies.",
  },
} as const satisfies Record<string, Copy>;

const CAMERA_TODAY: ShowcaseQuestion = {
  question: { tr: "Kamera görüntüm kaydedilir mi?", en: "Is my camera recorded?" },
  answer: {
    tr: "Bu sürümde kamera koçluğu kapalı; dersler kamera izni istemez. Ayrıntılar Motion gizlilik politikasında.",
    en: "Camera coaching is off in this release, and the courses do not ask for camera permission. Details are in the Motion privacy policy.",
  },
};

const FREE_START: ShowcaseQuestion = {
  question: { tr: "Hesap açmam gerekir mi?", en: "Do I need an account?" },
  answer: {
    tr: "Hayır. Ücretsiz dersler hesapsız açılır; hesap yalnız abonelik ve ilerlemeni taşımak için gerekir.",
    en: "No. Free lessons open without an account; you only need one for a subscription and to carry your progress.",
  },
};

export const productShowcase: Record<string, ProductShowcase> = {
  lifeos: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Anlat, kaydolsun.", en: "Say it, and it's logged." },
        body: {
          tr: "Gününü konuşarak ya da yazarak anlatırsın; LifeOS anlattığını ilgili alanlara kayıt olarak önerir, sen onaylarsın.",
          en: "Describe your day by voice or text; LifeOS suggests entries for each area and you confirm them.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Alanlar arası bağlantılar.", en: "Connections across areas." },
        body: {
          tr: "Uyku, ruh hâli, harcama ve hareketin birlikte nasıl değiştiğini gösterir; bir ilişkiyi neden-sonuç gibi sunmaz.",
          en: "See how sleep, mood, spending and movement change together, without presenting a pattern as cause and effect.",
        },
      },
      {
        title: { tr: "Seni tanıyan bir mentör.", en: "A mentor that knows you." },
        body: {
          tr: "Kayıtlarına bakarak hatırlatan ve yönlendiren kişisel bir rehber. Sağlık ya da finans uzmanının yerini tutmaz.",
          en: "A personal guide that reminds and nudges based on your records. It does not replace a health or financial professional.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Beş alan, tek görünüm.", en: "Five areas, one view." },
        body: {
          tr: "Sağlık, finans, varlıklar, eğitim ve yaşam kayıtların dağınık uygulamalar yerine tek bir sakin görünümde.",
          en: "Health, finance, assets, education and life records in one calm view instead of scattered apps.",
        },
      },
      {
        title: { tr: "Önce cihazın.", en: "Your device first." },
        body: {
          tr: "Kayıtların cihazında tutulur. Apple Health ve Health Connect verisi izninle okunur ve cihazda işlenir.",
          en: "Your records are kept on your device. Apple Health and Health Connect data is read with your permission and processed on the device.",
        },
      },
      {
        title: { tr: "Hesapsız başla.", en: "Start without an account." },
        body: {
          tr: "Uygulamayı ücretsiz indir ve hesap açmadan kayıt tutmaya başla.",
          en: "Download the app for free and start keeping records without creating an account.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Hesap gerekir mi?", en: "Do I need an account?" },
        answer: {
          tr: "Hayır. Kayıtlarını hesapsız tutabilirsin; hesap yalnız abonelik özellikleri için gerekir.",
          en: "No. You can keep records without an account; an account is only needed for subscription features.",
        },
      },
      {
        question: { tr: "Sağlık verilerim sunucuya gider mi?", en: "Does my health data leave my device?" },
        answer: {
          tr: "Apple Health ve Health Connect verisi cihazında işlenir ve sunucularımıza gönderilmez. Ayrıntılar LifeOS gizlilik politikasında.",
          en: "Apple Health and Health Connect data is processed on your device and is not sent to our servers. Details are in the LifeOS privacy policy.",
        },
      },
      {
        question: { tr: "Hangi cihazlarda var?", en: "Which devices does it run on?" },
        answer: {
          tr: "Bugün iPhone'da App Store'da. Android sürümü yakında Google Play'de.",
          en: "Today on iPhone, from the App Store. The Android version is coming soon to Google Play.",
        },
      },
      {
        question: { tr: "Hesabımı nasıl silerim?", en: "How do I delete my account?" },
        answer: {
          tr: "Uygulamanın ayarlarından ya da yulalab.com/delete-account/lifeos sayfasından.",
          en: "From the app's settings, or at yulalab.com/delete-account/lifeos.",
        },
      },
    ],
  },
  braavolabs: {
    price: { plan: "Individual", monthly: { USD: 19.99 }, store: false },
    features: [
      {
        title: { tr: "Çoklu model sohbet.", en: "Multi-model chat." },
        body: {
          tr: "Aynı soruyu birden çok modele sor ve yanıtları karşılaştır. İstersen yerel modelle çevrimdışı ya da kendi anahtarınla doğrudan sağlayıcıya çalış.",
          en: "Ask several models the same question and compare the answers. Work offline with a local model, or straight to a provider with your own key.",
        },
      },
      {
        title: { tr: "Zamanlanmış görevler.", en: "Scheduled tasks." },
        body: {
          tr: "\"Her sabah rakip fiyatlarını kontrol et\" gibi işleri sıklığını seçerek ajana devret.",
          en: "Hand recurring work such as \"check competitor prices every morning\" to an agent and choose how often it runs.",
        },
      },
      {
        title: { tr: "Masaüstü ve terminal.", en: "Desktop and terminal." },
        body: {
          tr: "macOS ve Windows uygulaması ile komut satırı aracı; kendi API anahtarlarınla çalışır.",
          en: "Apps for macOS and Windows and a command-line tool, working with your own API keys.",
        },
      },
      {
        title: { tr: "Kodlama ajanı.", en: "A coding agent." },
        body: {
          tr: "Proje klasöründe kod okuyan, yazan ve komut çalıştıran bir ajan; her adım onaylı ve izlenebilir.",
          en: "An agent that reads and writes code and runs commands in your project folder, with every step approved and traceable.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Yapı taşlarından otomasyon.", en: "Automations from building blocks." },
        body: {
          tr: "Hazır şablonlar yerine her biri tek iş yapan yapı taşları; akış, onları nasıl dizdiğinden doğar ve okunur kalır.",
          en: "Building blocks that each do one job instead of canned templates; the flow comes from how you arrange them and stays readable.",
        },
      },
      {
        title: { tr: "Görünür maliyet, telefondan yönetim.", en: "Visible costs, managed from your phone." },
        body: {
          tr: "Her çalıştırmanın hangi sağlayıcıda ne kadar tuttuğu defterde. iOS uygulamasından izler ve yönetirsin.",
          en: "The ledger shows what each run cost and with which provider. Follow and manage it from the iOS app.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Hangi AI modelleriyle çalışır?", en: "Which AI models does it use?" },
        answer: {
          tr: "Kendi anahtarlarınla bağladığın sağlayıcılarla; sağlayıcı her adım için ayrı seçilir.",
          en: "The providers you connect with your own keys; the provider can be chosen for each step.",
        },
      },
      {
        question: { tr: "Hangi platformlarda var?", en: "Which platforms is it on?" },
        answer: {
          tr: "Bugün web'de ve iOS'ta. Masaüstü, komut satırı ve Android yakında.",
          en: "Today on the web and iOS. Desktop, command line and Android are coming soon.",
        },
      },
      {
        question: { tr: "Bir adım hata verirse ne olur?", en: "What happens when a step fails?" },
        answer: {
          tr: "Hata yutulmaz: akış durur ve hata kaydedilir.",
          en: "Errors are never swallowed: the flow stops and the error is recorded.",
        },
      },
      {
        question: { tr: "Şirket'te hangi ajanlar var?", en: "Which agents are in Company?" },
        answer: {
          tr: "İlk sette Genel Müdür'ün altında Pazar Analisti, İçerik ve Sosyal Medya Sorumlusu, Müşteri Sesi Analisti, Finans Takipçisi, Teknik Lider ve Sürüm ve Bağımlılık Takipçisi var. Şirket yol haritasında.",
          en: "The first set has a Market Analyst, a Content and Social Media Lead, a Customer Voice Analyst, a Finance Tracker, a Tech Lead and a Release and Dependency Tracker under a General Manager. Company is on the roadmap.",
        },
      },
      {
        question: { tr: "Verilerim nerede tutulur?", en: "Where is my data kept?" },
        answer: {
          tr: "Hangi verinin nerede işlendiği Braavolabs gizlilik politikasında yazılı.",
          en: "The Braavolabs privacy policy sets out what data is processed where.",
        },
      },
    ],
    company: {
      title: { tr: "Şirket", en: "Company" },
      body: {
        tr: "Bilgisayarında yerel çalışan, hazır ajanlardan oluşan bir AI şirketi. Her ajan şirketinin bağlamını paylaşır; org şeması ve her ajanın modeli, eforu ve durumu tek panelde görünür.",
        en: "An AI company of ready-made agents running locally on your computer. Every agent shares your company's context; the org chart and each agent's model, effort and status sit in one panel.",
      },
      roadmap: true,
      head: {
        name: { tr: "Genel Müdür", en: "General Manager" },
        reports: [
          { name: { tr: "Pazar Analisti", en: "Market Analyst" } },
          {
            name: { tr: "İçerik ve Sosyal Medya Sorumlusu", en: "Content and Social Media Lead" },
            reports: [{ name: { tr: "Müşteri Sesi Analisti", en: "Customer Voice Analyst" } }],
          },
          { name: { tr: "Finans Takipçisi", en: "Finance Tracker" } },
          {
            name: { tr: "Teknik Lider", en: "Tech Lead" },
            reports: [{ name: { tr: "Sürüm ve Bağımlılık Takipçisi", en: "Release and Dependency Tracker" } }],
          },
        ],
      },
    },
  },
  ostinato: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Dürüst nota geri bildirimi.", en: "Honest note feedback." },
        body: {
          tr: "Her nota için üç sonuç: doğru, farklı nota ya da duyamadım. Emin olamadığında tahmin etmez. Sonuç ekranı doğruluğu ve hata haritasını gösterir; geçtiğinde sıradaki ders açılır.",
          en: "Three outcomes for every note: correct, a different note, or couldn't hear. When it isn't sure, it doesn't guess. The result screen shows your accuracy and where the mistakes were; pass, and the next lesson opens.",
        },
      },
      {
        title: { tr: "Metronom, akan tab ve döngü.", en: "Metronome, moving tab and loops." },
        body: {
          tr: "Akan tab şeridiyle çal. Tempoyu %40 ile %120 arasında ayarla, zor yeri döngüye al ya da uygulama seni beklesin.",
          en: "Play along a moving tab strip. Set the tempo from 40% to 120%, loop the hard part, or let the app wait for you.",
        },
      },
      {
        title: { tr: "Kurulum sihirbazı.", en: "A setup wizard." },
        body: {
          tr: "Dört kısa adım: yerleşim, oda sessizliği, gecikme ölçümü ve akort. Gecikme hoparlör, kablolu kulaklık ve Bluetooth için ayrı ölçülür ve cihazında saklanır.",
          en: "Four short steps: placement, room quiet, latency and tuning. Latency is measured separately for the speaker, wired headphones and Bluetooth, and stored on your device.",
        },
      },
      {
        title: { tr: "Dahili akort aleti.", en: "A built-in tuner." },
        body: {
          tr: "İbre ve cent göstergesiyle otomatik, elle ve kromatik akort. Emin olamadığında sayı uydurmaz, tekrar çalmanı ister.",
          en: "Automatic, manual and chromatic tuning with a needle and a cent readout. When it isn't sure, it asks you to play again instead of guessing a number.",
        },
      },
      {
        title: { tr: "Akort listesi.", en: "Alternate tunings." },
        body: {
          tr: "Gitarda standart, Drop D, yarım ses aşağı, DADGAD ve Open G; 4 ve 5 telli bas; yüksek ve alçak Sol ukulele.",
          en: "Standard, Drop D, half step down, DADGAD and Open G for guitar; 4- and 5-string bass; high-G and low-G ukulele.",
        },
      },
      {
        title: { tr: "Seri ve haftalık hedef.", en: "Streaks and a weekly goal." },
        body: {
          tr: "Haftalık pratik hedefini koy ve serini sürdür; zor bir hafta için dondurma hakların var. Uygulama dışında çaldığın günleri de işaretleyebilirsin.",
          en: "Set a weekly practice goal and keep your streak going, with freezes for a hard week. You can also mark days you played outside the app.",
        },
      },
      {
        title: { tr: "Yazılı dersler, ücretsiz başlangıç.", en: "Written lessons, a free start." },
        body: {
          tr: "Her kurs ücretsiz derslerle açılır. Ücretsiz dersler hesap gerektirmez; mikrofonlu pratik isteğe bağlıdır.",
          en: "Every course opens with free lessons. Free lessons need no account, and practising with the microphone is optional.",
        },
      },
      {
        title: { tr: "Ses cihazında kalır.", en: "Audio stays on your device." },
        body: {
          tr: "Mikrofonu sen başlatırsın. Ses cihazında işlenir ve yüklenmez. Kendi kaydını dinlemeyi açarsan kayıt yalnız cihazında tutulur ve oturum sonunda silinir.",
          en: "You start the microphone yourself. Audio is processed on your device and is not uploaded. If you turn on listening to your own recording, it is kept only on your device and deleted when the session ends.",
        },
      },
      {
        title: { tr: "MIDI, referans ses ve daha fazlası.", en: "MIDI, reference audio and more." },
        body: {
          tr: "Klavye için MIDI girişi, dersin referans sesini dinleme, seni doğru seviyeden başlatan yerleştirme testi ve ilerlemenin cihazlar arasında senkronu.",
          en: "MIDI input for keyboards, a reference recording for each lesson, a placement test that starts you at the right level, and progress sync across devices.",
        },
        roadmap: true,
      },
    ],
    faq: [
      {
        question: { tr: "Öğretmenin yerini tutar mı?", en: "Does it replace a teacher?" },
        answer: {
          tr: "Hayır. Ostinato düzenli pratiğine eşlik eder; bir öğretmenle çalışmayı tamamlar.",
          en: "No. Ostinato accompanies your regular practice and complements working with a teacher.",
        },
      },
      FREE_START,
      {
        question: { tr: "Sesim bir yere gönderilir mi?", en: "Is my audio sent anywhere?" },
        answer: {
          tr: "Hayır. Ses cihazında işlenir ve yüklenmez. Kendi kaydını dinlemeyi açarsan kayıt yalnız cihazında tutulur ve oturum sonunda silinir. Ayrıntılar Motion gizlilik politikasında.",
          en: "No. Audio is processed on your device and is not uploaded. If you turn on listening to your own recording, it is kept only on your device and deleted when the session ends. Details are in the Motion privacy policy.",
        },
      },
      {
        question: { tr: "Ne zaman indirebilirim?", en: "When can I download it?" },
        answer: {
          tr: "Ostinato yakında App Store'da ve Google Play'de.",
          en: "Ostinato is coming soon to the App Store and Google Play.",
        },
      },
    ],
  },
  jablab: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Beş disiplin, derin kurslar.", en: "Five disciplines, deep courses." },
        body: {
          tr: "Boks, kickboks, Muay Thai, karate ve tai chi; ilk duruştan formlara uzanan yazılı kurslar.",
          en: "Boxing, kickboxing, Muay Thai, karate and tai chi, in written courses from your first stance to full forms.",
        },
      },
      {
        title: { tr: "Partnersiz ve temassız.", en: "No partner, no contact." },
        body: {
          tr: "Bütün pratik solo ve temassızdır; salona ya da partnere ihtiyaç duymazsın.",
          en: "All practice is solo and non-contact; you don't need a gym or a partner.",
        },
      },
      {
        title: { tr: "Raunt zamanlayıcısı ve kombinasyonlar.", en: "Round timer and combinations." },
        body: {
          tr: "Raunt ve dinlenme sürelerini ayarla, kombinasyonları ritimle çalış.",
          en: "Set rounds and rest, and drill combinations to a rhythm.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Kata ve form adım haritası.", en: "Kata and form step map." },
        body: {
          tr: "Kata ve formları adım adım haritada izle, kaldığın yerden devam et.",
          en: "Follow kata and forms step by step on a map and pick up where you left off.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Cihazda kamera koçluğu.", en: "On-device camera coaching." },
        body: {
          tr: "Kamera duruşunu ve tekniğini cihazında takip eder.",
          en: "The camera follows your stance and technique on your device.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Ücretsiz ilk dersler.", en: "Free first lessons." },
        body: {
          tr: "Her kursun ilk dersleri ücretsizdir ve hesap gerektirmez.",
          en: "The first lessons of every course are free and need no account.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Partner ya da ekipman gerekir mi?", en: "Do I need a partner or equipment?" },
        answer: {
          tr: "Hayır. Pratik solo ve temassızdır; hareket edebileceğin bir alan yeterli.",
          en: "No. Practice is solo and non-contact; enough room to move is all you need.",
        },
      },
      {
        question: { tr: "Kuşak ya da sertifika verir mi?", en: "Does it award belts or certificates?" },
        answer: {
          tr: "Hayır. JabLab bir federasyon ya da kulüp derecesi vermez.",
          en: "No. JabLab does not award federation or club grades.",
        },
      },
      CAMERA_TODAY,
      FREE_START,
    ],
  },
  gravita: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Adım adım güç ve beceri.", en: "Strength and skill, step by step." },
        body: {
          tr: "Vücut ağırlığından dambıl ve kettlebell temellerine, halter, halka ve el desteği becerilerine uzanan yazılı kurslar.",
          en: "Written courses from bodyweight basics to dumbbell and kettlebell foundations, barbell, ring and hand-support skills.",
        },
      },
      {
        title: { tr: "En baştan başla.", en: "Start from the very beginning." },
        body: {
          tr: "Kalistenik kursu temelden başlar; hazır olmadığın bir hareketle açılmaz.",
          en: "The calisthenics course starts from the foundations and never opens with a move you are not ready for.",
        },
      },
      {
        title: { tr: "Program ve seans kaydı.", en: "Programmes and session logs." },
        body: {
          tr: "Kendi programını oluştur ve seanslarını kaydet.",
          en: "Build your own programme and log your sessions.",
        },
      },
      {
        title: { tr: "Tekrar, yük ve tutuş zamanlayıcısı.", en: "Rep, load and hold timer." },
        body: {
          tr: "Setlerini, yükünü ve tutuş sürelerini uygulama içinden takip et.",
          en: "Track sets, load and hold times from inside the app.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Cihazda kamera koçluğu.", en: "On-device camera coaching." },
        body: {
          tr: "Kamera hareketini cihazında takip eder ve formuna eşlik eder.",
          en: "The camera follows your movement on your device and keeps you company on form.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Ücretsiz başlangıç.", en: "A free start." },
        body: {
          tr: "Her kursun açılış bölümleri ücretsizdir; kalistenik kursunu hesapsız keşfedebilirsin.",
          en: "The opening modules of every course are free, and you can explore the calisthenics course without an account.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Ekipman gerekir mi?", en: "Do I need equipment?" },
        answer: {
          tr: "Kalistenik kursu ekipmansız başlar; dambıl, kettlebell, halter ve halka kursları ilgili ekipmanı kullanır.",
          en: "The calisthenics course starts without equipment; the dumbbell, kettlebell, barbell and ring courses use that equipment.",
        },
      },
      {
        question: { tr: "Sakatlığım varsa?", en: "What if I have an injury?" },
        answer: {
          tr: "Gravita tıbbi bir cihaz değildir ve sakatlık teşhis etmez. Önce bir sağlık uzmanına danış.",
          en: "Gravita is not a medical device and does not diagnose injuries. Check with a health professional first.",
        },
      },
      CAMERA_TODAY,
      FREE_START,
    ],
  },
  lissom: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Beş yoga kursu.", en: "Five yoga courses." },
        body: {
          tr: "Hatha, sandalye ve ofis yogası, destekli ayakta Vinyasa, destekli Yin ve Ashtanga temelleri.",
          en: "Hatha, chair and office yoga, supported standing Vinyasa, supported Yin and Ashtanga foundations.",
        },
      },
      {
        title: { tr: "Masa başına kısa seriler.", en: "Short series for the desk." },
        body: {
          tr: "Sandalye ve ofis serileriyle gün içinde birkaç dakikada esne.",
          en: "Chair and office series that let you stretch in a few minutes during the day.",
        },
      },
      {
        title: { tr: "Destekli ve kendi temponda.", en: "Supported, at your own pace." },
        body: {
          tr: "Destekli Vinyasa ve Yin, başlangıç seviyesinden itibaren rahatça ilerlemen için.",
          en: "Supported Vinyasa and Yin so you can progress comfortably from the start.",
        },
      },
      {
        title: { tr: "Mobilite ve esneklik takibi.", en: "Mobility and flexibility progress." },
        body: {
          tr: "Esnekliğindeki ve hareket açıklığındaki değişimi zaman içinde gör.",
          en: "See how your flexibility and range of motion change over time.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Cihazda duruş geri bildirimi.", en: "On-device posture feedback." },
        body: {
          tr: "Kamera duruşunu cihazında takip eder ve pozlarda geri bildirim verir.",
          en: "The camera follows your posture on your device and gives feedback in poses.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Ücretsiz açılış bölümleri.", en: "Free opening sections." },
        body: {
          tr: "Her kursun ilk bölümü ücretsizdir; hesap ya da kamera gerektirmez.",
          en: "The first part of every course is free and needs no account or camera.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Yeni başlayanlar için uygun mu?", en: "Is it for beginners?" },
        answer: {
          tr: "Evet. Kurslar temelden başlar; sandalye ve ofis serileri hareket kısıtı olanlar için de uygundur.",
          en: "Yes. The courses start from the basics, and the chair and office series also suit people with limited movement.",
        },
      },
      {
        question: { tr: "Fizyoterapinin yerini tutar mı?", en: "Does it replace physiotherapy?" },
        answer: {
          tr: "Hayır. Lissom tıbbi bir cihaz değildir; ağrın ya da sakatlığın varsa önce bir uzmana danış.",
          en: "No. Lissom is not a medical device; if you have pain or an injury, check with a professional first.",
        },
      },
      CAMERA_TODAY,
      FREE_START,
    ],
  },
  choreia: {
    price: STORE_APP_PRICE,
    features: [
      {
        title: { tr: "Beş solo dans kursu.", en: "Five solo dance courses." },
        body: {
          tr: "Salsa On1, hip-hop temelleri, line dance, düşük tempolu Latin Fusion ve özgün kısa danslar.",
          en: "Salsa On1, hip-hop foundations, line dance, low-impact Latin Fusion and original short dances.",
        },
      },
      {
        title: { tr: "Partner gerekmez.", en: "No partner needed." },
        body: {
          tr: "Bütün kurslar solo; odanda, kendi temponda dans edersin.",
          en: "Every course is solo: dance in your own room, at your own pace.",
        },
      },
      {
        title: { tr: "Ritim motoru.", en: "A beat engine." },
        body: {
          tr: "Uygulama içindeki ritimle say, tempoyu ayarla, zor kısmı döngüye al.",
          en: "Count along to the in-app beat, set the tempo and loop the hard part.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Evde dans kardiyosu.", en: "Home dance cardio." },
        body: {
          tr: "Haftalık kısa rutinler ve evde yapılabilen dans kardiyosu programları.",
          en: "Short weekly routines and dance cardio programmes you can do at home.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Cihazda zamanlama geri bildirimi.", en: "On-device timing feedback." },
        body: {
          tr: "Kamera hareketini cihazında takip eder ve ritme göre zamanlamanı gösterir.",
          en: "The camera follows your movement on your device and shows your timing against the beat.",
        },
        roadmap: true,
      },
      {
        title: { tr: "Ücretsiz ilk dersler.", en: "Free first lessons." },
        body: {
          tr: "Her kursun ilk dersleri ücretsizdir; hesap ya da kamera gerektirmez.",
          en: "The first lessons of every course are free and need no account or camera.",
        },
      },
    ],
    faq: [
      {
        question: { tr: "Dans geçmişim olmalı mı?", en: "Do I need dance experience?" },
        answer: {
          tr: "Hayır. Her kurs ilk adımdan başlar.",
          en: "No. Every course starts from the first step.",
        },
      },
      {
        question: { tr: "Partner gerekir mi?", en: "Do I need a partner?" },
        answer: {
          tr: "Hayır. Bütün kurslar solo dans için tasarlandı.",
          en: "No. Every course is designed for solo dancing.",
        },
      },
      CAMERA_TODAY,
      FREE_START,
    ],
  },
};
