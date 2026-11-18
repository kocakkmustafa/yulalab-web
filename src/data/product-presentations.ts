/** Dated normal-app development UI, separate from publication/claim evidence.
 * First-start views remain explicitly distinct from in-app guest screens.
 */
export type DevelopmentPreview = {
  path: string;
  sourceBuild: string;
  capturedAt: string;
  captureKind: "functional" | "onboarding";
  alt: { tr: string; en: string };
};

export const developmentPreviews: Partial<Record<string, readonly DevelopmentPreview[]>> = {
  "ostinato": [
    {
      "path": "/projects/ostinato/preview-native-20261016.png",
      "sourceBuild": "development-ios-c4370ed3aaf0f0040310788e2020da3522ad017a",
      "capturedAt": "2026-10-16",
      "captureKind": "functional",
      "alt": {
        "tr": "Ostinato normal iOS geliştirme ana ekranı. Yazılı dersler ve duruş referans kataloğu görünür; bu geliştirme sürümünde canlı kamera pratiği ve abonelikler kapalıydı.",
        "en": "Ostinato home in the normal iOS development build. Written lessons and the posture-reference catalogue are visible; live camera practice and subscriptions were off in that development build."
      }
    },
    {
      "path": "/projects/ostinato/preview-written-lesson-20261016.png",
      "sourceBuild": "development-ios-9e4253433bdf428717abc92cd92fed082e2be48f",
      "capturedAt": "2026-10-16",
      "alt": {
        "tr": "Ostinato yazılı gitar dersi, iOS geliştirme sürümü. Öğretim veya mikrofon doğruluğu ölçümü değildir.",
        "en": "Ostinato written guitar lesson in the iOS development build. This is not a teaching or microphone-accuracy measurement."
      },
      "captureKind": "functional"
    },
    {
      "path": "/projects/ostinato/preview-course-20261016.png",
      "sourceBuild": "development-ios-9e4253433bdf428717abc92cd92fed082e2be48f",
      "capturedAt": "2026-10-16",
      "alt": {
        "tr": "Ostinato kurs görünümü, iOS geliştirme sürümü; öz bildirime dayalı ilerleme.",
        "en": "Ostinato course view in the iOS development build; progress is self-reported."
      },
      "captureKind": "functional"
    }
  ],
  "lifeos": [
    {
      "path": "/projects/lifeos/preview-onboarding-20261016.png",
      "sourceBuild": "development-ios-e0f85cac41b91ebac1d13d67f11321ff00e9747c",
      "capturedAt": "2026-10-16",
      "alt": {
        "tr": "LifeOS ilk başlangıç ekranı, iOS geliştirme sürümü. İçgörü metni örnektir; gerçek kullanıcı sonucu değildir.",
        "en": "LifeOS first-start screen in the iOS development build. The insight text is an example, not a real user's result."
      },
      "captureKind": "onboarding"
    }
  ],
  "choreia": [
    {
      "path": "/projects/choreia/preview-native-20261016.png",
      "sourceBuild": "development-ios-aea5112d22f4b8236ba32c78fcf29ebeef1e20b1",
      "capturedAt": "2026-10-16",
      "captureKind": "functional",
      "alt": {
        "tr": "Choreia Salsa On1 ders listesi, normal iOS geliştirme sürümü. Önerilen süreler ve kurs adımları görünür; fiziksel dans kalitesi kanıtı değildir.",
        "en": "Choreia Salsa On1 lesson list in the normal iOS development build. Suggested durations and course steps are visible; this does not establish physical dance quality."
      }
    }
  ],
  "jablab": [
    {
      "path": "/projects/jablab/preview-native-20261016.png",
      "sourceBuild": "development-ios-e2626bd37d8d1e50e28f06a27b2db719d5f7750d",
      "capturedAt": "2026-10-16",
      "captureKind": "functional",
      "alt": {
        "tr": "JabLab misafir ana ekranı, normal iOS geliştirme sürümü. Yazılı ders başlıkları ve solo boks yolu; bazı derslerde fiziksel teknik incelemesinin beklendiği belirtilir.",
        "en": "JabLab guest home in the normal iOS development build. Written lesson headings and the solo boxing path; some lessons state that physical technique review is pending."
      }
    }
  ],
  "gravita": [
    {
      "path": "/projects/gravita/preview-native-20261016.png",
      "sourceBuild": "development-ios-63b8c999e124331b8d64b60e2bb76e81a196503c",
      "capturedAt": "2026-10-16",
      "captureKind": "functional",
      "alt": {
        "tr": "Gravita misafir ana ekranı, normal iOS geliştirme sürümü; kamera kapalı. Yazılı kurs görünümü fiziksel hareket değerlendirmesi veya koçluk kalitesi kanıtı değildir.",
        "en": "Gravita guest home in the normal iOS development build; camera off. The written-course view does not establish physical movement assessment or coaching quality."
      }
    }
  ],
  "lissom": [
    {
      "path": "/projects/lissom/preview-native-20261016.png",
      "sourceBuild": "development-ios-b720e4948e587883025fa7eb3e2cbe64bb17d130",
      "capturedAt": "2026-10-16",
      "captureKind": "functional",
      "alt": {
        "tr": "Lissom Hatha kursu, normal iOS geliştirme sürümü; 60 dersten 0 çalışma kaydı. İlerleme öz bildirime dayalıdır; kamera pozu puanlamaz.",
        "en": "Lissom Hatha course in the normal iOS development build; 0 of 60 lessons recorded. Progress is self-reported; the camera does not score the pose."
      }
    }
  ]
};

