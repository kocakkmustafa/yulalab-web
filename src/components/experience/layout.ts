import type { CameraPose, ExperienceMode, Vec3 } from "./types";

export type ProofLayoutPose = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

export type GlyphViewportPose = {
  offset: Vec3;
  scaleMultiplier: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * A continuous replacement for the old 767px composition switch. CSS may
 * still rearrange controls at a breakpoint, while the physical camera and Y
 * blend over a wider interval that a resized browser cannot visibly jump.
 */
export function viewportMobileMix(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0;
  return 1 - smoothstep((viewportWidth - 640) / 260);
}

/**
 * Keeps the broad Y inside portrait and near-square frustums without changing
 * the camera used by the room, wordmark and portfolio cards. Wide screens get
 * the reference's right-column object composition; compact screens move the Y
 * below the copy and use a lighter silhouette.
 */
export function glyphViewportPose(
  progress: number,
  aspect: number,
  viewportWidth = Number.POSITIVE_INFINITY,
): GlyphViewportPose {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const mobileMix = viewportMobileMix(viewportWidth);
  const viewportHeight = Number.isFinite(viewportWidth)
    ? viewportWidth / safeAspect
    : Number.POSITIVE_INFINITY;
  const shortMobileMix = mobileMix * (
    1 - smoothstep((viewportHeight - 640) / 200)
  );
  const compactMix = 1 - smoothstep((safeAspect - 1) / 0.35);
  const heroExit = smoothstep((clamp01(progress) - 0.04) / 0.045);
  const compositionStrength = 1 - heroExit;
  const proofRestore = smoothstep((clamp01(progress) - 0.505) / 0.07);
  const visionSettle = smoothstep((clamp01(progress) - 0.72) / 0.045);
  const visionRelease = smoothstep((clamp01(progress) - 0.805) / 0.05);
  const visionStrength = visionSettle * (1 - visionRelease);
  const mobilePortalSettle = smoothstep((clamp01(progress) - 0.805) / 0.02);
  const mobilePortalRelease = smoothstep((clamp01(progress) - 0.835) / 0.02);
  const mobilePortalStrength = mobilePortalSettle * (1 - mobilePortalRelease);
  const compactReduction = lerp(0.5, 0.24, mobileMix);
  const responsiveScale = 1 - compactReduction * compactMix * (1 - proofRestore);
  const openingScale = lerp(lerp(1.32, 1.45, mobileMix), 1, heroExit);
  // A tall narrow viewport needs a horizontal fit as well as the height fit.
  // Keep the larger reference composition inside 320x900 rather than clipping.
  const portraitFit = lerp(1, Math.min(1, safeAspect / 0.45), mobileMix * compositionStrength);
  const scaleMultiplier = responsiveScale * openingScale * portraitFit
    * (1 - 0.14 * shortMobileMix * compositionStrength)
    * (1 - 0.2 * mobileMix * mobilePortalStrength);
  const openingMobileY = (0.4 + 0.15 * mobileMix + 0.2 * shortMobileMix)
    * compactMix
    * compositionStrength;

  return {
    offset: [
      -1.05 * visionStrength * (1 - mobileMix),
      openingMobileY + 0.55 * mobileMix * mobilePortalStrength,
      0,
    ],
    scaleMultiplier,
  };
}

/**
 * Only the active transition pair needs decoded screenshot textures. Distant
 * cards use their deterministic branded surface until they approach focus,
 * avoiding an eight-product media barrier during the opening scene.
 */
export function shouldLoadPortfolioMedia(
  fieldOpacity: number,
  portfolioDistance: number,
  proofMorph: number,
): boolean {
  if (
    !Number.isFinite(fieldOpacity) ||
    !Number.isFinite(portfolioDistance) ||
    !Number.isFinite(proofMorph)
  ) {
    return false;
  }

  return fieldOpacity > 0.01 && Math.abs(portfolioDistance) < 1.35 && proofMorph < 0.25;
}

/**
 * Proof is a compact ledger, not the wide portfolio carousel. The mobile
 * 2x4 arrangement is deliberately separate because a portrait camera has
 * less than half the horizontal frustum of the desktop camera.
 */
export function proofLayoutPose(
  index: number,
  mode: ExperienceMode,
): ProofLayoutPose {
  if (mode === "mobile") {
    const column = index % 2;
    const row = Math.floor(index / 2);
    return {
      position: [(column - 0.5) * 0.8, (1.5 - row) * 0.74, -13.82 - row * 0.08],
      rotation: [(row - 1.5) * 0.012, 0, 0],
      scale: 0.19,
    };
  }

  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    position: [(column - 1.5) * 0.68, (0.5 - row) * 1.02, -13.82 - row * 0.12],
    rotation: [row === 0 ? -0.025 : 0.025, 0, 0],
    scale: 0.24,
  };
}

