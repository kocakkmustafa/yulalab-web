"use client";

import { useEffect, useMemo, useRef } from "react";
import { FLUID_PARAMS, fluidShared } from "./MouseFluid";
import { openingShared } from "./opening";
import {
  type BufferGeometry,
  DataTexture,
  LinearFilter,
  type Mesh,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";

/**
 * W1D-D H1-c / W8 cam: refraction shader aligned term-for-term with the measured reference (REA section 3):
 * refract power 0.1, per-channel slide x1 / x2 / x4 (0.005 + random * 0.007), eight jittered taps at 0.9,
 * domain-warped noise roughness 0.1 (roughnessDir = rand * roughness * 0.3), quartic GGX specular, Fresnel f0 0.1,
 * output x1.2, over a cut-crystal Y heightfield (35 deg crown + recessed inner Y bevel contour).
 */
export const GLASS_PARAMS = {
  refractPower: 0.1,
  slide: [1, 2, 4] as const,
  slideBase: 0.005,
  slideRandom: 0.007,
  samples: 8,
  sampleGain: 0.9,
  roughness: 0.1,
  f0: 0.1,
  output: 1.2,
} as const;

/** W8-10: fallback size only; the copy follows the drawing buffer 1:1 (W8-20). */
const BACKDROP_SIZE = 1024;

function makeFrostNoiseTexture(): DataTexture {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  const hash2 = (ix: number, iy: number, seed: number) => {
    const h = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
    return h - Math.floor(h);
  };
  const periodicNoise = (u: number, v: number, period: number, seed: number) => {
    const x = u * period;
    const y = v * period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const ix0 = ((x0 % period) + period) % period;
    const iy0 = ((y0 % period) + period) % period;
    const ix1 = (ix0 + 1) % period;
    const iy1 = (iy0 + 1) % period;
    const n00 = hash2(ix0, iy0, seed);
    const n10 = hash2(ix1, iy0, seed);
    const n01 = hash2(ix0, iy1, seed);
    const n11 = hash2(ix1, iy1, seed);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };
  const fbm = (u: number, v: number, seed: number) =>
    periodicNoise(u, v, 3, seed) * 0.58 +
    periodicNoise(u, v, 6, seed + 11.3) * 0.29 +
    periodicNoise(u, v, 12, seed + 23.7) * 0.13;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const w1 = fbm(u, v, 1.7) - 0.5;
      const w2 = fbm(u, v, 5.9) - 0.5;
      const wu = u + w1 * 0.45;
      const wv = v + w2 * 0.45;
      const c0 = Math.min(1, Math.max(0, (fbm(wu, wv, 13.1) - 0.16) / 0.68));
      const c1 = Math.min(1, Math.max(0, (fbm(wu, wv, 29.3) - 0.16) / 0.68));
      const c2 = Math.min(1, Math.max(0, (fbm(wu, wv, 47.7) - 0.16) / 0.68));
      const c3 = Math.min(1, Math.max(0, (fbm(u, v, 61.9) - 0.16) / 0.68));
      const idx = (y * size + x) * 4;
      pixels[idx] = Math.round(c0 * 255);
      pixels[idx + 1] = Math.round(c1 * 255);
      pixels[idx + 2] = Math.round(c2 * 255);
      pixels[idx + 3] = Math.round(c3 * 255);
    }
  }
  const tex = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const VERTEX = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  varying vec3 vLocalNormal;
  varying vec3 vViewTanX;
  varying vec3 vViewTanY;
  void main() {
    vLocal = position;
    vLocalNormal = normalize(normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    vViewTanX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
    vViewTanY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uBackground;
  uniform sampler2D uNoise;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uTime;
  uniform sampler2D uFluid;
  uniform float uFluidMix;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  varying vec3 vLocalNormal;
  varying vec3 vViewTanX;
  varying vec3 vViewTanY;

  const float REFRACT_POWER = ${GLASS_PARAMS.refractPower.toFixed(3)};
  const float ROUGHNESS = ${GLASS_PARAMS.roughness.toFixed(3)};
  const float F0 = ${GLASS_PARAMS.f0.toFixed(3)};

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // Reference quartic GGX NDF (a2 = roughness^4): razor-sharp 1-2 px specular glints along crystal bevels.
  float ggx(float nh, float r) {
    float a2 = r * r;
    a2 = a2 * a2;
    float nh2 = nh * nh;
    if (nh2 <= 0.0) return 0.0;
    float d = nh2 * (a2 - 1.0) + 1.0;
    return a2 / (3.14159265 * d * d);
  }

  vec3 studio(vec3 r) {
    vec3 c = vec3(0.012, 0.015, 0.038);
    c += vec3(1.15, 1.12, 1.2) * pow(max(dot(r, normalize(vec3(-0.52, 0.62, 0.58))), 0.0), 26.0);
    c += vec3(0.95, 0.96, 1.05) * pow(max(dot(r, normalize(vec3(0.66, 0.44, 0.61))), 0.0), 32.0);
    c += vec3(0.28, 0.22, 0.55) * pow(max(dot(r, normalize(vec3(0.15, -0.78, 0.60))), 0.0), 10.0);
    return c;
  }

  // Smooth mirror-folded distance to the Y outer silhouette (hyperbolic x rounding removes any x = 0 vertical seam, W8-67).
  float yCrystalDist(vec2 p) {
    float ax = sqrt(p.x * p.x + 0.0042);
    float dOuter = max(0.27 - ax, (0.27 - ax) * 0.821588 + (p.y + 0.08) * 0.570082);
    vec2 w = vec2(ax, p.y - 0.27);
    float tV = max(0.0, dot(w, vec2(0.563744, 0.825950)));
    float vSign = ax * 0.825950 - (p.y - 0.27) * 0.563744 < 0.0 ? -1.0 : 1.0;
    float dInnerV = length(w - vec2(0.563744, 0.825950) * tV) * vSign;
    return min(min(0.90 - p.y, p.y + 0.90), min(dOuter, dInnerV));
  }

  // Central sculpted V-shield crystal hollow (ic oyuk, W8-66/W8-68): the 35 deg arm planes continue straight inward
  // to a clean crystal sill at y = -0.23 in the heart of Y (crossing U and L diagonally like the reference inner triangle),
  // with zero vertical bars or rectangular contour on the Y foot.
  float yCavityDist(vec2 p) {
    float ax = sqrt(p.x * p.x + 0.0008);
    float dSlant = (0.27 - ax) * 0.821588 + (p.y + 0.08) * 0.570082 - 0.098;
    vec2 w = vec2(ax, p.y - 0.27);
    float tV = max(0.0, dot(w, vec2(0.563744, 0.825950)));
    float vSign = ax * 0.825950 - (p.y - 0.27) * 0.563744 < 0.0 ? -1.0 : 1.0;
    float dInnerV = length(w - vec2(0.563744, 0.825950) * tV) * vSign - 0.098;
    return min(min(0.56 - p.y, p.y + 0.22), min(dSlant, dInnerV));
  }

  // Cut-crystal prism profile: ~15 deg crown slope (magnifies the 7.1 px dot matrix ~1.5x) + recessed central hollow step.
  float yCrystalHeight(vec2 p, float innerWeight) {
    float d = max(yCrystalDist(p), 0.0);
    float dc = yCavityDist(p);
    float cavityStep = smoothstep(-0.010, 0.010, dc) * innerWeight;
    return d * 0.27 - cavityStep * 0.025;
  }

  void main() {
    float portrait = step(uResolution.x, uResolution.y);
    vec3 meshNormal = normalize(vViewNormal);
    if (!gl_FrontFacing) meshNormal = -meshNormal;
    vec3 viewDir = normalize(-vViewPosition);
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Rotated isotropic domain-warped cloud noise (W8-67: grainy clouds, never vertical brush streaks).
    mat2 cloudRot = mat2(0.848048, -0.529919, 0.529919, 0.848048);
    vec2 glassUv = cloudRot * (vLocal.xy * vec2(0.37, 0.38)) + 0.5;
    vec4 noise = texture2D(uNoise, glassUv * 9.0);
    vec4 noise2 = texture2D(uNoise, glassUv * 1.35 + (noise.xy - 0.5) * 1.75);
    float dcHere = yCavityDist(vLocal.xy);
    float portraitHeart = smoothstep(-0.36, -0.06, vLocal.y) * (1.0 - smoothstep(0.16, 0.44, vLocal.y));
    float innerWeight = mix(1.0, 0.12 + 0.95 * portraitHeart, portrait);
    // Inside the central belly hollow (y < 0.26), frost clears partially so the deep violet window and dot matrix pop.
    float bellyWindow = smoothstep(0.005, 0.024, dcHere) * (1.0 - smoothstep(0.16, 0.34, vLocal.y)) * innerWeight;
    float cloudField = noise2.y + (hash(floor(gl_FragCoord.xy * 0.5) + 5.1) - 0.5) * 0.14;
    float frostPatch = smoothstep(0.28, 0.74, cloudField) * (1.0 - 0.62 * bellyWindow);
    float roughness = frostPatch * ROUGHNESS;

    float eps = 0.0018;
    float hx = yCrystalHeight(vLocal.xy + vec2(eps, 0.0), innerWeight) - yCrystalHeight(vLocal.xy - vec2(eps, 0.0), innerWeight);
    float hy = yCrystalHeight(vLocal.xy + vec2(0.0, eps), innerWeight) - yCrystalHeight(vLocal.xy - vec2(0.0, eps), innerWeight);
    vec2 crystalSlope = vec2(hx, hy) / (2.0 * eps);
    vec2 frostRipple = (cloudRot * (noise.zw - 0.5)) * 0.15 * frostPatch * (1.0 - portrait * 0.88);
    float faceFlatness = smoothstep(0.68, 0.96, abs(vLocalNormal.z));
    float crownScale = mix(1.0, 0.34 + 0.78 * portraitHeart, portrait);
    vec2 slopeXY = -(crystalSlope * crownScale + frostRipple) * faceFlatness;
    vec3 crystalNormal = normalize(vViewTanX * slopeXY.x + vViewTanY * slopeXY.y + meshNormal);
    vec3 normal = normalize(mix(meshNormal, crystalNormal, faceFlatness));

    float nv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float tilt = 1.0 - nv;
    float bevelEdge = smoothstep(0.19, 0.46, tilt);

    // Mouse fluid bends the background gently beneath the glass.
    vec2 flow = texture2D(uFluid, uv).xy * ${(FLUID_PARAMS.displayScale / 2).toFixed(6)} * uFluidMix;
    float flowAmount = length(flow);
    vec2 refractNormal = normal.xy * (1.0 - normal.z * 0.7) * mix(1.0, 0.46, portrait) + flow * 0.06;
    vec2 aspectScale = vec2(min(1.0, uResolution.y / max(uResolution.x, 1.0)), min(1.0, uResolution.x / max(uResolution.y, 1.0)));

    vec2 centerProbeUv = clamp(uv - refractNormal * REFRACT_POWER, 0.0, 1.0);
    float probeLum = dot(texture2D(uBackground, centerProbeUv).rgb, vec3(0.3, 0.5, 0.2));
    float probeLumOff = dot(texture2D(uBackground, clamp(centerProbeUv + vec2(0.008, 0.008) * aspectScale, 0.0, 1.0)).rgb, vec3(0.3, 0.5, 0.2));
    float nearLetterEdge = smoothstep(0.05, 0.30, abs(probeLum - probeLumOff));

    // Reference 8-tap chromatic refraction: R x1.0, G x2.0, B x4.0 (2.2x dispersion along rim/inner bevels, W8-66).
    float rimSlideBoost = 1.0 + 1.25 * bevelEdge;
    vec3 transmitted = vec3(0.0);
    for (int i = 0; i < ${GLASS_PARAMS.samples}; i++) {
      float fi = float(i);
      float slide = ((1.0 + min(flowAmount, 1.0) * 0.5) * ${GLASS_PARAMS.slideBase.toFixed(3)} + hash(gl_FragCoord.xy * 0.37 + fi * 7.13) * ${GLASS_PARAMS.slideRandom.toFixed(3)}) * rimSlideBoost;
      float effRough = max(roughness, 0.068 * nearLetterEdge * (1.0 - portrait * 0.38));
      // Polar-jittered isotropic cloud taps prevent axis-aligned streaks (W8-67).
      float ang = 6.283185 * hash(gl_FragCoord.xy + fi * 17.31);
      float rad = sqrt(hash(gl_FragCoord.yx + fi * 31.73)) * mix(0.82, 0.60, portrait);
      vec2 roughnessDir = vec2(cos(ang), sin(ang)) * rad * effRough * 0.42 * aspectScale;
      vec2 base = uv + roughnessDir;
      vec3 sampleColor;
      sampleColor.r = texture2D(uBackground, clamp(base - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[0].toFixed(1)}), 0.0, 1.0)).r;
      sampleColor.g = texture2D(uBackground, clamp(base - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[1].toFixed(1)}), 0.0, 1.0)).g;
      sampleColor.b = texture2D(uBackground, clamp(base - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[2].toFixed(1)}), 0.0, 1.0)).b;
      transmitted += sampleColor * ${GLASS_PARAMS.sampleGain.toFixed(1)};
    }
    vec3 c = transmitted / ${GLASS_PARAMS.samples.toFixed(1)};

    // W8-49 / W8-64: high desktop white knee keeps interior letter faces pure solid 255 white (zero grey blotches) while
    // 8-tap cloud frost at the edges and the diagonal V-shield bevel cut continuous white columns to ~0.15 (ref 0.13).
    float rawLum = dot(c, vec3(0.3, 0.5, 0.2));
    float brightMask = smoothstep(mix(0.81, 0.28, portrait), mix(0.910, 0.56, portrait), rawLum);
    float frostTint = smoothstep(0.46, 0.74, cloudField) * (1.0 - portrait);
    // Steep inner cavity bevel cuts crisply across the white wordmark like the reference inner triangle edge.
    float innerCavityRim = exp(-pow(dcHere / 0.014, 2.0)) * innerWeight * (1.0 - portrait * 0.5);

    // W8-62 / W8-63 / W8-65: calibrate desktop body/arm saturation to ~27% / ~28% and give upper arms a rich lavender
    // crystal floor so they read as translucent lavender glass rather than empty dark corners.
    float upperArm = smoothstep(0.05, 0.58, vLocal.y);
    float darkScale = mix(0.76 * (1.0 - 0.26 * bellyWindow), 0.72, portrait);
    float darkContrast = mix(1.24, 0.90, portrait);
    float pivot = mix(0.16, 0.04, portrait);
    vec3 trimmed = c * mix(vec3(1.0, 1.0, 0.982), vec3(1.0), portrait);
    vec3 darkToned = max(vec3(pivot) + (trimmed * darkScale - vec3(pivot)) * darkContrast, vec3(0.0));
    vec3 armLavender = vec3(0.072, 0.059, 0.136) * (0.24 + 0.76 * upperArm) * (1.0 - 0.75 * bellyWindow) * (1.0 - portrait);
    darkToned += armLavender;
    float satMix = mix(mix(0.9065, 0.865, upperArm), 0.62, portrait);
    vec3 darkCol = max(mix(vec3(dot(darkToned, vec3(0.3, 0.5, 0.2))), darkToned, satMix), vec3(0.0));
    vec3 desktopWhite = mix(vec3(0.88), vec3(0.86, 0.752, 0.92), frostTint);
    vec3 letterWhite = mix(desktopWhite, vec3(0.89), portrait);
    c = mix(darkCol, letterWhite, brightMask * (1.0 - 0.80 * innerCavityRim));

    // Stippled cloud micro-grain: desktop ~243 body / ~220 arms Laplace; portrait stem ~18.5 Laplace (ref 18.5).
    float desktopGrain = mix(0.095, 0.066, upperArm) * (0.24 + 0.76 * frostPatch);
    float portraitStem = 1.0 - smoothstep(-0.30, 0.05, vLocal.y);
    float mobileGrain = mix(0.018, 0.071, portraitStem) * (0.35 + 0.65 * frostPatch);
    float frostGrain = (hash(gl_FragCoord.xy * 0.89 + 2.3) - 0.5) * mix(desktopGrain, mobileGrain, portrait) * (1.0 - brightMask);
    c = max(c + frostGrain * vec3(0.96, 0.94, 1.04), vec3(0.0));

    float fresnel = F0 + (1.0 - F0) * pow(tilt, 5.0);
    float grazing = clamp((fresnel - F0) / (1.0 - F0), 0.0, 1.0);
    vec3 reflected = studio(reflect(-viewDir, normal));

    vec3 lightDirA = normalize(vec3(-1.0, 0.8, -1.0));
    vec3 lightDirB = normalize(vec3(0.95, 0.65, -0.85));
    float specR = 0.003 + roughness * 0.30;
    float spec = ggx(clamp(dot(normal, normalize(lightDirA + viewDir)), 0.0, 1.0), specR)
      + 0.78 * ggx(clamp(dot(normal, normalize(lightDirB + viewDir)), 0.0, 1.0), specR * 1.06);

    c = mix(c, reflected, clamp(grazing * 0.80 + innerCavityRim * 0.38, 0.0, 0.92) * (1.0 - brightMask * (0.78 - 0.55 * innerCavityRim)));

    // W8-66: vivid <= 6 px prismatic rainbow band (Red/Orange -> Golden Yellow -> Electric Cyan/Blue) along outer rim
    // and inner hollow bevels, closed by a razor-thin 1-2 px white specular line.
    float dispPhase = fract(tilt * 2.35 + normal.x * 0.45 - normal.y * 0.28);
    vec3 colRed = vec3(1.00, 0.24, 0.08);
    vec3 colYel = vec3(1.00, 0.88, 0.18);
    vec3 colBlu = vec3(0.16, 0.68, 1.00);
    vec3 prism = dispPhase < 0.36
      ? mix(colRed, colYel, dispPhase / 0.36)
      : (dispPhase < 0.72 ? mix(colYel, colBlu, (dispPhase - 0.36) / 0.36) : mix(colBlu, colRed, (dispPhase - 0.72) / 0.28));
    float prismBand = smoothstep(0.22, 0.46, tilt) * (1.0 - smoothstep(0.84, 0.97, tilt));
    float prismGain = mix(0.72 + 0.35 * brightMask, (0.24 + 0.82 * brightMask) * (0.22 + 0.78 * portraitHeart), portrait);
    c += prism * prismBand * prismGain;

    float whiteRim = smoothstep(0.84, 0.96, pow(tilt, 2.7));
    c += vec3(whiteRim) * mix(0.88, 0.20 + 0.58 * portraitHeart, portrait);
    c += vec3(min(spec, 1.60)) * mix(1.0, 0.30 + 0.70 * portraitHeart, portrait);

    // Portrait deep-navy crystal body (reference mobile: RGB ~21,21,55, body sat ~0.3%, arms sat ~6%, Laplace ~18).
    float bodyFace = 1.0 - smoothstep(0.24, 0.58, tilt);
    c *= 1.0 - 0.08 * portrait * bodyFace * (1.0 - brightMask);
    float armPatch = smoothstep(0.18, 0.65, vLocal.y) * smoothstep(0.56, 0.80, noise2.x);
    float stemPatch = portraitStem * smoothstep(0.80, 0.95, noise2.x);
    c += (vec3(0.011, 0.016, 0.110) + vec3(0.008, 0.014, 0.180) * (armPatch + stemPatch * 0.55)) * portrait * bodyFace * (1.0 - brightMask);

    c *= ${GLASS_PARAMS.output.toFixed(1)};
    gl_FragColor = vec4(min(c, vec3(1.0)), smoothstep(0.0, 0.25, uOpacity));
  }
