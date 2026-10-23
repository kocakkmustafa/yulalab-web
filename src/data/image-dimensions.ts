/**
 * Intrinsic pixel size of every capture the linear experience renders, so the
 * browser can reserve each image's box before its bytes arrive (no layout
 * shift while lazy images load). Generated from the PNG headers in public/;
 * tests/image-dimensions.test.ts fails when a capture is added or replaced
 * without updating this map.
 */
export const IMAGE_DIMENSIONS: Readonly<Record<string, { width: number; height: number }>> = {
  "/projects/braavolabs/screenshot-audit-trail.png": { width: 1196, height: 760 },
  "/projects/braavolabs/screenshot-builder.png": { width: 560, height: 400 },
  "/projects/burunfarki/screenshot-daily-history.png": { width: 1250, height: 460 },
  "/projects/burunfarki/screenshot-honest-stats.png": { width: 2560, height: 660 },
  "/projects/choreia/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/gravita/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/jablab/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/lifeos/preview-onboarding-20261016.png": { width: 1206, height: 2622 },
  "/projects/lissom/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-course-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-written-lesson-20261016.png": { width: 1206, height: 2622 },
};