/** Keep the gallery's visual scale steady while the camera travels in depth.
 * Real registry images and branded fallbacks share the same bounded stage. */
export function portfolioViewportComposition(
  camera: CameraPose,
  viewportWidth: number,
  viewportHeight: number,
  focusPlane: number,
) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 1280;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 720;
  const mobileMix = viewportMobileMix(width);
  const compactHeight = 1 - smoothstep((height - 560) / 260);
  const lift = lerp(0.12, 0.2, Math.max(mobileMix, compactHeight));
  const depthSpan = camera.target[2] - camera.position[2];
  const alongView = Math.abs(depthSpan) > 0.001
    ? (focusPlane - camera.position[2]) / depthSpan
    : 1;
  const centerX = lerp(camera.position[0], camera.target[0], alongView);
  const axisY = lerp(camera.position[1], camera.target[1], alongView);
  const distance = Math.max(0.5, Math.hypot(
    camera.position[0] - centerX,
    camera.position[1] - axisY,
    camera.position[2] - focusPlane,
  ));
  const frustumHeight = 2 * distance * Math.tan(camera.fov * Math.PI / 360);
  const cardWidth = Math.min(
    frustumHeight * (width / height) * lerp(0.6, 0.8, mobileMix),
    frustumHeight * lerp(lerp(0.56, 0.4, compactHeight), 0.4, mobileMix) * 1.6,
  );
  return {
    center: [centerX, axisY + frustumHeight * lift, focusPlane] as Vec3,
    width: cardWidth,
    scale: cardWidth / 3.9,
    yaw: Math.atan2(camera.position[0] - centerX, camera.position[2] - focusPlane),
  };
}


/** Fit source media between the fixed navigation and value copy. Pixels here
 * are converted through the current camera frustum, so no camera pose changes.
 */
export function serviceViewportComposition(width: number, height: number, portal = false) {
  const mobile = width < 900;
  const mediaHeight = portal ? height * 0.76 : mobile ? Math.max(120, Math.min(height * 0.48, height - 350)) : height * 0.76;
  return {
    centerX: width * (portal ? 0.3 : mobile ? 0.5 : 0.33),
    centerY: portal ? height * 0.55 : mobile ? 150 + mediaHeight / 2 : height * 0.52,
    width: width * (portal ? 0.65 : mobile ? 0.9 : 0.58),
    height: mediaHeight,
  };
}


/** Size the actual portrait source, rather than fitting it inside a landscape poster. */
export function developmentViewportComposition(camera: CameraPose, width: number, height: number, focusPlane: number) {
  const base = portfolioViewportComposition(camera, width, height, focusPlane);
  const mobile = viewportMobileMix(width);
  const top = 76 + (1 - mobile) * 24;
  const imageHeight = Math.max(140, Math.min(height * (0.72 - mobile * 0.21), height - top - (mobile > 0.5 ? 270 : 90)));
  const centerY = top + imageHeight / 2;
  const depthSpan = camera.target[2] - camera.position[2];
  const alongView = (focusPlane - camera.position[2]) / depthSpan;
  const axisY = camera.position[1] + (camera.target[1] - camera.position[1]) * alongView;
  const distance = Math.hypot(base.center[0] - camera.position[0], axisY - camera.position[1], focusPlane - camera.position[2]);
  const viewHeight = 2 * distance * Math.tan(camera.fov * Math.PI / 360);
  return {
    center: [base.center[0] - (1 - mobile) * viewHeight * width / height * 0.16, axisY + viewHeight * (0.5 - centerY / height), focusPlane] as Vec3,
    width: viewHeight * 0.75,
    scale: viewHeight * imageHeight / height / 2.65,
    yaw: base.yaw,
  };
}
