"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { FLUID_PARAMS, fluidShared } from "./MouseFluid";
import {
  type BufferGeometry,
  Color,
  LinearFilter,
  type Mesh,
  type Object3D,
  RGBAFormat,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
} from "three";

/**
 * W1D-D / W8: glass Y refraction shader using REA section 3 values:
 * refract power 0.1, per-channel slide x1 / x2 / x4 (0.005 + random * 0.007),
 * eight taps at 0.9, roughness 0.1, Fresnel f0 0.1, GGX specular, output x1.2,
 * sampling a shared 512x512 background target instead of a full-res MSAA copy.
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
  backdropSize: 512,
} as const;

export const OPENING_DURATION_SECONDS = 3.0;

/**
 * Shared non-reactive opening state driven in useFrame so the 3.0 s opening
 * runs at 60 fps without triggering React tree re-renders.
 */
export const openingShared = {
  rawTime: OPENING_DURATION_SECONDS,
  progress: 1,
  eased: 1,
  glyphOpacity: 1,
};

export const sceneBackgroundShared: {
  texture: Texture | null;
} = {
  texture: null,
};

function openingCurve(value: number): number {
  const x = Math.min(1, Math.max(0, value));
  const inv = 1 - x;
  const cubic = 1 - inv * inv * inv;
  const s = (t: number) => 1 / (1 + Math.exp(-6 * (t * 2 - 1)));
  const sig = (s(x) - s(0)) / (s(1) - s(0));
  return cubic * 0.45 + sig * 0.55;
}

function smoothstep01(value: number): number {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
}

