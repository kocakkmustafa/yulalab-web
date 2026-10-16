import type { Locale } from "@/lib/types";

/** Dated development UI, separate from publication/claim evidence. */
export type DevelopmentPreview = {
  path: string;
  sourceBuild: string;
  capturedAt: string;
  alt: Record<Locale, string>;
};

export const developmentPreviews: Partial<Record<string, readonly DevelopmentPreview[]>> = {
  ostinato: [
    {
      path: "/projects/ostinato/preview-written-lesson-20261016.png",
      sourceBuild: "development-ios-9e4253433bdf428717abc92cd92fed082e2be48f",
      capturedAt: "2026-10-16",
      alt: {
        tr: "Ostinato yazılı gitar dersi, iOS geliştirme sürümü. Öğretim veya mikrofon doğruluğu ölçümü değildir.",
        en: "Ostinato written guitar lesson in the iOS development build. This is not a teaching or microphone-accuracy measurement.",
      },
    },
    {
      path: "/projects/ostinato/preview-course-20261016.png",
      sourceBuild: "development-ios-9e4253433bdf428717abc92cd92fed082e2be48f",
      capturedAt: "2026-10-16",
      alt: {
        tr: "Ostinato kurs görünümü, iOS geliştirme sürümü; öz bildirime dayalı ilerleme.",
        en: "Ostinato course view in the iOS development build; progress is self-reported.",
      },
    },
  ],
  lifeos: [
    {
      path: "/projects/lifeos/preview-onboarding-20261016.png",
      sourceBuild: "development-ios-e0f85cac41b91ebac1d13d67f11321ff00e9747c",
      capturedAt: "2026-10-16",
      alt: {
        tr: "LifeOS ilk başlangıç ekranı, iOS geliştirme sürümü. İçgörü metni örnektir; gerçek kullanıcı sonucu değildir.",
        en: "LifeOS first-start screen in the iOS development build. The insight text is an example, not a real user's result.",
      },
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
  "/projects/braavolabs/screenshot-audit-trail.png",
  "/projects/braavolabs/screenshot-builder.png",
  "/projects/burunfarki/screenshot-honest-stats.png",
  "/projects/burunfarki/screenshot-daily-history.png",
  ...Object.values(developmentPreviews).flatMap((previews) => previews?.map((preview) => preview.path) ?? []),
];
