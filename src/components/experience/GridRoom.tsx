"use client";

import { HERO_CAM_CONFIG, HERO_PLANE_HEIGHT, heroSlot, heroWordmarkPlaneScale, resolveHeroCamMode } from "./hero-slot";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  Vector2,
  Vector4,
  type Texture,
} from "three";
import type { QualityTier, TimelineFrame } from "./types";
import { CARD_DEPTH_STEP, segmentProgress, smoothstep, STAGES } from "./timeline";
import { FLUID_PARAMS, fluidShared } from "./MouseFluid";
import { openingShared } from "./RefractGlass";
import { GROUND_SETS, resolveGroundWeights, resolveWallTint, WORLD_DARK_COLOR, WORLD_LIGHT_COLOR, type GroundSet } from "./theme";
import { glyphViewportPose, viewportMobileMix } from "./layout";

export type WallTitles = { works: string; service: string };

const ENGLISH_WALL_TITLES: WallTitles = { works: "WORKS", service: "SERVICE" };

export type GridRoomProps = {
  frame: TimelineFrame;
  tier: QualityTier;
  mediaTextures?: readonly Texture[];
  /** W7 Z09: one small picture per works card (null while loading); the selected card's picture paints the works ground. */
  worksTextures?: readonly (Texture | null)[];
  /** Wall titles in the visitor's language, already upper-cased. */
  wallTitles?: WallTitles;
};

