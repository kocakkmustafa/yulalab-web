/**
 * Intrinsic pixel size of every capture the linear experience renders, so the
 * browser can reserve each image's box before its bytes arrive (no layout
 * shift while lazy images load). Generated from the PNG headers in public/;
 * tests/image-dimensions.test.ts fails when a capture is added or replaced
 * without updating this map.
 */
export const IMAGE_DIMENSIONS: Readonly<Record<string, { width: number; height: number }>> = {
  "/projects/braavolabs/design-preview-01-approval-queue.png": { width: 1500, height: 900 },
  "/projects/braavolabs/design-preview-02-activity-audit.png": { width: 1500, height: 900 },
  "/projects/braavolabs/design-preview-03-notifications-error.png": { width: 1500, height: 900 },
  "/projects/braavolabs/design-preview-04-settings-budget.png": { width: 1500, height: 900 },
  "/projects/braavolabs/design-preview-05-settings-approval-rules.png": { width: 1500, height: 900 },
  "/projects/lifeos/design-preview-01-onboarding.png": { width: 1170, height: 2532 },
  "/projects/lifeos/design-preview-02-today.png": { width: 1170, height: 2532 },
  "/projects/lifeos/design-preview-03-finance.png": { width: 1170, height: 2532 },
  "/projects/lifeos/design-preview-04-focus.png": { width: 1170, height: 2532 },
  "/projects/lifeos/design-preview-05-health-score.png": { width: 1170, height: 2532 },
  "/projects/lifeos/design-preview-06-habits.png": { width: 1170, height: 2532 },
  "/projects/choreia/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/gravita/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/jablab/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/lifeos/preview-onboarding-20261016.png": { width: 1206, height: 2622 },
  "/projects/lissom/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-course-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-native-20261016.png": { width: 1206, height: 2622 },
  "/projects/ostinato/preview-written-lesson-20261016.png": { width: 1206, height: 2622 },
};
