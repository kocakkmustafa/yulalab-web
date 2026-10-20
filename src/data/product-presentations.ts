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
        "tr": "Ostinato normal iOS geliştirme ana ekranı. Yazılı dersler ve duruş referans kataloğu görünür; canlı kamera pratiği ve abonelikler kapalıdır.",
        "en": "Ostinato home in the normal iOS development build. Written lessons and the posture-reference catalogue are visible; live camera practice and subscriptions are off."
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

export const approvedIdentityPaths = [
  "/projects/gravita/icon.png",
  "/projects/lissom/icon.png",
  "/projects/jablab/icon.png",
  "/projects/ostinato/icon.png",
  "/projects/choreia/icon.png",
] as const;

export const showcaseImagePaths = [
  ...approvedIdentityPaths,
  "/projects/braavolabs/screenshot-audit-trail.png",
  "/projects/braavolabs/screenshot-builder.png",
  "/projects/burunfarki/screenshot-honest-stats.png",
  "/projects/burunfarki/screenshot-daily-history.png",
  ...approvedIdentityPaths.map((path) => path.replace("/icon.png", "/preview-native-20261016.png")),
  "/projects/lifeos/preview-onboarding-20261016.png",
];