/** Tile light: share of the flat room glow kept, floor and gain of the tile colour over the glow. */
const MOSAIC = { flat: 0.3, swing: 0.45, base: 0.012, gain: 0.2, lit: 0.08, flow: 0.15 } as const;
/** Share of the tile mosaic kept (in grey) over the portfolio ground. */
const PORTFOLIO_MOSAIC = 0.25;
/** W7 C6 measuring aid: `?bgFreeze=1` (or a time in seconds) stops the opening ground's pattern cycle. */
const BG_FREEZE: number | null = (() => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("bgFreeze");
  if (raw === null) return null;
  const value = Number(raw);
  // 3.5, not 3: at a whole second the 0.12 s black-out window is open and would dim the frozen frame for good.
  return Number.isFinite(value) && value > 1 ? value : 3.5;
})();
const KV_FADE = 3.0;
const FLUID_DISPLAY = FLUID_PARAMS.displayScale.toFixed(6);
const GROUND_GLSL = /* glsl */ `
  uniform float uMosaic; uniform float uMosaicGrey; uniform float uMosaicAspect; uniform float uMosaicTime; uniform float uKvFade;
  uniform sampler2D uFluid; uniform float uFluidMix;
  uniform sampler2D uWorksTexA; uniform sampler2D uWorksTexB; uniform float uWorksMix; uniform float uWorksAnim;
  float mosaicHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  // W7 Z06 (founder decision "a"): the opening ground cycles three patterns (blue, black and white, purple-ice-orange),
  // equal odds, never the same twice in a row, a new one about every 1.5 s (reference: every 1 to 2 s).
  // Pattern changes come at random intervals of 1 to 2 s: blocks of 6 s hold four segments whose lengths are
  // hash weights in [1,2], normalised to the block. Returns the global segment id and the fraction inside it.
  vec2 patternSegment(float t) {
    float block = floor(t / 6.0);
    float local = t - block * 6.0;
    vec4 w = 1.0 + vec4(mosaicHash(vec2(block, 41.0)), mosaicHash(vec2(block, 43.0)), mosaicHash(vec2(block, 47.0)), mosaicHash(vec2(block, 53.0)));
    w *= 6.0 / (w.x + w.y + w.z + w.w);
    float j = 0.0;
    float start = 0.0;
    float len = w.x;
    if (local >= w.x) { j = 1.0; start = w.x; len = w.y; }
    if (local >= w.x + w.y) { j = 2.0; start = w.x + w.y; len = w.z; }
    if (local >= w.x + w.y + w.z) { j = 3.0; start = w.x + w.y + w.z; len = w.w; }
    return vec2(block * 4.0 + j, (local - start) / len);
  }
  float groundPattern(float slot) {
    // W8 B4: opening segment always starts on pattern 0 (deep blue-purple mosaic) before cycling.
    if (slot < 1.5) return 0.0;
    float cur = floor(mosaicHash(vec2(slot, 7.0)) * 3.0);
    float prev = slot < 2.5 ? 0.0 : floor(mosaicHash(vec2(slot - 1.0, 7.0)) * 3.0);
    if (slot > 0.5 && cur == prev) cur = mod(cur + 1.0 + floor(mosaicHash(vec2(slot, 19.0)) * 2.0), 3.0);
    return min(cur, 2.0);
  }
  // W8 B1/B3 (REA section 1): p1 deep indigo-blue mosaic; p2 crisp architectural dark-graphite bands
  // without washing out the white wordmark; p3 #350FFD violet-blue field with localized #B2EDFF / #FD5F0C patches.
  vec3 patternLight(float pat, vec2 suv, vec2 p, float t) {
    if (pat < 0.5) return vec3(0.052, 0.036, 0.24);
    if (pat < 1.5) {
      float band = step(0.5, fract(dot(p, vec2(0.7, -0.7)) * 9.0 + floor(t * 0.67) * 0.37));
      return vec3(mix(0.002, 0.115, band));
    }
    vec2 np = suv * 2.2 + vec2(sin(t * 0.17), cos(t * 0.13)) * 0.35;
    float nw = smoothstep(0.56, 0.94, mosaicHash(floor(np * 3.0) + 1.7) * 0.65 + 0.35 * sin(np.x * 2.7 + np.y * 2.1 + t * 0.25));
    float ny = smoothstep(0.66, 0.98, mosaicHash(floor(np * 2.5) + 5.3) * 0.65 + 0.35 * cos(np.x * 2.3 - np.y * 2.9 - t * 0.21));
    vec3 baseViolet = vec3(0.042, 0.012, 0.30);
    vec3 ice = vec3(0.24, 0.54, 0.72);
    vec3 orange = vec3(0.42, 0.058, 0.006);
    vec3 c3 = mix(baseViolet, ice, nw * 0.45);
    return mix(c3, orange, ny * 0.42);
  }
  // Quad-tree tile mosaic of our own: every cell may split into four (up to four levels), big and small
  // square tiles side by side, each tile slowly changing between purple, ice blue and brick (linear RGB).
  // W7 Z06 t5: the black-out dims all the light of the ground, not only the tile layer (every 1 s, 0.12 s long).
  float groundBlackOut(float t) {
    float segPat = groundPattern(patternSegment(t).x);
    return segPat > 0.5 ? (0.6 + 0.4 * mosaicHash(vec2(floor(t), 11.0))) * step(fract(t), 0.12) : 0.0;
  }
  vec4 mosaicTiles(vec2 p, float t, float shift, vec2 suv, out vec3 litTone) {
    float scale = 3.0;
    vec2 cell = floor(p * scale);
    float level = 0.0;
    bool open = true;
    for (int l = 0; l < 2; l++) { // W7 Z06 t4: bigger tiles (about 90 to 360 px at 1080 px), at most two splits
      if (open) {
        if (mosaicHash(cell + level * 17.0) < 0.72) { scale *= 2.0; cell = floor(p * scale); level += 1.0; }
        else open = false;
      }
    }
    // W7 Z06: brief uv shifts (blue every 0.2 to 0.7 s, the other patterns every 0.1 to 5.1 s) and black-outs (every 1 s).
    float segPat = groundPattern(patternSegment(t).x);
    float shiftEvery = segPat < 0.5 ? 0.2 + 0.5 * mosaicHash(vec2(floor(t), 5.0)) : 0.1 + 5.0 * mosaicHash(vec2(floor(t), 6.0));
    float shiftIdx = floor(t / shiftEvery);
    vec2 uvJump = (vec2(mosaicHash(vec2(shiftIdx, 8.0)), mosaicHash(vec2(shiftIdx, 9.0))) - 0.5) * 0.02 * step(fract(t / shiftEvery), 0.2);
    vec2 id = cell + level * 131.0 + floor(uvJump * scale * 8.0);
    float phase = t * 0.95 + mosaicHash(id + 3.7) * 6.0;
    float k = floor(phase);
    float f = smoothstep(0.7, 1.0, fract(phase));
    vec2 seg = patternSegment(t);
    float pat = groundPattern(seg.x);
    float prevPat = groundPattern(seg.x - 1.0);
    vec3 tone = mix(patternLight(prevPat, suv, p, t), patternLight(pat, suv, p, t), smoothstep(0.0, 0.12, seg.y));
    float lum = mosaicHash(id + k * 1.31 + 9.1);
    lum = mix(lum, mosaicHash(id + (k + 1.0) * 1.31 + 9.1), f);
    vec2 local = fract(p * scale);
    float edge = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
    float seam = smoothstep(0.0, 0.045, edge);
    // W7 Z06 t4: the colour is a screen-space light field (patternLight); a tile only moves its brightness by about
    // +-20 % and keeps a thin grid line. The stripes ignore the tiles. No tile is lit in a colour of its own.
    float stripeOnly = step(0.5, pat) * step(pat, 1.5);
    float tileGain = mix((1.0 + 0.18 * (lum - 0.5)) * (1.0 + 0.05 * (1.0 - seam)), 1.0, stripeOnly); // W7 Z06 t5: +-9 % brightness, grid line +5 %
    litTone = vec3(0.0);
    return vec4(tone * tileGain, (0.5 + 0.5 * smoothstep(0.0, 0.8, lum) + 1.3 * smoothstep(0.8, 1.0, lum)) * mix(0.5, 1.0, seam));
  }
  vec3 groundColorBase(vec2 uv, vec3 edge, vec3 mid, vec3 peak, vec4 centre, vec4 spread) {
    // W7 C9: the flow bend is taken first, so the room grounds (they return early below) bend like the hero does.
    vec2 bendTop = texture2D(uFluid, uv).xy * ${FLUID_DISPLAY} * 0.02 * uFluidMix;
    float bendTopLen = length(bendTop);
    if (bendTopLen > 0.025) bendTop *= 0.025 / bendTopLen;
    vec2 d = uv - bendTop - centre.xy;
    float wide = exp(-(d.x * d.x / spread.x + d.y * d.y / spread.y));
    vec2 e = uv - bendTop - centre.zw;
    float narrow = exp(-(e.x * e.x / spread.z + e.y * e.y / spread.w));
    vec3 steady = edge + (mid - edge) * wide + (peak - mid) * narrow * wide;
    // W7 F1/F7: the mouse flow lights every ground, not only the hero mosaic.
    vec2 flowAll = texture2D(uFluid, uv).xy * uFluidMix;
    steady += vec3(0.8, 0.85, 1.0) * length(flowAll) * 0.08; // W7 C8: the flow bends the ground instead of lighting it; the added light is 20 % of the C tur 3 value
    if (uMosaic < 0.001) return steady;
    float glow = clamp(wide * 0.8 + narrow * wide * 0.6, 0.0, 1.0);
    // Mouse fluid: the tiles drift with the flow and their colours slide along the palette where it moves.
    vec2 flow = texture2D(uFluid, uv).xy * ${FLUID_DISPLAY};
    vec3 litTone;
    // W7 C8: the reference trail BENDS the ground (stripes curl along the trail, the grid warps): the flow velocity is a UV
    // shift of the whole pattern (about 10 to 30 px, capped), no white glow band.
    vec2 bend = flow * 0.02 * uFluidMix;
    float bendLen = length(bend);
    if (bendLen > 0.025) bend *= 0.025 / bendLen;
    vec2 buv = uv - bend;
    vec4 mosaic = mosaicTiles((buv - 0.5) * vec2(uMosaicAspect, 1.0), uMosaicTime, (flow.x + flow.y * 0.6) * 0.45 * uFluidMix, buv, litTone);
    // In the portfolio the tiles stay, but in greys (the reference works ground is black/grey).
    litTone = mix(litTone, vec3(dot(litTone, vec3(0.3, 0.5, 0.2))), uMosaicGrey);
    mosaic.rgb = mix(mosaic.rgb, vec3(dot(mosaic.rgb, vec3(0.3, 0.5, 0.2))), uMosaicGrey);
    float stir = length(flow) * uFluidMix * (1.0 - uMosaicGrey);
    vec3 stirTint = 0.5 + 0.5 * cos(6.2832 * (atan(flow.y, flow.x) / 6.2832 + vec3(0.0, 0.33, 0.67)));
    // W7 Z06 t4: the opening is a light field (the portfolio grey mosaic keeps the old dim tile gate).
    float tileGate = mix(0.5 * (${MOSAIC.base.toFixed(3)} + ${MOSAIC.gain.toFixed(3)} * glow * glow) * 2.6, 0.62, 1.0 - uMosaicGrey);
    vec3 tiles = mosaic.rgb * tileGate * (1.0 + length(flow) * 0.16 * uFluidMix); // W7 C8: flow light x0.2
    float groundPat = groundPattern(patternSegment(uMosaicTime).x);
    // W8 B1/B2/B3: aspect-aware radial falloff that keeps portrait/mobile edges dark as well as desktop,
    // plus REA section 1 symmetric corner vignette smoothstep(0.50, 0.06, len) so all four corners <= 6 luma.
    vec2 aspectScale = uMosaicAspect >= 1.0
      ? vec2(uMosaicAspect, 1.0)
      : vec2(1.0, 1.0 / max(uMosaicAspect, 0.42));
    tiles *= mix(1.0, groundPat > 1.5 ? 0.18 : 0.04, smoothstep(0.0, 0.52, length((uv - vec2(0.48, 0.48)) * aspectScale * 0.78)));
    float steadyWeight = groundPat < 0.5 ? 0.42 : (groundPat < 1.5 ? 0.22 : 0.36);
    vec3 steadyUsed = groundPat > 0.5 && groundPat < 1.5 ? mix(steady, vec3(dot(steady, vec3(0.3, 0.5, 0.2))), 0.9) : steady;
    vec3 tiled = steadyUsed * (${MOSAIC.flat.toFixed(3)} + ${MOSAIC.swing.toFixed(3)} * mosaic.a) * steadyWeight + tiles
      + litTone * (${MOSAIC.lit.toFixed(3)} * (groundPat > 1.5 ? 1.0 : 0.65)) * (1.0 + stir * 3.0);
    // W8 B3: keep mobile portrait ground moody like the reference SP layout (cell average <= 25, corners <= 10).
    float mobileCalm = mix(1.0, 0.28, clamp((1.0 - uMosaicAspect) * 1.6, 0.0, 1.0) * (1.0 - uMosaicGrey));
    tiled *= mobileCalm;
    float cornerFall = smoothstep(0.47, 0.06, length(uv - 0.5));
    cornerFall *= mix(1.0, 0.45, smoothstep(0.52, 0.92, uv.x));
    tiled *= 1.0 - groundBlackOut(uMosaicTime);
    tiled = mix(steady * 0.22 * mobileCalm, tiled, uKvFade);
    return mix(steady, tiled, uMosaic) * mix(1.0, cornerFall, uMosaic);
  }

  // W7 Z09 (founder decision "a"): in the works section the selected card's picture is tiled over the screen,
  // blurred (0.03), colour saturation x2, with a tile vignette that opens from 1.9 to 0.1 while the card changes.
  vec3 worksTile(sampler2D tex, vec2 tuv, float vig) {
    float b = 0.06; // the picture itself is already a 24 px patch; these taps blur it further
    vec3 c = texture2D(tex, tuv).rgb * 0.36
      + (texture2D(tex, clamp(tuv + vec2(b, 0.0), 0.0, 1.0)).rgb + texture2D(tex, clamp(tuv - vec2(b, 0.0), 0.0, 1.0)).rgb
      + texture2D(tex, clamp(tuv + vec2(0.0, b), 0.0, 1.0)).rgb + texture2D(tex, clamp(tuv - vec2(0.0, b), 0.0, 1.0)).rgb) * 0.16;
    float luma = dot(c, vec3(0.3, 0.5, 0.2));
    c = clamp(mix(vec3(luma), c, 0.6), 0.0, 1.0); // W7 Z09 t3: luma mix 0.6, saturation about 0.32 (the reference's, not HSV x2)
    float v = length(tuv - 0.5) * 2.0;
    return c * (1.0 - clamp(v * vig * 0.5, 0.0, 1.0));
  }
  vec3 worksField(vec2 uv) {
    vec2 tuv = fract((uv - 0.5) * vec2(uMosaicAspect, 1.0) * 2.4 + 0.5);
    vec3 next = worksTile(uWorksTexA, tuv, mix(1.9, 0.1, uWorksAnim));
    vec3 prev = worksTile(uWorksTexB, tuv, 0.1);
    // W7 Z09 t2: the card stays the star: a dim, very blurred patch with a strong screen vignette (corners black).
    float vig = smoothstep(0.55, 0.05, length(uv - 0.5));
    vec3 c = mix(prev, next, uWorksAnim) * 0.32 * vig * vig; // W7 Z09 t3: squared vignette; gain 0.32 (t4: 0.30 plus the floor cut below)
    c = max(c - 0.03, 0.0); // W7 Z09 t4: a fixed black floor, independent of the vignette
    float outLuma = dot(c, vec3(0.3, 0.5, 0.2));
    return mix(vec3(outLuma), c, 0.55); // W7 Z09 t4: saturation about 0.32, applied to the final light
  }
  vec3 groundColor(vec2 uv, vec3 edge, vec3 mid, vec3 peak, vec4 centre, vec4 spread) {
    vec3 base = groundColorBase(uv, edge, mid, peak, centre, spread);
    return uWorksMix > 0.001 ? mix(base, worksField(uv), uWorksMix) : base;
  }
`;

