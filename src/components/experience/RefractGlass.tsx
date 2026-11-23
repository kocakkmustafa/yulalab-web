"use client";

import { useEffect, useMemo, useRef } from "react";
import { FLUID_PARAMS, fluidShared } from "./MouseFluid";
import { openingShared } from "./opening";
import {
  type BufferGeometry,
  LinearFilter,
  type Mesh,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";

/**
 * W1D-D H1-c: the glass Y as a refraction shader of our own, with the measured values of the reference
 * (REA section 3): refract power 0.1, per-channel slide x1 / x2 / x4, eight roughness-jittered
 * taps, Fresnel f0 0.1 and output x1.2. The already drawn frame is copied before the Y is rendered.
 * The reference uses noise and environment textures; this implementation approximates those sources.
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

/** The reference samples a 512 × 512 copy of the already drawn frame. */
const BACKDROP_SIZE = 512;

const VERTEX = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLocal = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uBackground;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uTime;
  uniform sampler2D uFluid;
  uniform float uFluidMix;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  varying vec2 vUv;

  const float REFRACT_POWER = ${GLASS_PARAMS.refractPower.toFixed(3)};
  const float ROUGHNESS = ${GLASS_PARAMS.roughness.toFixed(3)};
  const float F0 = ${GLASS_PARAMS.f0.toFixed(3)};

  float hash(vec2 p) {
    // W8-10: sine-free hash; the sine hash left horizontal line banding inside the glass.
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  // Smooth value noise stands in for the reference's unavailable animated noise texture.
  float noise2d(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x), f.y);
  }
  float refRandom(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  float ggx(float nh, float a) {
    float a2 = a * a;
    a2 *= a2;
    if (nh <= 0.0) return 0.0;
    float d = nh * nh * (a2 - 1.0) + 1.0;
    return a2 / (3.14159265 * d * d);
  }
  vec3 studio(vec3 r) {
    float up = smoothstep(-0.2, 0.9, r.y);
    vec3 c = mix(vec3(0.02, 0.02, 0.05), vec3(0.55, 0.55, 0.62), up);
    c += vec3(1.1) * pow(max(dot(r, normalize(vec3(-0.45, 0.6, 0.65))), 0.0), 18.0);
    c += vec3(0.5, 0.35, 1.0) * pow(max(dot(r, normalize(vec3(0.8, -0.1, 0.4))), 0.0), 6.0) * 0.6;
    return c;
  }

  void main() {
    vec3 normal = normalize(vViewNormal);
    if (!gl_FrontFacing) normal = -normal;
    // Hand-polished slab: a slow swell over the flat faces (the reference letter is faceted), so the
    // background bends across the whole letter and not only at the bevels.
    vec2 swell = vec2(sin(vLocal.x * 5.0 + vLocal.y * 2.3 + uTime * 0.3), sin(vLocal.y * 4.6 - vLocal.x * 3.1 - uTime * 0.25));
    normal = normalize(normal + vec3(swell * 0.0, 0.0));
    vec3 viewDir = normalize(-vViewPosition);
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Bend the background by the surface normal, a little more for every colour channel.
    // Mouse fluid: the flow under the letter pushes the bent background and spreads the colour channels.
    vec2 flow = texture2D(uFluid, uv).xy * ${(FLUID_PARAMS.displayScale / 2).toFixed(6)} * uFluidMix;
    float flowAmount = length(flow);
    vec3 flowTint = 0.5 + 0.5 * cos(6.2832 * (atan(flow.y, flow.x) / 6.2832 + vec3(0.0, 0.33, 0.67)));
    vec2 refractNormal = normal.xy * (1.0 - normal.z * 0.7) + flow * 0.06;
    // The reference warps a second noise lookup with a 9x lookup. Its source texture is
    // not available here, so use smooth procedural noise at the same UV scales.
    vec2 noiseWarp = vec2(noise2d(vUv * 9.0), noise2d(vUv * 9.0 + 17.0));
    float roughness = smoothstep(0.3, 0.8, noise2d(vUv + (noiseWarp - 0.5) * 2.0)) * ROUGHNESS;
    vec3 transmitted = vec3(0.0);
    for (int i = 0; i < ${GLASS_PARAMS.samples}; i++) {
      float fi = float(i);
      float slide = ${GLASS_PARAMS.slideBase.toFixed(3)} + refRandom(uv + fi * 0.2) * ${GLASS_PARAMS.slideRandom.toFixed(3)};
      vec2 roughnessDir = vec2(refRandom(uv + fi * 0.1) - 0.5, refRandom(uv + fi * 0.2) - 0.5) * roughness * 0.3;
      vec2 base = uv + roughnessDir - refractNormal * REFRACT_POWER;
      vec3 sampleColor;
      sampleColor.r = texture2D(uBackground, clamp(base - refractNormal * slide * ${GLASS_PARAMS.slide[0].toFixed(1)}, 0.0, 1.0)).r;
      sampleColor.g = texture2D(uBackground, clamp(base - refractNormal * slide * ${GLASS_PARAMS.slide[1].toFixed(1)}, 0.0, 1.0)).g;
      sampleColor.b = texture2D(uBackground, clamp(base - refractNormal * slide * ${GLASS_PARAMS.slide[2].toFixed(1)}, 0.0, 1.0)).b;
      transmitted += sampleColor * ${GLASS_PARAMS.sampleGain.toFixed(1)};
    }
    vec3 c = transmitted / ${GLASS_PARAMS.samples.toFixed(1)};
    // W8-10: contrast of the bent background (grid lines read through the letter); W8-9: a touch less colour.
    // W8-20: contrast 1.7 to 2.4 for interior detail; W8-18: the saturation mix drops 0.85 to 0.6 so saturated pixels stay near the reference share.
    // W8-49: contrast only on the dark tones; bright samples (the white wordmark behind the glass) keep a soft shoulder to white,
    // so the U right arm and the L stem read white through the glass instead of a lavender ceiling. Smooth blend, no hard seam.
    // W8-55: portrait phones see the wordmark dimmer through the glass, so the white knee starts lower (0.45-0.7 instead of 0.65-0.9).
    float portrait = step(uResolution.x, uResolution.y);
    float rawLum = dot(c, vec3(0.3, 0.5, 0.2));
    float brightMask = smoothstep(mix(0.65, 0.45, portrait), mix(0.9, 0.7, portrait), rawLum);
    // W8-58: frost at the letter edge. Six wide taps (about 8 px) measure how much of the neighbourhood is white; where the share is
    // partial the white knee is dithered by a per-pixel hash, so the letter breaks up into grain across a 6-10 px band instead of one hard cut.
    // Inside the letter (share 1) and outside (share 0) nothing changes.
    vec2 frostBase = uv - refractNormal * REFRACT_POWER;
    float frostHits = 0.0;
    for (int k = 0; k < 6; k++) {
      float ka = float(k) * 1.0472 + hash(gl_FragCoord.xy * 0.53) * 1.2;
      vec2 off = vec2(cos(ka), sin(ka)) * (4.0 + 4.0 * hash(gl_FragCoord.xy + float(k) * 9.1)) / uResolution;
      vec3 tapC = texture2D(uBackground, clamp(frostBase + off, 0.0, 1.0)).rgb;
      frostHits += step(mix(0.65, 0.45, portrait) + 0.1, dot(tapC, vec3(0.3, 0.5, 0.2)));
    }
    float frostShare = frostHits / 6.0;
    float frostEdge = 4.0 * frostShare * (1.0 - frostShare);
    brightMask = mix(brightMask, step(hash(gl_FragCoord.xy * 0.73 + 3.7), frostShare), frostEdge);
    // W8-56: portrait glass is a navy body: weaker grid contrast and a low colour mix away from the white letters.
    vec3 contrasted = max(vec3(0.15) + (c - vec3(0.15)) * mix(mix(2.4, 1.5, portrait), 1.0, brightMask), vec3(0.0)); // pivot 0.15: dark tiles no longer clip to black
    c = mix(vec3(dot(contrasted, vec3(0.3, 0.5, 0.2))), contrasted, mix(mix(0.95, 0.3, portrait), 0.66, brightMask) * (1.0 - 0.2 * smoothstep(0.1, 0.3, vLocal.y))); // W8-60: arms 20 percent less colour
    // W8-57: the knee ends on one full white tone (x1.2 output clamps to 1.0), no 240/255 ceiling inside the glass.
    c = mix(c, vec3(0.86), brightMask);
    // W8-45: fixed fine grain (no time term, no flicker) gives the glass the gritty interior of the reference; W8-57: none on the white letter face.
    c += (hash(gl_FragCoord.xy * 0.91) - 0.5) * 0.11 * vec3(1.0, 0.9, 1.0) * (1.0 - brightMask);

    float nv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
    vec3 reflected = studio(reflect(-viewDir, normal));
    vec3 lightDir = normalize(vec3(-1.0, 0.8, 1.0));
    float spec = ggx(clamp(dot(normal, normalize(lightDir + viewDir)), 0.0, 1.0), 0.003 + roughness * 0.4);
    // Reference adds the Fresnel-weighted reflection to the transmitted colour.
    c += mix(c, reflected, fresnel * 0.9) * (1.0 - fresnel);
    // W7 CY15: the flow no longer tints the glass.
    c += flowTint * flowAmount * 0.0;
    float rim = pow(1.0 - nv, 2.6);
    // W8-59: spectrum phase from normal.x 0.35 to 0.6 so the body facets read as a second contour.
    vec3 spectrum = 0.5 + 0.5 * cos(6.2832 * (rim * 3.5 + normal.x * 0.6 + vLocal.y * 0.5 + vec3(0.0, 0.33, 0.67)));
    // W7 CY7: no spectrum band on the glass rim.
    // W8-9: the spectral band is confined to the last few pixels of the rim and a thin white line closes it.
    // W8-18/19: weaker (0.7 to 0.3) and pushed to the rim tip so the colour parts into a thin rainbow edge, not a wall tint.
    c += spectrum * smoothstep(0.7, 0.95, rim) * 0.8;
    c += vec3(smoothstep(0.84, 0.96, rim)) * 0.9;
    c += vec3(min(spec, 1.5));
    // A restrained violet transmission makes the clear face legible even over dark tiles.
    c += vec3(0.0275, 0.0125, 0.065) * (1.0 - rim) * (1.0 - smoothstep(0.4, 0.75, rim)); // W8-18: halved
    // W8-38: portrait phones bend a much darker backdrop (interior about 33,28,58 against the reference 98,87,169 on desktop);
    // a violet interior lift (fades out toward the rim) brings the face to the reference colour.
    // W8-46: the reference phone glass is dark navy (saturated share about 6 percent), not violet: darken the face, no lift.
    // W8-52: 0.55 to 0.30 darkening plus a navy floor (reference phone glass is dark navy, V about 0.25-0.40); it was invisible.
    float faceMask = 1.0 - smoothstep(0.4, 0.75, rim);
    c *= 1.0 - 0.30 * portrait * faceMask;
    c += vec3(0.02, 0.03, 0.07) * portrait * faceMask * (1.0 - brightMask); // W8-56: navy floor, less blue
    // W7 CY9/CY11: lift the bent background so the grid shows through the letter (interior ~64 of 255).

    c *= 1.0 + 0.05 * smoothstep(0.0, 0.4, vLocal.x) * smoothstep(0.0, 0.4, vLocal.y); // W7 BT6: top right interior
    c *= ${GLASS_PARAMS.output.toFixed(1)};
    // W7 CY9: the glass is opaque (milky) as soon as it is on; uOpacity only fades it in and out.
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
  const material = useMemo(
    () => new ShaderMaterial({
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
      // Keep the framebuffer copy at the reference texture resolution.
      if (current && (current.width !== BACKDROP_SIZE || current.height !== BACKDROP_SIZE)) {
        current.dispose();
        current = null;
        texture.current = null;
      }
      if (!current) {
        current = new WebGLRenderTarget(BACKDROP_SIZE, BACKDROP_SIZE, { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
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
      gl.blitFramebuffer(0, 0, width, height, 0, 0, BACKDROP_SIZE, BACKDROP_SIZE, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    };
    return () => {
      target.onBeforeRender = () => {};
    };
  }, [material, size]);

  useEffect(() => () => {
    texture.current?.dispose();
    material.dispose();
  }, [material]);

  material.uniforms.uOpacity.value = opacity;
  material.depthWrite = opacity > 0.55;

  return <mesh ref={mesh} geometry={geometry} material={material} visible={visible} frustumCulled={false} />;
}
