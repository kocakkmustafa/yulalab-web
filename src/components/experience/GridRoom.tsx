"use client";

import { heroSlot } from "./hero-slot";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LinearFilter,
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
import { GROUND_SETS, resolveGroundWeights, resolveWallTint, WORLD_DARK_COLOR, WORLD_LIGHT_COLOR, type GroundSet } from "./theme";
import { glyphViewportPose, viewportMobileMix } from "./layout";

export type WallTitles = { works: string; service: string };

const ENGLISH_WALL_TITLES: WallTitles = { works: "WORKS", service: "SERVICE" };

export type GridRoomProps = {
  frame: TimelineFrame;
  tier: QualityTier;
  mediaTextures?: readonly Texture[];
  /** Wall titles in the visitor's language, already upper-cased. */
  wallTitles?: WallTitles;
};

/** Tile light: share of the flat room glow kept, floor and gain of the tile colour over the glow. */
const MOSAIC = { flat: 0.3, swing: 0.45, base: 0.012, gain: 0.2, lit: 0.08, flow: 0.15 } as const;
/** Share of the tile mosaic kept (in grey) over the portfolio ground. */
const PORTFOLIO_MOSAIC = 0.25;
const FLUID_DISPLAY = FLUID_PARAMS.displayScale.toFixed(6);
const GROUND_GLSL = /* glsl */ `
  uniform float uMosaic; uniform float uMosaicGrey; uniform float uMosaicAspect; uniform float uMosaicTime;
  uniform sampler2D uFluid; uniform float uFluidMix;
  float mosaicHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  // Quad-tree tile mosaic of our own: every cell may split into four (up to four levels), big and small
  // square tiles side by side, each tile slowly changing between purple, ice blue and brick (linear RGB).
  vec4 mosaicTiles(vec2 p, float t, float shift, out vec3 litTone) {
    float scale = 3.0;
    vec2 cell = floor(p * scale);
    float level = 0.0;
    bool open = true;
    for (int l = 0; l < 4; l++) {
      if (open) {
        if (mosaicHash(cell + level * 17.0) < 0.56) { scale *= 2.0; cell = floor(p * scale); level += 1.0; }
        else open = false;
      }
    }
    vec2 id = cell + level * 131.0;
    float phase = t * 0.16 + mosaicHash(id + 3.7) * 6.0;
    float k = floor(phase);
    float f = smoothstep(0.7, 1.0, fract(phase));
    float pick = fract(mix(mosaicHash(id + k), mosaicHash(id + k + 1.0), f) + shift);
    vec3 purple = vec3(0.035, 0.005, 0.98);
    vec3 ice = vec3(0.44, 0.85, 1.0);
    vec3 brick = vec3(0.98, 0.115, 0.004);
    vec3 tone = mix(purple, ice, smoothstep(0.6, 0.72, pick));
    tone = mix(tone, brick, smoothstep(0.82, 0.92, pick));
    float lum = mosaicHash(id + k * 1.31 + 9.1);
    lum = mix(lum, mosaicHash(id + (k + 1.0) * 1.31 + 9.1), f);
    vec2 local = fract(p * scale);
    float edge = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
    float seam = smoothstep(0.0, 0.045, edge);
    // About a third of the tiles are lit in their own colour wherever they are on the screen; the rest
    // stay dark, so the dark-pixel level of the ground (the measured value) does not move.
    litTone = tone * smoothstep(0.7, 0.86, lum) * (0.55 + 0.45 * lum) * seam;
    return vec4(tone * (0.12 + 0.88 * lum * lum) * seam, (0.5 + 0.5 * smoothstep(0.0, 0.8, lum) + 1.3 * smoothstep(0.8, 1.0, lum)) * mix(0.5, 1.0, seam));
  }
  vec3 groundColor(vec2 uv, vec3 edge, vec3 mid, vec3 peak, vec4 centre, vec4 spread) {
    vec2 d = uv - centre.xy;
    float wide = exp(-(d.x * d.x / spread.x + d.y * d.y / spread.y));
    vec2 e = uv - centre.zw;
    float narrow = exp(-(e.x * e.x / spread.z + e.y * e.y / spread.w));
    vec3 steady = edge + (mid - edge) * wide + (peak - mid) * narrow * wide;
    // W7 F1/F7: the mouse flow lights every ground, not only the hero mosaic.
    vec2 flowAll = texture2D(uFluid, uv).xy * uFluidMix;
    steady += vec3(0.8, 0.85, 1.0) * length(flowAll) * 0.4; // W7 C tur 3: x4 with the display scale
    if (uMosaic < 0.001) return steady;
    float glow = clamp(wide * 0.8 + narrow * wide * 0.6, 0.0, 1.0);
    // Mouse fluid: the tiles drift with the flow and their colours slide along the palette where it moves.
    vec2 flow = texture2D(uFluid, uv).xy * ${FLUID_DISPLAY};
    vec3 litTone;
    vec4 mosaic = mosaicTiles((uv - 0.5 - flow * 0.01 * uFluidMix) * vec2(uMosaicAspect, 1.0), uMosaicTime, (flow.x + flow.y * 0.6) * 0.45 * uFluidMix, litTone);
    // In the portfolio the tiles stay, but in greys (the reference works ground is black/grey).
    litTone = mix(litTone, vec3(dot(litTone, vec3(0.3, 0.5, 0.2))), uMosaicGrey);
    mosaic.rgb = mix(mosaic.rgb, vec3(dot(mosaic.rgb, vec3(0.3, 0.5, 0.2))), uMosaicGrey);
    float stir = length(flow) * uFluidMix * (1.0 - uMosaicGrey);
    vec3 stirTint = 0.5 + 0.5 * cos(6.2832 * (atan(flow.y, flow.x) / 6.2832 + vec3(0.0, 0.33, 0.67)));
    vec3 tiles = mosaic.rgb * 0.5 * (1.0 + length(flow) * 0.8 * uFluidMix);
    tiles *= smoothstep(0.55, 0.05, length(uv - 0.5));
    vec3 tiled = steady * (${MOSAIC.flat.toFixed(3)} + ${MOSAIC.swing.toFixed(3)} * mosaic.a) + tiles * (${MOSAIC.base.toFixed(3)} + ${MOSAIC.gain.toFixed(3)} * glow * glow) * 1.3
      + litTone * (${MOSAIC.lit.toFixed(3)} * 0.65) * (1.0 + stir * 3.0) + vec3(0.0);
    // W7 Z07: hero corners fall to near black (bottom right <= #060310, right middle ~ #0a0818).
    float cornerFall = smoothstep(0.66, 0.20, length(uv - 0.5));
    // W7 Z07 (tur 5): the right half falls further (bottom right about -5, right middle about -15 per channel).
    cornerFall *= mix(1.0, 0.5, smoothstep(0.6, 0.95, uv.x));
    return mix(steady, tiled, uMosaic) * mix(1.0, cornerFall, uMosaic);
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
    float fine = gridLine(vUv, vec2(128.0, 64.0));
    float major = gridLine(vUv, vec2(48.2, 59.5));
    vec2 tile = vUv * vec2(48.2, 59.5);
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
    color = mix(color, vec3(0.12), fine * 0.10);
    color *= 1.0 - major * 0.65;
    // W7 Z12: the plus lattice is its own coarser grid (about 92 x 182 px).
    vec2 crossPoint = abs(fract(vUv * vec2(67.0, 19.7)) - 0.5);
    float cross = max(step(crossPoint.x, 0.005) * step(crossPoint.y, 0.035), step(crossPoint.y, 0.005) * step(crossPoint.x, 0.035));
    color += vec3(cross * 0.10);
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
    base += vec3(0.8, 0.85, 1.0) * length(texture2D(uFluid, screenUv).xy * uFluidMix) * 2.4;
    vec3 gDark = groundColor(screenUv, uGEdge, uGMid, uGPeak, uGCenter, uGSpread);
    vec3 gLight = groundColor(screenUv, uGEdgeL, uGMidL, uGPeakL, uGCenterL, uGSpreadL);
    // Line work and crosses stay faintly visible on top of the ground light.
    vec3 lines = vec3(fine * 0.012 + major * 0.05 + cross * 0.12);
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
    color = mix(color, vec3(0.686, 0.753, 0.783), 0.9);
    color = mix(color, vec3(0.80), lead);
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

function makeWordmarkTexture(label: string, skipFirstLetter = false): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "600 340px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    context.textBaseline = "middle";
    const centreY = canvas.height / 2 + 12;
    const maxWidth = canvas.width * 0.92;
    if (skipFirstLetter) {
      // Same layout as the whole word, but the first letter is left empty for the glass Y.
      const full = context.measureText(label).width;
      const firstWidth = context.measureText(label.slice(0, 1)).width;
      const fit = Math.min(1, maxWidth / full);
      const start = (canvas.width - full * fit) / 2;
      context.textAlign = "left";
      context.fillText(label.slice(1), start + firstWidth * fit, centreY, (full - firstWidth) * fit);
      const cap = context.measureText("U");
      heroSlot.x = (start + (firstWidth * fit) / 2 - canvas.width / 2) / canvas.width;
      // Metrics are relative to the "middle" line the text was drawn on.
      const capTop = centreY - cap.actualBoundingBoxAscent;
      const capBottom = centreY + cap.actualBoundingBoxDescent;
      heroSlot.cap = (capBottom - capTop) / canvas.height;
      heroSlot.y = (canvas.height / 2 - (capTop + capBottom) / 2) / canvas.height;
    } else {
      context.textAlign = "center";
      context.fillText(label, canvas.width / 2, centreY, maxWidth);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
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

export function GridRoom({ frame, tier, mediaTextures, wallTitles = ENGLISH_WALL_TITLES }: GridRoomProps) {
  const viewport = useThree((state) => state.size);
  const viewportWidth = viewport.width;
  const heroLift = glyphViewportPose(frame.progress, viewport.width / Math.max(1, viewport.height), viewport.width).offset[1] * frame.overlay.hero;
  const wordmarkWidth = 14.2 * (1 - viewportMobileMix(viewportWidth) * 0.56);
  const roomColors = useMemo(() => ({
    dark: new Color(WORLD_DARK_COLOR),
    light: new Color(WORLD_LIGHT_COLOR),
  }), []);
  const yulaWordmark = useMemo(() => makeWordmarkTexture("YULA", true), []);
  const worksWordmark = useMemo(() => makeWordmarkTexture(wallTitles.works), [wallTitles.works]);
  const serviceWordmark = useMemo(() => makeWordmarkTexture(wallTitles.service), [wallTitles.service]);
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
          uMosaic: { value: 0 }, uMosaicGrey: { value: 0 }, uMosaicAspect: { value: 1 }, uMosaicTime: { value: 0 },
          uFluid: { value: null }, uFluidMix: { value: 0 },
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
        uMosaic: shared.uMosaic, uMosaicGrey: shared.uMosaicGrey, uMosaicAspect: shared.uMosaicAspect, uMosaicTime: shared.uMosaicTime,
        uFluid: shared.uFluid, uFluidMix: shared.uFluidMix,
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
        "vec2 flowUv = gl_FragCoord.xy / uFlowRes;\n    vec2 flowShift = (texture2D(uFluid, flowUv).xy * 0.045 + texture2D(uTrace, flowUv).xy * 0.012) * uFluidMix;\n    vec4 sampledDiffuseColor = texture2D(map, vMapUv - flowShift);\n    diffuseColor *= sampledDiffuseColor;",
      );
  }, [wordFlow]);

  useFrame((state) => {
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
    u.uMosaicTime.value = state.clock.elapsedTime;
    u.uFluid.value = fluidShared.texture;
    u.uFluidMix.value = fluidShared.texture ? fluidShared.mix : 0;
    const groundTotal = Math.min(1, darkSum + gw.light);
    u.uGroundMix.value = groundTotal;
    u.uGroundLight.value = groundTotal > 0.0001 ? gw.light / groundTotal : 0;
    gridMaterial.uniforms.uWhiteMix.value = frame.world.themeMix;
    gridMaterial.uniforms.uBackgroundColor.value.copy(roomColors.dark).lerp(roomColors.light, frame.world.themeMix);
    gridMaterial.uniforms.uGalleryMix.value = frame.world.worksBackdropMix;
    // Let the physical white blade soften the room before the global theme settles.
    gridMaterial.uniforms.uOpacity.value = frame.world.roomOpacity
      * (1 - frame.world.worksBackdropMix * 0.2) * (1 - frame.world.whiteMix * 0.38)
      * (1 - smoothstep(segmentProgress(frame.world.closingDraw, 0, 0.7)));
  });

  useEffect(
    () => () => {
      gridMaterial.dispose();
      bladeMaterial.dispose();
      backdropMaterial.dispose();
      yulaWordmark.dispose();
      worksWordmark.dispose();
      serviceWordmark.dispose();
    },
    [backdropMaterial, bladeMaterial, gridMaterial, serviceWordmark, worksWordmark, yulaWordmark],
  );

  const blade = frame.world.bladeProgress;
  const wordmarkZ = frame.progress < STAGES.portfolio[0]
    ? -1.25
    : -2.35 - frame.productFloat * CARD_DEPTH_STEP;

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

      <mesh position={[0, 0.1 + heroLift, wordmarkZ]} renderOrder={-2}>
        <planeGeometry args={[wordmarkWidth, 5.2]} />
        <meshBasicMaterial
          color={frame.world.themeMix > 0.5 ? "#26212b" : "#ffffff"}
          depthTest
          depthWrite
          alphaHash
          map={yulaWordmark}
          onBeforeCompile={patchWordmark}
          customProgramCacheKey={() => "wordmark-flow"}
          opacity={frame.world.wordmarkOpacity * (1 - frame.world.worksBackdropMix)}
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