/** Approved English design previews (founder decision 2026-11-18). These are
 * design boards, NOT screenshots of a built app: they carry no sourceBuild,
 * never enter the publication registry and are never `kind: "product"`.
 */
export type DesignPreview = {
  path: string;
  alt: { tr: string; en: string };
  boardFile: string;
  designDirection: { tr: string; en: string };
  designedAt: string;
  captureKind: "design";
};

export const designPreviews: Record<string, readonly DesignPreview[]> = {
  "lifeos": [
    {
      path: "/projects/lifeos/design-preview-01-onboarding.png",
      alt: { tr: "LifeOS tasarım önizlemesi: \"Your life, in one place\" karşılama ekranı ve Get started düğmesi.", en: "LifeOS design preview: welcome screen, \"Your life, in one place\", with a Get started button." },
      boardFile: "Giris2.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/lifeos/design-preview-02-today.png",
      alt: { tr: "LifeOS tasarım önizlemesi: günlük hedefler, rutinler ve görevlerle Bugün ekranı.", en: "LifeOS design preview: Today screen with daily goals, routines and tasks." },
      boardFile: "Main.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/lifeos/design-preview-03-finance.png",
      alt: { tr: "LifeOS tasarım önizlemesi: aylık toplamı dolar cinsinden gösteren Finans hareket listesi.", en: "LifeOS design preview: Finance transactions list with monthly total in dollars." },
      boardFile: "Finans1.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/lifeos/design-preview-04-focus.png",
      alt: { tr: "LifeOS tasarım önizlemesi: tamamlanan tur ve odak süresiyle koyu odak zamanlayıcısı.", en: "LifeOS design preview: dark focus timer with rounds completed and focus time." },
      boardFile: "Egitim3.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/lifeos/design-preview-05-health-score.png",
      alt: { tr: "LifeOS tasarım önizlemesi: bileşenleri ve bir içgörüyle 78 puanlık koyu Sağlık skoru.", en: "LifeOS design preview: dark Health score of 78 with components and an insight." },
      boardFile: "Saglik1.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/lifeos/design-preview-06-habits.png",
      alt: { tr: "LifeOS tasarım önizlemesi: alışkanlık başına 14 günlük seri noktalarıyla Alışkanlıklar ekranı.", en: "LifeOS design preview: Habits screen with 14-day streak dots per habit." },
      boardFile: "Yasam2.dc.html",
      designDirection: { tr: "Gümüş Erik", en: "Silver Plum" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
  ],
  "braavolabs": [
    {
      path: "/projects/braavolabs/design-preview-01-approval-queue.png",
      alt: { tr: "Braavolabs tasarım önizlemesi: solda sohbetle bir bülten gönderiminin onay ayrıntıları.", en: "Design preview: approval details for a newsletter send, with a chat on the left." },
      boardFile: "DOnay.dc.html",
      designDirection: { tr: "Ilık Grafit", en: "Warm Graphite" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/braavolabs/design-preview-02-activity-audit.png",
      alt: { tr: "Braavolabs tasarım önizlemesi: görev akışı ve denetim ayrıntılarıyla şirket etkinlik listesi.", en: "Design preview: company activity list with a task flow and audit details." },
      boardFile: "DEtkinlik.dc.html",
      designDirection: { tr: "Ilık Grafit", en: "Warm Graphite" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/braavolabs/design-preview-03-notifications-error.png",
      alt: { tr: "Braavolabs tasarım önizlemesi: Şu an paneli, onay bildirimi ve bağlayıcı hata kartı.", en: "Design preview: Now panel, approval toast and a connector error card." },
      boardFile: "DBildirim.dc.html",
      designDirection: { tr: "Ilık Grafit", en: "Warm Graphite" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/braavolabs/design-preview-04-settings-budget.png",
      alt: { tr: "Braavolabs tasarım önizlemesi: ajan başına harcama ve limitlerle bütçe ayarları.", en: "Design preview: budget settings with per-agent spend and limits." },
      boardFile: "DAyarButce.dc.html",
      designDirection: { tr: "Ilık Grafit", en: "Warm Graphite" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
    {
      path: "/projects/braavolabs/design-preview-05-settings-approval-rules.png",
      alt: { tr: "Braavolabs tasarım önizlemesi: onay kuralları ve acil durdurma ayarları.", en: "Design preview: approval rules and emergency stop settings." },
      boardFile: "DAyarKural.dc.html",
      designDirection: { tr: "Ilık Grafit", en: "Warm Graphite" },
      designedAt: "2026-11-18",
      captureKind: "design",
    },
  ],
};

export const approvedIdentityPaths = [
  "/projects/gravita/icon.png",
  "/projects/lissom/icon.png",
  "/projects/jablab/icon.png",
  "/projects/ostinato/icon.png",
  "/projects/choreia/icon.png",
] as const;

export const showcaseImagePaths = [
  ...approvedIdentityPaths,
  ...approvedIdentityPaths.map((path) => path.replace("/icon.png", "/preview-native-20261016.png")),
  "/projects/lifeos/preview-onboarding-20261016.png",
];