`;

export type RefractGlassProps = {
  geometry: BufferGeometry;
  opacity: number;
  visible: boolean;
  /** True while the hero stage is on screen: the glass fades in with the opening clock. */
  inHero?: boolean;
};

export function RefractGlass({ geometry, opacity, visible, inHero = false }: RefractGlassProps) {
  const entrance = useRef({ opacity, inHero });
  entrance.current = { opacity, inHero };
  const mesh = useRef<Mesh>(null);
  const texture = useRef<WebGLRenderTarget | null>(null);
  const size = useMemo(() => new Vector2(), []);
  const frostNoise = useMemo(() => makeFrostNoiseTexture(), []);
  const material = useMemo(
    () => new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uBackground: { value: null },
        uNoise: { value: frostNoise },
        uResolution: { value: new Vector2(1, 1) },
        uOpacity: { value: 1 },
        uTime: { value: 0 },
        uFluid: { value: null },
        uFluidMix: { value: 0 },
      },
      transparent: true,
      toneMapped: false,
    }),
    [frostNoise],
  );

  useEffect(() => {
    const target = mesh.current;
    if (!target) return;
    target.onBeforeRender = (renderer: WebGLRenderer) => {
      // Only the main framebuffer can be copied; offscreen passes (portal) draw without refraction.
      if (renderer.getRenderTarget() !== null) return;
      const gl = renderer.getContext();
      if (!("blitFramebuffer" in gl)) return;
      renderer.getDrawingBufferSize(size);
      material.uniforms.uOpacity.value = entrance.current.opacity * (entrance.current.inHero ? openingShared.glyphOpacity : 1);
      const width = Math.max(1, Math.floor(size.x));
      const height = Math.max(1, Math.floor(size.y));
      let current = texture.current;
      // W8-20: 1:1 copy of the drawn frame so the 7 px dot matrix keeps its resolution through the glass.
      if (current && (current.width !== width || current.height !== height)) {
        current.dispose();
        current = null;
        texture.current = null;
      }
      if (!current) {
        current = new WebGLRenderTarget(width || BACKDROP_SIZE, height || BACKDROP_SIZE, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
        texture.current = current;
        material.uniforms.uBackground.value = current.texture;
      }
      material.uniforms.uResolution.value.set(width, height);
      material.uniforms.uTime.value = performance.now() / 1000;
      material.uniforms.uFluid.value = fluidShared.texture;
      material.uniforms.uFluidMix.value = fluidShared.texture ? fluidShared.mix : 0;
      // WebGL2 resolves and scales the already drawn scene into a fixed-size
      // texture; restore the default framebuffer before three continues drawing.
      renderer.setRenderTarget(current);
      const destination = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
      renderer.setRenderTarget(null);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination);
      gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    };
    return () => {
      target.onBeforeRender = () => {};
    };
  }, [material, size]);

  useEffect(() => () => {
    texture.current?.dispose();
    frostNoise.dispose();
    material.dispose();
  }, [frostNoise, material]);

  material.uniforms.uOpacity.value = opacity;
  material.depthWrite = opacity > 0.55;

  return <mesh ref={mesh} geometry={geometry} material={material} visible={visible} frustumCulled={false} />;
}