export function OpeningDirector({ sceneOpened = true }: { sceneOpened?: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const wasOpenedOnMount = useRef(sceneOpened);
  const activeOpening = useRef(!sceneOpened);

  useEffect(() => {
    if (!sceneOpened) {
      wasOpenedOnMount.current = false;
      activeOpening.current = true;
      openingShared.rawTime = 0;
      openingShared.progress = 0;
      openingShared.eased = 0;
      openingShared.glyphOpacity = 0;
      invalidate();
      return;
    }
    if (wasOpenedOnMount.current && !activeOpening.current) {
      openingShared.rawTime = OPENING_DURATION_SECONDS;
      openingShared.progress = 1;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
      return;
    }
    invalidate();
  }, [invalidate, sceneOpened]);

  useFrame((_state, delta) => {
    if (!sceneOpened) {
      openingShared.rawTime = 0;
      openingShared.progress = 0;
      openingShared.eased = 0;
      openingShared.glyphOpacity = 0;
      return;
    }
    if (!activeOpening.current) {
      openingShared.rawTime = OPENING_DURATION_SECONDS;
      openingShared.progress = 1;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
      return;
    }
    const dt = Math.min(1 / 20, Math.max(0, delta));
    openingShared.rawTime = Math.min(OPENING_DURATION_SECONDS, openingShared.rawTime + dt);
    const linear = openingShared.rawTime / OPENING_DURATION_SECONDS;
    openingShared.progress = linear;
    openingShared.eased = openingCurve(linear);
    // W8 T5: the glass Y fades in over 1.0 s during the opening instead of waiting pre-baked behind the loader.
    openingShared.glyphOpacity = smoothstep01((openingShared.rawTime - 0.08) / 1.0);
    if (linear < 1) {
      invalidate();
    } else {
      activeOpening.current = false;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
    }
  }, -60);

  return null;
}

export function SceneBackgroundPass({ active }: { active: boolean }) {
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const savedClearColor = useMemo(() => new Color(), []);
  const hiddenScratch = useRef<Object3D[]>([]);

  const target = useMemo(() => {
    const rt = new WebGLRenderTarget(GLASS_PARAMS.backdropSize, GLASS_PARAMS.backdropSize, {
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
      format: RGBAFormat,
      type: UnsignedByteType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    rt.texture.colorSpace = SRGBColorSpace;
    rt.texture.generateMipmaps = false;
    return rt;
  }, []);

  useEffect(() => {
    sceneBackgroundShared.texture = target.texture;
    return () => {
      if (sceneBackgroundShared.texture === target.texture) {
        sceneBackgroundShared.texture = null;
      }
      target.dispose();
    };
  }, [target]);

  useFrame(() => {
    if (!active && openingShared.eased >= 0.999) return;

    const hidden = hiddenScratch.current;
    hidden.length = 0;
    scene.traverse((obj) => {
      if (obj.userData?.skipRefractCapture && obj.visible) {
        obj.visible = false;
        hidden.push(obj);
      }
    });

    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    const prevShadow = renderer.shadowMap.enabled;
    const prevXr = renderer.xr.enabled;
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(savedClearColor);

    try {
      renderer.xr.enabled = false;
      renderer.shadowMap.enabled = false;
      renderer.autoClear = true;
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
    } finally {
      for (let i = 0; i < hidden.length; i += 1) {
        hidden[i].visible = true;
      }
      hidden.length = 0;
      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(savedClearColor, prevAlpha);
      renderer.autoClear = prevAutoClear;
      renderer.shadowMap.enabled = prevShadow;
      renderer.xr.enabled = prevXr;
    }
  }, -20);

  return null;
}

const IRIS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, -0.999, 1.0);
  }
`;

const IRIS_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uBackground;
  uniform float uLoaded;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    if (uLoaded >= 0.999) {
      discard;
    }
    vec2 cuv = vUv - 0.5;
    vec2 acuv = cuv;
    if (uAspect > 1.0) {
      acuv.y /= uAspect;
    } else {
      acuv.x *= uAspect;
    }
    float dist = length(acuv);
    // W8 T4: reference circular opening wave + spherical lens bend along the expanding rim.
    float r = smoothstep(0.0, 0.2 + uLoaded * 0.7, -dist + uLoaded * 1.4);
    float innerMask = smoothstep(0.0, 0.5, r);
    float ring = sin(r * 3.14159265);
    vec2 dir = dist > 1e-4 ? acuv / dist : vec2(0.0);
    vec2 uvShift = dir;
    if (uAspect > 1.0) {
      uvShift.y *= uAspect;
    } else {
      uvShift.x /= uAspect;
    }
    vec2 lensUv = (vUv - 0.5) * (0.66 + 0.34 * uLoaded) + 0.5 - ring * uvShift * 0.095;
    vec3 lensCol = texture2D(uBackground, clamp(lensUv, 0.01, 0.99)).rgb;
    lensCol.r = texture2D(uBackground, clamp(lensUv - ring * uvShift * 0.008, 0.01, 0.99)).r;
    lensCol.b = texture2D(uBackground, clamp(lensUv + ring * uvShift * 0.010, 0.01, 0.99)).b;
    float edgeFade = smoothstep(0.0, 0.55, r);
    vec3 col = lensCol * edgeFade;
    float alpha = clamp((1.0 - edgeFade) + ring * 0.85 * edgeFade * (1.0 - smoothstep(0.86, 1.0, uLoaded)), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function OpeningIris() {
  const mesh = useRef<Mesh>(null);
  const size = useThree((state) => state.size);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: IRIS_VERTEX,
        fragmentShader: IRIS_FRAGMENT,
        uniforms: {
          uBackground: { value: null },
          uLoaded: { value: 1 },
          uAspect: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const active = openingShared.eased < 0.999;
    m.visible = active;
    if (!active) return;
    material.uniforms.uBackground.value = sceneBackgroundShared.texture;
    material.uniforms.uLoaded.value = openingShared.eased;
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, -10);

  return (
    <mesh
      ref={mesh}
      frustumCulled={false}
      material={material}
      renderOrder={999}
      userData={{ skipRefractCapture: true }}
      visible={false}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

const VERTEX = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uBackground;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uTime;
  uniform sampler2D uFluid;
  uniform float uFluidMix;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;

  const float REFRACT_POWER = ${GLASS_PARAMS.refractPower.toFixed(3)};
  const float ROUGHNESS = ${GLASS_PARAMS.roughness.toFixed(3)};
  const float F0 = ${GLASS_PARAMS.f0.toFixed(3)};

  // Precision-safe sin-less hash bounded on a 256x256 lattice: eliminates Metal scanline banding (W8 Q5).
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(mod(p, 256.0).xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
      mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // REA section 3 GGX distribution (a2 = roughness^4).
  float ggx(float dNH, float roughness) {
    if (dNH <= 0.0) return 0.0;
    float a = roughness * roughness;
    float a2 = a * a;
    float d = dNH * dNH * (a2 - 1.0) + 1.0;
    return a2 / (3.14159265 * d * d);
  }

  // Crisp architectural studio cubemap proxy: bright overhead/diagonal light strips + architectural grid mullions
  // (stands in for reference /envmap/*.png studio reflections so crystal facets carry crisp internal detail).
  vec3 studioEnv(vec3 r) {
    float up = smoothstep(-0.4, 0.85, r.y);
    vec3 base = mix(vec3(0.04, 0.035, 0.11), vec3(0.42, 0.39, 0.68), up);
    vec2 envUv = vec2(atan(r.x, r.z) * 1.91, r.y * 2.6);
    vec2 g = abs(fract(envUv * 4.5) - 0.5) / max(fwidth(envUv * 4.5), vec2(0.015));
    float mullion = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
    float panelBox = smoothstep(-0.15, 0.35, sin(envUv.x * 3.14159) * cos(envUv.y * 2.4));
    float stripA = pow(max(dot(r, normalize(vec3(-0.52, 0.62, 0.58))), 0.0), 22.0);
    float stripB = pow(max(dot(r, normalize(vec3(0.64, 0.42, 0.64))), 0.0), 26.0);
    float violetRim = pow(max(dot(r, normalize(vec3(0.75, -0.18, 0.52))), 0.0), 6.0);
    return base * (0.75 + 0.55 * panelBox)
      + vec3(0.42, 0.38, 0.78) * mullion * 0.55
      + vec3(1.55) * stripA
      + vec3(1.25, 1.28, 1.45) * stripB
      + vec3(0.48, 0.28, 1.0) * violetRim;
  }

  // Smooth prismatic crown across the three strokes of the Y so flat extrusion caps bend and disperse
  // the grid/wordmark like a cut triangular prism without discontinuous derivative jumps.
  vec2 yPrismCrown(vec2 p) {
    vec2 stemGrad = vec2(clamp(p.x / 0.27, -1.0, 1.0), 0.0);
    float stemWeight = 1.0 - smoothstep(-0.02, 0.16, p.y);
    vec2 nL = normalize(vec2(0.81, 0.69));
    float dL = dot(p - vec2(0.0, 0.09), nL);
    vec2 nR = normalize(vec2(-0.81, 0.69));
    float dR = dot(p - vec2(0.0, 0.09), nR);
    float side = smoothstep(-0.04, 0.04, p.x);
    vec2 armNormal = mix(nL * clamp(dL / 0.24, -1.0, 1.0), nR * clamp(dR / 0.24, -1.0, 1.0), side);
    float armWeight = smoothstep(-0.04, 0.16, p.y);
    vec2 crown = mix(stemGrad, armNormal, armWeight);
    float signedDist = mix(p.x / 0.27, mix(dL / 0.24, dR / 0.24, side), armWeight);
    float smoothSign = clamp(signedDist * 5.0, -1.0, 1.0);
    vec2 ridgeDir = mix(vec2(1.0, 0.0), mix(nL, nR, side), armWeight);
    return crown * 0.30 + ridgeDir * smoothSign * 0.16;
  }

  void main() {
    vec3 geomNormal = normalize(vViewNormal);
    if (!gl_FrontFacing) geomNormal = -geomNormal;

    // Apply prismatic crystal facets on the flat extrusion faces while keeping bevel normals crisp.
    float flatCap = smoothstep(0.65, 0.96, abs(geomNormal.z));
    vec2 crownXY = yPrismCrown(vLocal.xy);
    // REA section 3: noiseScale = 9, roughness = smoothstep(0.3, 0.8, noise2) * uRoughness (0.1).
    vec2 nUv = vLocal.xy * 4.5 + 2.5;
    float n1 = valueNoise(nUv);
    float n2 = valueNoise(vLocal.xy * 9.0 + (n1 - 0.5) * 2.0);
    float surfRoughness = smoothstep(0.3, 0.8, n2) * ROUGHNESS;

    vec3 normal = normalize(geomNormal + vec3(crownXY * flatCap, 0.0));
    vec3 viewDir = normalize(-vViewPosition);
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));

    vec2 flow = texture2D(uFluid, uv).xy * ${(FLUID_PARAMS.displayScale / 2).toFixed(6)} * uFluidMix;
    float flowAmount = length(flow);
    vec2 refractNormal = normal.xy * (1.0 - normal.z * 0.7) + flow * 0.05;

    // 8 stratified Golden-angle samples anchored cleanly to pixel coordinates (no scanline banding).
    vec2 pix = floor(gl_FragCoord.xy);
    float baseRand = hash12(pix);
    vec3 refractCol = vec3(0.0);
    for (int i = 0; i < ${GLASS_PARAMS.samples}; i++) {
      float fi = float(i);
      float angle = (fi * 2.39996323) + baseRand * 6.2831853;
      float radius = sqrt((fi + 0.5) / ${GLASS_PARAMS.samples.toFixed(1)});
      vec2 roughnessDir = vec2(cos(angle), sin(angle)) * radius * surfRoughness * 0.14;
      float slide = (1.0 + min(flowAmount, 1.0) * 0.4) * ${GLASS_PARAMS.slideBase.toFixed(3)}
        + hash12(pix + vec2(fi * 17.0, fi * 31.0)) * ${GLASS_PARAMS.slideRandom.toFixed(3)};
      vec2 uvR = clamp(uv + roughnessDir - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[0].toFixed(1)}), 0.002, 0.998);
      vec2 uvG = clamp(uv + roughnessDir - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[1].toFixed(1)}), 0.002, 0.998);
      vec2 uvB = clamp(uv + roughnessDir - refractNormal * (REFRACT_POWER + slide * ${GLASS_PARAMS.slide[2].toFixed(1)}), 0.002, 0.998);
      vec3 bg = vec3(
        texture2D(uBackground, uvR).r,
        texture2D(uBackground, uvG).g,
        texture2D(uBackground, uvB).b
      );
      refractCol += bg * ${GLASS_PARAMS.sampleGain.toFixed(1)};
    }
    vec3 c = refractCol / ${GLASS_PARAMS.samples.toFixed(1)};

    // Crisp refracted room lattice & emitter dots seen through the crystal lens (derivatives taken from
    // continuous screen uv so prism facet ridges stay completely free of moire).
    vec2 refrUv = uv - refractNormal * REFRACT_POWER * 1.15;
    vec2 baseCellFw = max(fwidth(uv * vec2(48.0, 30.0)), vec2(0.002));
    vec2 cellCoord = refrUv * vec2(48.0, 30.0);
    vec2 cellDist = abs(fract(cellCoord) - 0.5) / baseCellFw;
    float refrGrid = 1.0 - clamp(min(cellDist.x, cellDist.y), 0.0, 1.0);
    vec2 baseSubFw = max(fwidth(uv * vec2(192.0, 120.0)), vec2(0.008));
    vec2 subCoord = refrUv * vec2(192.0, 120.0);
    vec2 subDist = abs(fract(subCoord) - 0.5) / baseSubFw;
    float refrSub = 1.0 - clamp(min(subDist.x, subDist.y), 0.0, 1.0);
    vec2 dotLocal = fract(refrUv * vec2(384.0, 240.0)) - 0.5;
    float emitterDot = 1.0 - smoothstep(0.22, 0.44, length(dotLocal));
    float panelPatch = smoothstep(0.25, 0.85, valueNoise(floor(cellCoord * 0.35) + 3.1));
    c += vec3(0.22, 0.18, 0.52) * panelPatch * (0.35 + 0.65 * emitterDot) * 0.55;
    c += vec3(0.52, 0.48, 0.86) * (refrGrid * 0.62 + refrSub * 0.26) * (1.0 - surfRoughness * 3.0);

    // Subtle crisp white-violet prism apex highlight (no neon green stripe).
    float facetCrease = exp(-abs(vLocal.x) * 38.0) * (1.0 - smoothstep(-0.02, 0.14, vLocal.y))
      + exp(-abs(dot(vLocal.xy - vec2(0.0, 0.09), normalize(vec2(0.81, 0.69)))) * 38.0) * step(vLocal.x, 0.02) * smoothstep(0.0, 0.12, vLocal.y)
      + exp(-abs(dot(vLocal.xy - vec2(0.0, 0.09), normalize(vec2(-0.81, 0.69)))) * 38.0) * step(-0.02, vLocal.x) * smoothstep(0.0, 0.12, vLocal.y);

    // REA section 3 lighting: GGX specular + Fresnel studio reflection + bevel dispersion rim (W8 C3, C4, c).
    float nv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float geomNv = clamp(dot(geomNormal, viewDir), 0.0, 1.0);
    float F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);

    vec3 L1 = normalize(vec3(-1.0, 0.8, 1.0));
    vec3 L2 = normalize(vec3(0.85, 0.55, 0.9));
    float spec1 = ggx(clamp(dot(normal, normalize(L1 + viewDir)), 0.0, 1.0), 0.035 + surfRoughness * 0.4);
    float spec2 = ggx(clamp(dot(geomNormal, normalize(L2 + viewDir)), 0.0, 1.0), 0.045 + surfRoughness * 0.35);
    c += vec3(min(spec1, 2.4)) + vec3(min(spec2, 1.8)) * 0.65;

    vec3 reflected = studioEnv(reflect(-viewDir, normal));
    c += mix(c, reflected, F * 0.9) * (1.0 - F);

    // Prismatic bevel rim: crisp brilliant white outer edge + rainbow dispersion band along the bevel.
    float bevel = smoothstep(0.22, 0.75, 1.0 - geomNv);
    float innerBevel = bevel * smoothstep(0.96, 0.46, 1.0 - geomNv);
    float edgeLine = pow(1.0 - geomNv, 2.6);
    float phase = bevel * 2.6 + geomNormal.x * 1.2 - geomNormal.y * 0.9 + vLocal.y * 0.7;
    vec3 rainbow = 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
    c += rainbow * innerBevel * 0.56
      + vec3(0.96, 0.97, 1.0) * edgeLine * 1.18
      + vec3(0.86, 0.84, 1.0) * facetCrease * 0.34;

    c *= ${GLASS_PARAMS.output.toFixed(1)};
    gl_FragColor = vec4(min(c, vec3(1.0)), clamp(uOpacity, 0.0, 1.0));
  }
`;

export type RefractGlassProps = {
  geometry: BufferGeometry;
  opacity: number;
  visible: boolean;
  inHero?: boolean;
};

export function RefractGlass({ geometry, opacity, visible, inHero = false }: RefractGlassProps) {
  const mesh = useRef<Mesh>(null);
  const propsRef = useRef({ opacity, inHero });
  propsRef.current = { opacity, inHero };
  const drawingSize = useMemo(() => new Vector2(1, 1), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uBackground: { value: null },
          uResolution: { value: new Vector2(1, 1) },
          uOpacity: { value: 1 },
          uTime: { value: 0 },
          uFluid: { value: null },
          uFluidMix: { value: 0 },
        },
        transparent: true,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    const target = mesh.current;
    if (!target) return;
    target.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(drawingSize);
      const { opacity: baseOpacity, inHero: heroStage } = propsRef.current;
      const entrance = heroStage ? openingShared.glyphOpacity : 1;
      material.uniforms.uOpacity.value = baseOpacity * entrance;
      material.uniforms.uBackground.value = sceneBackgroundShared.texture;
      material.uniforms.uResolution.value.set(Math.max(1, drawingSize.x), Math.max(1, drawingSize.y));
      material.uniforms.uTime.value = performance.now() / 1000;
      material.uniforms.uFluid.value = fluidShared.texture;
      material.uniforms.uFluidMix.value = fluidShared.texture ? fluidShared.mix : 0;
    };
    return () => {
      target.onBeforeRender = () => {};
    };
  }, [drawingSize, material]);

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  material.uniforms.uOpacity.value = opacity;
  material.depthWrite = opacity > 0.55;

  return <mesh ref={mesh} geometry={geometry} material={material} visible={visible} frustumCulled={false} />;
}
