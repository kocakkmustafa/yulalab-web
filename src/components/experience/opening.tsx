"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  LinearFilter,
  type Mesh,
  type Object3D,
  RGBAFormat,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  UnsignedByteType,
  WebGLRenderTarget,
} from "three";

/**
 * W8: the opening (circular iris / eye opening) carried over from the C candidate onto the B glass.
 * The glass material itself lives in RefractGlass.tsx; this file only owns the shared opening clock,
 * the low-resolution backdrop pass the iris samples, and the iris overlay.
 */
const BACKDROP_SIZE = 1024;

export const OPENING_DURATION_SECONDS = 2.66;
/**
 * W8-5 / W8-24: the lens stays dark for the first part of the clock so the frame brightness through the loader
 * window stays at the reference level; W8-24 moves its start from ~4.2 s to ~4.8-5.2 s (reference 5.0 s). The clock
 * ends at 2.66 s (was 4.0) so the eased curve settles at ~5.8 s as before.
 */
export const OPENING_LENS_DELAY_SECONDS = 1.2;

/**
 * W8-39: scene dolly of the opening (glass and wordmark move together, as one scene camera). Knots are the reference's
 * normalised wordmark scale against the opening clock (clock 0 = loader window end - 3.65 s): 0.05 at 4.88 s, 1.03 at
 * 5.38 s, 1.16 at 5.6-6.0 s, 1.0 at 7.0 s.
 */
export const OPENING_DOLLY_END_SECONDS = 3.35;
const OPENING_DOLLY_KNOTS: ReadonlyArray<readonly [number, number]> = [
  [1.23, 0.05],
  [1.48, 0.58],
  [1.73, 1.03],
  [1.97, 1.16],
  [2.35, 1.16],
  [2.75, 1.05],
  [3.35, 1.0],
];

/** Monotone cubic Hermite through the knots (Fritsch-Carlson), so the peak does not overshoot the 1.16 knots. */
export function openingScale(rawTime: number): number {
  const k = OPENING_DOLLY_KNOTS;
  const n = k.length;
  if (rawTime <= k[0][0]) return k[0][1];
  if (rawTime >= k[n - 1][0]) return k[n - 1][1];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i += 1) d.push((k[i + 1][1] - k[i][1]) / (k[i + 1][0] - k[i][0]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i += 1) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = Math.hypot(a, b);
    if (h > 3) { m[i] = (3 * a / h) * d[i]; m[i + 1] = (3 * b / h) * d[i]; }
  }
  let i = 0;
  while (i < n - 2 && rawTime > k[i + 1][0]) i += 1;
  const w = k[i + 1][0] - k[i][0];
  const t = (rawTime - k[i][0]) / w;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * k[i][1] + (t3 - 2 * t2 + t) * w * m[i] + (-2 * t3 + 3 * t2) * k[i + 1][1] + (t3 - t2) * w * m[i + 1];
}

export function openingLinear(rawTime: number): number {
  const span = OPENING_DURATION_SECONDS - OPENING_LENS_DELAY_SECONDS;
  return Math.min(1, Math.max(0, (rawTime - OPENING_LENS_DELAY_SECONDS) / span));
}

/**
 * Shared non-reactive opening state driven in useFrame so the 3.0 s opening
 * runs at 60 fps without triggering React tree re-renders.
 */
export const openingShared = {
  rawTime: OPENING_DOLLY_END_SECONDS,
  progress: 1,
  eased: 1,
  glyphOpacity: 1,
  scale: 1,
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
      openingShared.scale = openingScale(0);
      invalidate();
      return;
    }
    if (wasOpenedOnMount.current && !activeOpening.current) {
      openingShared.rawTime = OPENING_DOLLY_END_SECONDS;
      openingShared.progress = 1;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
      openingShared.scale = 1;
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
      openingShared.scale = openingScale(0);
      return;
    }
    if (!activeOpening.current) {
      openingShared.rawTime = OPENING_DOLLY_END_SECONDS;
      openingShared.progress = 1;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
      openingShared.scale = 1;
      return;
    }
    const dt = Math.min(1 / 20, Math.max(0, delta));
    openingShared.rawTime = Math.min(OPENING_DOLLY_END_SECONDS, openingShared.rawTime + dt);
    const linear = openingLinear(openingShared.rawTime);
    openingShared.progress = linear;
    openingShared.eased = openingCurve(linear);
    // W8 T5: the glass Y fades in over 1.0 s during the opening instead of waiting pre-baked behind the loader.
    openingShared.glyphOpacity = smoothstep01((openingShared.rawTime - OPENING_LENS_DELAY_SECONDS - 0.08) / 1.0);
    openingShared.scale = openingScale(openingShared.rawTime);
    if (openingShared.rawTime < OPENING_DOLLY_END_SECONDS) {
      invalidate();
    } else {
      activeOpening.current = false;
      openingShared.eased = 1;
      openingShared.glyphOpacity = 1;
      openingShared.scale = 1;
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
    const rt = new WebGLRenderTarget(BACKDROP_SIZE, BACKDROP_SIZE, {
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
    lensCol.r = texture2D(uBackground, clamp(lensUv - ring * uvShift * 0.0008, 0.01, 0.99)).r;
    lensCol.b = texture2D(uBackground, clamp(lensUv + ring * uvShift * 0.0010, 0.01, 0.99)).b;
    float edgeFade = smoothstep(0.0, 0.55, r);
    // W8-61: the colour stays the lens colour; multiplying it by edgeFade greyed the white scene behind the rim.
    vec3 col = lensCol;
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