const ROOM_VERTEX_SHADER =/* glsl */ `
  varying vec2 vUv;
  varying float vViewDepth;
  varying float vFacing;
  varying vec4 vClipPosition;

  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDepth = -viewPosition.z;
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-viewPosition.xyz)));
    gl_Position = projectionMatrix * viewPosition;
    vClipPosition = gl_Position;
  }
`;

const ROOM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uWhiteMix; uniform float uOpacity; uniform float uGalleryMix;
  uniform vec3 uBackgroundColor; uniform float uReadingMix; uniform float uHeroMix; uniform float uCompactMix; uniform vec3 uWallTint;
  uniform vec3 uGEdge; uniform vec3 uGMid; uniform vec3 uGPeak; uniform vec4 uGCenter; uniform vec4 uGSpread; uniform vec3 uGEdgeL; uniform vec3 uGMidL; uniform vec3 uGPeakL; uniform vec4 uGCenterL; uniform vec4 uGSpreadL; uniform float uGroundMix; uniform float uGroundLight; uniform vec2 uAspect;
  uniform float uTime; uniform sampler2D uProjectionA; uniform sampler2D uProjectionB;
  uniform sampler2D uWorksTitle; uniform sampler2D uServiceTitle;
  uniform float uProjectionMix; uniform float uProjectionBlend; uniform float uServiceTitleMix;
  varying vec2 vUv; varying float vViewDepth; varying float vFacing; varying vec4 vClipPosition;
  float gridLine(vec2 uv, vec2 density) {
    vec2 coordinate = uv * density;
    vec2 derivative = max(fwidth(coordinate), vec2(0.0001));
    vec2 distanceToLine = abs(fract(coordinate - 0.5) - 0.5) / derivative;
    return 1.0 - min(min(distanceToLine.x, distanceToLine.y), 1.0);
  }
  float titleMask(sampler2D atlas, vec2 point) {
    float bounds = step(0.0, point.x) * step(point.x, 1.0) * step(0.0, point.y) * step(point.y, 1.0);
    return texture2D(atlas, clamp(point, 0.0, 1.0)).a * bounds;
  }
  ${GROUND_GLSL}
  void main() {
    // W7 C9: the room grid curls with the mouse trail (a fraction of a cell), like the reference's warped grid.
    vec2 gridScreen = vClipPosition.xy / vClipPosition.w * 0.5 + 0.5;
    vec2 gridBend = texture2D(uFluid, gridScreen).xy * ${FLUID_DISPLAY} * 0.02 * uFluidMix;
    float gridBendLen = length(gridBend);
    if (gridBendLen > 0.025) gridBend *= 0.025 / gridBendLen;
    vec2 bUv = vUv - gridBend * 0.35;
    float fine = gridLine(bUv, vec2(128.0, 107.0));
    float major = gridLine(bUv, vec2(48.2, 107.0));
    vec2 tile = bUv * vec2(48.2, 107.0);
    vec2 cell = floor(tile);
    vec2 local = fract(tile);
    float cellTone = fract(sin(dot(cell, vec2(17.13, 71.7))) * 43758.5453);
    float joint = smoothstep(0.0, 0.035, min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y)));
    float wallLight = 0.45 + 0.55 * pow(vFacing, 0.7);

    // Original architectural light panels, drawn in the opaque curved wall as
    // a low-resolution emitter display: the bands are sampled on the emitter
    // grid, so their edges step like real LED panels instead of a soft
    // gradient. They also become the real background sampled by the glass.
    vec2 emitterGrid = vec2(768.0, 384.0);
    vec2 emitterCell = floor(vUv * emitterGrid);
    vec2 emitterUv = (emitterCell + 0.5) / emitterGrid;
    float emitterTone = fract(sin(dot(emitterCell, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 roomPoint = (emitterUv - vec2(0.53, 0.5)) * vec2(5.0, 3.2);
    float envelope = exp(-dot(roomPoint, roomPoint) * 0.42);
    // Each panel shifts the band a little, so the stripes break at the panel
    // joints like a mosaic; per-emitter jitter roughens the stepped edge.
    float diagonal = emitterUv.x * 11.0 + emitterUv.y * 5.2 + (cellTone - 0.5) * 0.22;
    float beam = step(abs(fract(diagonal) - 0.5), 0.17 + (emitterTone - 0.5) * 0.05);
    float bay = smoothstep(0.1, 0.2, cellTone) * (0.55 + cellTone * 0.45);
    float panel = beam * envelope * bay * joint * 0.0;
    float breath = 0.98 + 0.02 * sin(uTime * 0.12);
    vec3 color = vec3(0.0006) + vec3(mix(0.002, 0.008, cellTone)) * envelope;
    // Narrow screens see more of the wall at once; keep it a backdrop there.
    // The wall steps back behind the product screens, as it does on mobile.
    float wallLevel = (0.72 - uCompactMix * 0.34) * (1.0 - uGalleryMix * 0.5) * (1.0 - uProjectionMix * 0.55);
    color += vec3(wallLevel) * panel * breath * (0.86 + emitterTone * 0.14);
    color *= wallLight * uWallTint;

    // Each emitter is a round dot with a dark gap. Once a dot is smaller than
    // a screen pixel the pattern fades to its average instead of aliasing.
    vec2 emitterLocal = fract(vUv * emitterGrid) - 0.5;
    vec2 emitterFootprint = fwidth(vUv * emitterGrid);
    // Far: dots below a pixel average out. Near (closing shot): dots wider
    // than ~16px read as a print screen, so they settle into a flat panel.
    float emitterSize = max(emitterFootprint.x, emitterFootprint.y);
    float emitterDetail = (1.0 - smoothstep(0.35, 0.8, emitterSize)) * smoothstep(0.03, 0.07, emitterSize);
    float emitterDot = 1.0 - smoothstep(0.28, 0.48, length(emitterLocal));
    color *= mix(0.72, 0.42 + emitterDot * 0.7, emitterDetail);

    // The cylinder's interior reverses horizontal UVs. Correct projected text
    // and media in this pass; none of these textures come from the reference.
    vec2 wallUv = vec2(1.0 - vUv.x, vUv.y);
    vec2 titleUv = (wallUv - vec2(0.26, 0.40)) * vec2(2.4, 5.0);
    float works = titleMask(uWorksTitle, titleUv);
    float service = titleMask(uServiceTitle, titleUv);
    float wallTitle = mix(works * uGalleryMix, service, uServiceTitleMix);
    color += vec3(0.21) * wallTitle * joint * (0.55 + envelope * 0.45) * (1.0 - uProjectionMix * 0.65);

    // Borrow only broad color from the owned media. The foreground keeps the
    // complete readable guest screen; the wall no longer repeats its UI/text.
    vec2 mediaUv = (floor(wallUv * vec2(6.0, 3.0)) + 0.5) / vec2(6.0, 3.0);
    vec3 projection = mix(texture2D(uProjectionA, mediaUv).rgb, texture2D(uProjectionB, mediaUv).rgb, uProjectionBlend);
    float screenBay = joint * (0.28 + 0.72 * bay) * (0.35 + envelope * 0.65);
    color = mix(color, projection * 0.075 + color * 0.8, uProjectionMix * screenBay * (1.0 - wallTitle * 0.65));
    color = mix(color, vec3(0.012), fine * 0.10);
    color *= 1.0 - major * 0.65;
    // W7 Z12: the plus lattice is its own coarser grid (about 92 x 182 px).
    vec2 crossPoint = abs(fract(vUv * vec2(67.0, 19.7)) - 0.5);
    float cross = max(step(crossPoint.x, 0.005) * step(crossPoint.y, 0.035), step(crossPoint.y, 0.005) * step(crossPoint.x, 0.035));
    color += vec3(cross * 0.03);
    // Divide interpolated clip coordinates in the fragment, so the reading
    // column matches in both full-size and scaled transmission render targets.
    vec2 screenUv = vClipPosition.xy / vClipPosition.w * 0.5 + 0.5;
    float readingColumn = smoothstep(0.53, 0.66, screenUv.x) * (1.0 - smoothstep(0.94, 1.0, screenUv.x));
    float readingHeight = smoothstep(0.10, 0.22, screenUv.y) * (1.0 - smoothstep(0.86, 0.96, screenUv.y));
    color *= 1.0 - readingColumn * readingHeight * uReadingMix * max(max(uGalleryMix, uProjectionMix), uHeroMix * 0.75) * 0.8;
    // The gallery caption sits low on the leading side; keep the stepped
    // bands from running bright behind its body copy.
    float captionArea = (1.0 - smoothstep(0.42, 0.6, screenUv.x)) * (1.0 - smoothstep(0.4, 0.58, screenUv.y));
    color *= 1.0 - captionArea * uReadingMix * uGalleryMix * 0.78;
    color = mix(color, vec3(0.62), uWhiteMix * 0.7);
    float fade = (1.0 - smoothstep(60.0, 110.0, vViewDepth)) * smoothstep(0.0, 0.03, vUv.y) * (1.0 - smoothstep(0.97, 1.0, vUv.y));
    float alpha = (0.65 + fine * 0.16 + major * 0.12) * fade * uOpacity;
    vec3 base = mix(uBackgroundColor, color, clamp(alpha, 0.0, 1.0));
    // W7 C tur 5 V3: the room surfaces read the mouse flow like the hero ground does.
    // W7 C8: the room no longer adds light from the flow (it was the saturated white strip); the ground bends instead.
    vec3 gDark = groundColor(screenUv, uGEdge, uGMid, uGPeak, uGCenter, uGSpread);
    vec3 gLight = groundColor(screenUv, uGEdgeL, uGMidL, uGPeakL, uGCenterL, uGSpreadL);
    // W8 B2/B3/B6: REA section 2 grid alpha ~0.10 in sRGB (~0.0065-0.0085 linear) with corner vignette so corners <= 6 luma.
    float lineVig = mix(1.0, smoothstep(0.52, 0.12, length(screenUv - 0.5)), uHeroMix);
    vec3 lines = vec3(fine * 0.0048 + major * 0.0090 + cross * 0.026) * lineVig;
    vec3 ground = mix(gDark, gLight, uGroundLight) + lines * (1.0 - uGroundLight * 0.6);
    gl_FragColor = vec4(mix(base, ground, uGroundMix), 1.0);
    #include <colorspace_fragment>
  }
`;

const WHITE_RISE_FRAGMENT = /* glsl */ `
  uniform float uRise; uniform float uOpacity; uniform vec2 uViewport; uniform vec3 uColor;
  uniform vec3 uGEdgeL; uniform vec3 uGMidL; uniform vec3 uGPeakL; uniform vec4 uGCenterL; uniform vec4 uGSpreadL;
  varying vec2 vUv;
  ${GROUND_GLSL}
  float line(vec2 point, vec2 spacing) {
    vec2 coordinate = point / spacing;
    vec2 distance = abs(fract(coordinate - 0.5) - 0.5) / max(fwidth(coordinate), vec2(0.0001));
    return 1.0 - min(min(distance.x, distance.y), 1.0);
  }
  void main() {
    float bend = pow((vUv.x - 0.5) * 2.0, 2.0) * 0.06;
    float edge = -0.12 + uRise * 1.3 + bend;
    float mask = 1.0 - smoothstep(edge - 0.004, edge + 0.004, vUv.y);
    vec2 pixel = vUv * uViewport;
    float grid = line(pixel, vec2(22.0));
    vec2 crossPoint = abs(mod(pixel, 180.0) - 90.0);
    float cross = max(step(crossPoint.x, 0.7) * step(crossPoint.y, 6.0), step(crossPoint.y, 0.7) * step(crossPoint.x, 6.0));
    float major = line(pixel, vec2(180.0));
    vec2 roomPoint = (vUv - vec2(0.44, 0.57)) * vec2(uViewport.x / max(1.0, uViewport.y), 1.0);
    float vignette = smoothstep(0.1, 1.25, length(roomPoint));
    float paper = fract(sin(dot(floor(pixel), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    vec3 color = groundColor(vUv, uGEdgeL, uGMidL, uGPeakL, uGCenterL, uGSpreadL) + vec3(paper * 0.004);
    color = mix(color, vec3(0.32), grid * 0.078 + major * 0.025 + cross * 0.22);
    // W7 Z01-b: the leading edge of the wipe is white (L >= 200) from the start.
    float lead = smoothstep(edge - 0.09, edge - 0.004, vUv.y);
    // W7 Z01-b (tur 5): the fill is the light-section colour from the first row, not grey until full coverage.
    color = mix(color, vec3(0.66), lead);
    gl_FragColor = vec4(color, mask * uOpacity);
    #include <colorspace_fragment>
  }
`;

const BACKDROP_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uGEdge; uniform vec3 uGMid; uniform vec3 uGPeak; uniform vec4 uGCenter; uniform vec4 uGSpread;
  uniform vec3 uGEdgeL; uniform vec3 uGMidL; uniform vec3 uGPeakL; uniform vec4 uGCenterL; uniform vec4 uGSpreadL;
  uniform float uGroundMix; uniform float uGroundLight; uniform vec3 uBackgroundColor;
  varying vec2 vUv;
  ${GROUND_GLSL}
  void main() {
    vec3 gDark = groundColor(vUv, uGEdge, uGMid, uGPeak, uGCenter, uGSpread);
    vec3 gLight = groundColor(vUv, uGEdgeL, uGMidL, uGPeakL, uGCenterL, uGSpreadL);
    gl_FragColor = vec4(mix(uBackgroundColor, mix(gDark, gLight, uGroundLight), uGroundMix), 1.0);
    #include <colorspace_fragment>
  }
`;

function resolveDisplayFontFamily(): string {
  if (typeof document !== "undefined") {
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    if (cssVar) return `${cssVar}, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  }
  return '"Hanken Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
}

function drawWordmarkCanvas(
  canvas: HTMLCanvasElement,
  label: string,
  skipFirstLetter: boolean,
  blurPx = 0,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  if (blurPx > 0 && "filter" in context) {
    context.filter = `blur(${blurPx}px)`;
  }
  context.fillStyle = "#ffffff";
  const fontPx = Math.round(canvas.height * (340 / 512));
  context.font = `600 ${fontPx}px ${resolveDisplayFontFamily()}`;
  context.textBaseline = "middle";
  const centreY = canvas.height / 2 + Math.round(canvas.height * (12 / 512));
  const maxWidth = canvas.width * 0.92;
  if (skipFirstLetter) {
    const full = context.measureText(label).width;
    const firstWidth = context.measureText(label.slice(0, 1)).width;
    const fit = Math.min(1, maxWidth / full);
    const start = (canvas.width - full * fit) / 2;
    context.textAlign = "left";
    context.fillText(label.slice(1), start + firstWidth * fit, centreY, (full - firstWidth) * fit);
    if (blurPx === 0) {
      const cap = context.measureText("U");
      heroSlot.x = (start + (firstWidth * fit) / 2 - canvas.width / 2) / canvas.width;
      const capTop = centreY - cap.actualBoundingBoxAscent;
      const capBottom = centreY + cap.actualBoundingBoxDescent;
      heroSlot.cap = (capBottom - capTop) / canvas.height;
      heroSlot.y = (canvas.height / 2 - (capTop + capBottom) / 2) / canvas.height;
    }
  } else {
    context.textAlign = "center";
    context.fillText(label, canvas.width / 2, centreY, maxWidth);
  }
  context.restore();
}

function makeWordmarkTexture(label: string, skipFirstLetter = false, highRes = false): CanvasTexture {
  const canvas = document.createElement("canvas");
  // W8 Q4: 4096x2048 hero wordmark texture (<=1.0x magnification on 2160px desktop, trilinear mipmaps on mobile).
  canvas.width = highRes ? 4096 : 2048;
  canvas.height = highRes ? 2048 : 1024;
  drawWordmarkCanvas(canvas, label, skipFirstLetter, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  if (typeof document !== "undefined" && document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      drawWordmarkCanvas(canvas, label, skipFirstLetter, 0);
      texture.needsUpdate = true;
    });
  }
  return texture;
}

function makeWordmarkHaloTexture(label: string, skipFirstLetter: boolean): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  drawWordmarkCanvas(canvas, label, skipFirstLetter, 16);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  if (typeof document !== "undefined" && document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      drawWordmarkCanvas(canvas, label, skipFirstLetter, 16);
      texture.needsUpdate = true;
    });
  }
  return texture;
}

function makeLineGeometry(positions: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
}

function ClosingGeometry({ draw }: { draw: number }) {
  const geometries = useMemo(() => {
    const grid: number[] = [];
    for (let index = -5; index <= 5; index += 1) {
      const offset = index * 0.72;
      grid.push(-3.6, offset, 0, 3.6, offset, 0);
      grid.push(offset, -3.6, 0, offset, 3.6, 0);
    }

    const axes = makeLineGeometry([
      -5.2, 0, 0, 5.2, 0, 0,
      0, -4.4, 0, 0, 4.4, 0,
      0, 0, -2.2, 0, 0, 2.2,
    ]);
    const gridGeometry = makeLineGeometry(grid);
    const circle = new BufferGeometry().setFromPoints(
      Array.from({ length: 97 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        return new Vector3(Math.cos(angle) * 2.55, Math.sin(angle) * 2.55, 0);
      }),
    );

    return { axes, grid: gridGeometry, circle };
  }, []);

  useEffect(
    () => () => {
      geometries.axes.dispose();
      geometries.grid.dispose();
      geometries.circle.dispose();
    },
    [geometries],
  );

  const scale = Math.max(0.0001, draw);

  return (
    <group position={[-2.2, 0, -36.3]} scale={[scale, scale, 1]}>
      <lineSegments geometry={geometries.grid}>
        <lineBasicMaterial
          color="#4c4652"
          depthWrite={false}
          opacity={draw * 0.36}
          transparent
        />
      </lineSegments>
      <lineSegments geometry={geometries.axes}>
        <lineBasicMaterial
          color="#17131b"
          depthWrite={false}
          opacity={draw * 0.88}
          transparent
        />
      </lineSegments>
      <lineLoop geometry={geometries.circle}>
        <lineBasicMaterial
          color="#aa36c9"
          depthWrite={false}
          opacity={draw * 0.76}
          transparent
        />
      </lineLoop>
    </group>
  );
}

const GROUND_DARK_ENTRIES = (["hero", "portfolio", "proof", "night", "closing"] as const).map(
  (key) => [key, GROUND_SETS[key]] as const,
);
const groundScratch = new Color();

function blendGround(
  edge: Color, mid: Color, peak: Color, centre: Vector4, spread: Vector4,
  entries: ReadonlyArray<readonly [number, GroundSet]>, total: number,
) {
  edge.setRGB(0, 0, 0); mid.setRGB(0, 0, 0); peak.setRGB(0, 0, 0);
  centre.set(0, 0, 0, 0); spread.set(0, 0, 0, 0);
  for (const [weight, set] of entries) {
    const w = weight / total;
    if (w <= 0) continue;
    edge.add(groundScratch.set(set.edge).multiplyScalar(w));
    mid.add(groundScratch.set(set.mid).multiplyScalar(w));
    peak.add(groundScratch.set(set.peak).multiplyScalar(w));
    centre.x += set.centre[0] * w; centre.y += set.centre[1] * w; centre.z += set.centre[2] * w; centre.w += set.centre[3] * w;
    spread.x += set.spread[0] * w; spread.y += set.spread[1] * w; spread.z += set.spread[2] * w; spread.w += set.spread[3] * w;
  }
}

/** cubic-bezier(.01, .68, .19, 1) (the reference's works block curve), solved by bisection on x. */
function worksEase(x: number): number {
  const [x1, y1, x2, y2] = [0.01, 0.68, 0.19, 1];
  const bez = (a: number, b: number, c: number, t: number) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t * c;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (bez(x1, x2, 1, mid) < x) lo = mid; else hi = mid;
  }
  return bez(y1, y2, 1, (lo + hi) / 2);
}

export function GridRoom({ frame, tier, mediaTextures, worksTextures, wallTitles = ENGLISH_WALL_TITLES }: GridRoomProps) {
  const renderer = useThree((state) => state.gl);
  const viewport = useThree((state) => state.size);
  const viewportWidth = viewport.width;
  const mobileMix = viewportMobileMix(viewportWidth);
  const heroLift = glyphViewportPose(frame.progress, viewport.width / Math.max(1, viewport.height), viewport.width).offset[1] * frame.overlay.hero;
  const planeScale = heroWordmarkPlaneScale(viewport.width, viewport.height, mobileMix);
  const wordmarkWidth = 14.2 * planeScale;
  const wordmarkHeight = HERO_PLANE_HEIGHT * planeScale;
  const camMode = useMemo(() => resolveHeroCamMode(), []);
  const skipFirstLetter = HERO_CAM_CONFIG[camMode].skipFirstLetter;
  const roomColors = useMemo(() => ({
    dark: new Color(WORLD_DARK_COLOR),
    light: new Color(WORLD_LIGHT_COLOR),
  }), []);
  const yulaWordmark = useMemo(() => makeWordmarkTexture("YULA", skipFirstLetter, true), [skipFirstLetter]);
  const yulaHalo = useMemo(() => makeWordmarkHaloTexture("YULA", skipFirstLetter), [skipFirstLetter]);
  const worksWordmark = useMemo(() => makeWordmarkTexture(wallTitles.works), [wallTitles.works]);
  const serviceWordmark = useMemo(() => makeWordmarkTexture(wallTitles.service), [wallTitles.service]);
  useEffect(() => {
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    yulaWordmark.anisotropy = maxAniso;
    worksWordmark.anisotropy = maxAniso;
    serviceWordmark.anisotropy = maxAniso;
    yulaWordmark.needsUpdate = true;
  }, [renderer, serviceWordmark, worksWordmark, yulaWordmark]);
  const gridMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uWhiteMix: { value: 0 },
          uOpacity: { value: 1 },
          uBackgroundColor: { value: new Color(WORLD_DARK_COLOR) },
          uReadingMix: { value: 0 },
          uHeroMix: { value: 0 },
          uCompactMix: { value: 0 },
          uWallTint: { value: new Vector3(1, 1, 1) },
          uGEdge: { value: new Color() }, uGMid: { value: new Color() }, uGPeak: { value: new Color() },
          uGCenter: { value: new Vector4() }, uGSpread: { value: new Vector4(1, 1, 1, 1) },
          uGEdgeL: { value: new Color() }, uGMidL: { value: new Color() }, uGPeakL: { value: new Color() },
          uGCenterL: { value: new Vector4() }, uGSpreadL: { value: new Vector4(1, 1, 1, 1) },
          uGroundMix: { value: 0 }, uGroundLight: { value: 0 }, uAspect: { value: new Vector2(1, 1) },
          uMosaic: { value: 0 }, uMosaicGrey: { value: 0 }, uMosaicAspect: { value: 1 }, uMosaicTime: { value: 0 }, uKvFade: { value: 1 },
          uFluid: { value: null }, uFluidMix: { value: 0 },
          uWorksTexA: { value: null }, uWorksTexB: { value: null }, uWorksMix: { value: 0 }, uWorksAnim: { value: 1 },
          uGalleryMix: { value: 0 }, uTime: { value: 0 },
          uProjectionA: { value: null }, uProjectionB: { value: null },
          uWorksTitle: { value: worksWordmark }, uServiceTitle: { value: serviceWordmark },
          uProjectionMix: { value: 0 }, uProjectionBlend: { value: 0 }, uServiceTitleMix: { value: 0 },
        },
        vertexShader: ROOM_VERTEX_SHADER,
        fragmentShader: ROOM_FRAGMENT_SHADER,
        transparent: false,
        depthWrite: true,
        side: BackSide,
        toneMapped: false,
      }),
    [serviceWordmark, worksWordmark],
  );
  // Screen-filling ground light behind the room: it carries the scene where the
  // wall does not reach (the camera looks past the cylinder's open end).
  const backdropMaterial = useMemo(() => {
    const shared = gridMaterial.uniforms;
    return new ShaderMaterial({
      uniforms: {
        uGEdge: shared.uGEdge, uGMid: shared.uGMid, uGPeak: shared.uGPeak, uGCenter: shared.uGCenter, uGSpread: shared.uGSpread,
        uGEdgeL: shared.uGEdgeL, uGMidL: shared.uGMidL, uGPeakL: shared.uGPeakL, uGCenterL: shared.uGCenterL, uGSpreadL: shared.uGSpreadL,
        uGroundMix: shared.uGroundMix, uGroundLight: shared.uGroundLight, uBackgroundColor: shared.uBackgroundColor,
        uMosaic: shared.uMosaic, uMosaicGrey: shared.uMosaicGrey, uMosaicAspect: shared.uMosaicAspect, uMosaicTime: shared.uMosaicTime, uKvFade: shared.uKvFade,
        uFluid: shared.uFluid, uFluidMix: shared.uFluidMix,
        uWorksTexA: shared.uWorksTexA, uWorksTexB: shared.uWorksTexB, uWorksMix: shared.uWorksMix, uWorksAnim: shared.uWorksAnim,
      },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }",
      fragmentShader: BACKDROP_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
  }, [gridMaterial]);
  const bladeMaterial = useMemo(() => new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(WORLD_LIGHT_COLOR) },
      uRise: { value: 0 },
      uOpacity: { value: 0 },
      uViewport: { value: new Vector2() },
      uGEdgeL: { value: new Color(GROUND_SETS.light.edge) },
      uGMidL: { value: new Color(GROUND_SETS.light.mid) },
      uGPeakL: { value: new Color(GROUND_SETS.light.peak) },
      uGCenterL: { value: new Vector4(...GROUND_SETS.light.centre) },
      uGSpreadL: { value: new Vector4(...GROUND_SETS.light.spread) },
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: WHITE_RISE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
  }), []);
  const radialSegments = tier === "high" ? 112 : tier === "medium" ? 72 : 40;
  const heightSegments = tier === "low" ? 12 : 24;

  // W7 C Yol A: the mouse flow also bends the wordmark (the reference trail bends the title and the Y).
  const wordFlow = useMemo(() => ({ uFluid: { value: null as Texture | null }, uTrace: { value: null as Texture | null }, uFluidMix: { value: 0 }, uFlowRes: { value: new Vector2(1, 1) } }), []);
  const patchWordmark = useMemo(() => (shader: { uniforms: Record<string, unknown>; fragmentShader: string }) => {
    shader.uniforms.uFluid = wordFlow.uFluid;
    shader.uniforms.uTrace = wordFlow.uTrace;
    shader.uniforms.uFluidMix = wordFlow.uFluidMix;
    shader.uniforms.uFlowRes = wordFlow.uFlowRes;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_pars_fragment>", "#include <map_pars_fragment>\nuniform sampler2D uFluid; uniform sampler2D uTrace; uniform float uFluidMix; uniform vec2 uFlowRes;")
      .replace(
        "#include <map_fragment>",
        "vec2 flowUv = gl_FragCoord.xy / uFlowRes;\n    vec2 rawShift = (texture2D(uFluid, flowUv).xy * 0.0135 + texture2D(uTrace, flowUv).xy * 0.0036) * uFluidMix;\n    // W7 C6: fine, grainy bend (2 px cells) with a dead zone: slow residual flow leaves the letters clean, only a real sweep bends them (shift = k * max(0, |v| - v0), peak capped at 0.022 uv). No R/B split on the letters.\n    float grain = fract(sin(dot(floor(gl_FragCoord.xy / 2.0), vec2(12.9898, 78.233))) * 43758.5453);\n    vec2 flowShift = rawShift * (0.55 + 0.9 * grain);\n    float shiftLen = length(flowShift);\n    vec2 flowDir = flowShift / max(shiftLen, 1e-5);\n    float eff = min(max(0.0, shiftLen - 0.06) * 1.3, 0.022);\n    flowShift = flowDir * eff;\n    vec2 wUv = vMapUv - flowShift;\n    vec4 sampledDiffuseColor = vec4(1.0, 1.0, 1.0, texture2D(map, wUv).a);\n    diffuseColor *= sampledDiffuseColor;",
      );
  }, [wordFlow]);

  const worksState = useRef({ idx: -1, prev: -1, t0: -10, lastFloat: 0, dir: 0 });
  const heroClock = useRef(0);

  useFrame((state, delta) => {
    if (openingShared.rawTime > 0) {
      heroClock.current += Math.min(0.1, Math.max(0, delta));
    }
    wordFlow.uFluid.value = fluidShared.texture;
    wordFlow.uTrace.value = fluidShared.trace ?? fluidShared.texture;
    wordFlow.uFluidMix.value = fluidShared.texture ? fluidShared.mix : 0;
    state.gl.getDrawingBufferSize(wordFlow.uFlowRes.value);
    const mediaFloat = frame.valueFloat / 3 * Math.max(0, (mediaTextures?.length ?? 0) - 1);
    const mediaIndex = Math.floor(mediaFloat);
    gridMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    gridMaterial.uniforms.uReadingMix.value = 1 - viewportMobileMix(viewportWidth);
    gridMaterial.uniforms.uHeroMix.value = frame.overlay.hero;
    gridMaterial.uniforms.uCompactMix.value = viewportMobileMix(viewportWidth);
    gridMaterial.uniforms.uWallTint.value.fromArray(resolveWallTint(frame.progress));
    gridMaterial.uniforms.uProjectionA.value = mediaTextures?.[mediaIndex] ?? null;
    gridMaterial.uniforms.uProjectionB.value = mediaTextures?.[Math.min(mediaIndex + 1, (mediaTextures?.length ?? 1) - 1)] ?? null;
    // W6 K5 (Tasarim E3/E4): the Values room is flat ground light; no generic media projection and no wall title on it.
    gridMaterial.uniforms.uProjectionMix.value = 0;
    // W7 Z13: the SERVICE wall title lives only through the dark-return window (0.788 to 0.816), never in the values room.
    gridMaterial.uniforms.uServiceTitleMix.value =
      smoothstep(segmentProgress(frame.progress, 0.788, 0.795)) * (1 - smoothstep(segmentProgress(frame.progress, 0.808, 0.816)));
    gridMaterial.uniforms.uProjectionBlend.value = smoothstep(mediaFloat - mediaIndex);
    bladeMaterial.uniforms.uRise.value = frame.world.bladeProgress;
    bladeMaterial.uniforms.uOpacity.value = 1 - smoothstep(segmentProgress(frame.progress, 0.788, 0.81));
    bladeMaterial.uniforms.uViewport.value.set(viewport.width, viewport.height);
    const gw = resolveGroundWeights(frame.progress, frame.world.themeMix);
    const darkSum = gw.hero + gw.portfolio + gw.proof + gw.night + gw.closing;
    const u = gridMaterial.uniforms;
    if (darkSum > 0.0001) {
      blendGround(u.uGEdge.value, u.uGMid.value, u.uGPeak.value, u.uGCenter.value, u.uGSpread.value, GROUND_DARK_ENTRIES.map(([key, set]) => [gw[key], set]), darkSum);
    }
    blendGround(u.uGEdgeL.value, u.uGMidL.value, u.uGPeakL.value, u.uGCenterL.value, u.uGSpreadL.value, [[1, GROUND_SETS.light]], 1);
    const mosaicShare = gw.hero + gw.portfolio * PORTFOLIO_MOSAIC;
    u.uMosaic.value = darkSum > 0.0001 ? mosaicShare / darkSum : 0;
    u.uMosaicGrey.value = mosaicShare > 0.0001 ? gw.portfolio * PORTFOLIO_MOSAIC / mosaicShare : 0;
    u.uMosaicAspect.value = viewport.width / Math.max(1, viewport.height);
    u.uMosaicTime.value = BG_FREEZE === null ? heroClock.current : BG_FREEZE; // W7 C6 / W8 B4: pattern cycle starts cleanly from hero opening
    // W8 B4: fixed 3.0 s opening fade once the hero opens.
    u.uKvFade.value = BG_FREEZE !== null || KV_FADE <= 0 ? 1 : Math.min(1, 0.35 + (heroClock.current / KV_FADE) * 0.65);
    u.uFluid.value = fluidShared.texture;
    u.uFluidMix.value = fluidShared.texture ? fluidShared.mix : 0;
    const groundTotal = Math.min(1, darkSum + gw.light);
    u.uGroundMix.value = groundTotal;
    u.uGroundLight.value = groundTotal > 0.0001 ? gw.light / groundTotal : 0;
    gridMaterial.uniforms.uWhiteMix.value = frame.world.themeMix;
    gridMaterial.uniforms.uBackgroundColor.value.copy(roomColors.dark).lerp(roomColors.light, frame.world.themeMix);
    gridMaterial.uniforms.uGalleryMix.value = frame.world.worksBackdropMix;
    // W7 Z09: the selected works card (productFloat rounds to its index) picks the ground picture; a change blends the
    // old picture into the new one over 2 s on the reference curve cubic-bezier(.01, .68, .19, 1).
    const cards = worksTextures ?? [];
    const ws = worksState.current;
    const floatDelta = frame.productFloat - ws.lastFloat;
    if (Math.abs(floatDelta) > 1e-4) ws.dir = Math.sign(floatDelta);
    ws.lastFloat = frame.productFloat;
    // The card swap reads halfway between two cards; the 2 s blend should be centred on it, so it starts a little earlier.
    const selected = cards.length ? Math.min(cards.length - 1, Math.max(0, Math.round(frame.productFloat + ws.dir * 0.25))) : -1;
    const now = state.clock.elapsedTime;
    if (selected >= 0 && ws.idx < 0) { ws.idx = selected; ws.prev = selected; ws.t0 = -10; }
    else if (selected >= 0 && selected !== ws.idx) { ws.prev = ws.idx; ws.idx = selected; ws.t0 = now; }
    const worksProgress = Math.min(1, Math.max(0, (now - ws.t0) / 2));
    const texNext = ws.idx >= 0 ? cards[ws.idx] ?? null : null;
    u.uWorksTexA.value = texNext;
    u.uWorksTexB.value = (ws.prev >= 0 ? cards[ws.prev] ?? null : null) ?? texNext;
    u.uWorksAnim.value = worksEase(worksProgress);
    u.uWorksMix.value = texNext ? frame.world.worksBackdropMix : 0;
    if (worksProgress < 1 && u.uWorksMix.value > 0.001) state.invalidate();
    // Let the physical white blade soften the room before the global theme settles.
    gridMaterial.uniforms.uOpacity.value = frame.world.roomOpacity
      * (1 - frame.world.worksBackdropMix * 0.2) * (1 - frame.world.whiteMix * 0.38)
      * (1 - smoothstep(segmentProgress(frame.world.closingDraw, 0, 0.7)));
  }, -45);

  useEffect(
    () => () => {
      gridMaterial.dispose();
      bladeMaterial.dispose();
      backdropMaterial.dispose();
      yulaWordmark.dispose();
      yulaHalo.dispose();
      worksWordmark.dispose();
      serviceWordmark.dispose();
    },
    [backdropMaterial, bladeMaterial, gridMaterial, serviceWordmark, worksWordmark, yulaHalo, yulaWordmark],
  );

  const blade = frame.world.bladeProgress;
  const wordmarkZ = frame.progress < STAGES.portfolio[0]
    ? -1.25
    : -2.35 - frame.productFloat * CARD_DEPTH_STEP;
  const wordmarkAlpha = frame.world.wordmarkOpacity * (1 - frame.world.worksBackdropMix);

  return (
    <group>
      <mesh position={[0, 0, -11.5]} rotation={[0, -Math.PI * 0.08, 0]} scale={[0.62, 1, 1]}>
        <cylinderGeometry
          args={[
            28,
            28,
            56,
            radialSegments,
            heightSegments,
            true,
            Math.PI * 0.17,
            Math.PI * 1.66,
          ]}
        />
        <primitive attach="material" object={gridMaterial} />
      </mesh>

      {/* W8 Q9: subtle optical bloom halo around the bright hero wordmark (peak alpha 0.14 < 0.20, keeping edge sharpness intact). */}
      <mesh
        position={[0, 0.1 + heroLift, wordmarkZ - 0.01]}
        renderOrder={-2.1}
        visible={wordmarkAlpha > 0.01 && frame.world.themeMix < 0.5}
      >
        <planeGeometry args={[wordmarkWidth * 1.04, wordmarkHeight * 1.08]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color="#d8d4ff"
          depthTest
          depthWrite={false}
          map={yulaHalo}
          opacity={wordmarkAlpha * 0.09}
          toneMapped={false}
          transparent
        />
      </mesh>

      {/* W8 Q3: smooth alpha-blended wordmark (alphaHash removed) so straight vertical edges stay <= 0.1 px. */}
      <mesh position={[0, 0.1 + heroLift, wordmarkZ]} renderOrder={-2} visible={wordmarkAlpha > 0.004}>
        <planeGeometry args={[wordmarkWidth, wordmarkHeight]} />
        <meshBasicMaterial
          color={frame.world.themeMix > 0.5 ? "#26212b" : "#ffffff"}
          depthTest
          depthWrite={false}
          transparent
          map={yulaWordmark}
          onBeforeCompile={patchWordmark}
          customProgramCacheKey={() => "wordmark-flow"}
          opacity={wordmarkAlpha}
          toneMapped={false}
        />
      </mesh>

      <mesh frustumCulled={false} renderOrder={-1000}>
        <planeGeometry args={[2, 2]} />
        <primitive attach="material" object={backdropMaterial} />
      </mesh>

      <mesh visible={blade > 0.001 && frame.progress < 0.835} frustumCulled={false} renderOrder={3.5}>
        <planeGeometry args={[2, 2]} />
        <primitive attach="material" object={bladeMaterial} />
      </mesh>

      <ClosingGeometry draw={frame.world.closingDraw * (1 - frame.world.closingDraw)} />
    </group>
  );
}
