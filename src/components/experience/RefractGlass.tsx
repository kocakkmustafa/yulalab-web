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
 * (REA section 3): refract power 0.1, per-channel slide x1 / x2 / x4 (0.005 + random * 0.007), eight jittered
 * taps at 0.9, roughness 0.1, Fresnel f0 0.1, output x1.2. The background is the frame drawn so far, copied
 * right before the Y is drawn (a framebuffer copy), so the grid and the purple light bend through the letter.
 * Written from the parameter table, no code taken from the reference.
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

/** W8-10: the copy of the drawn frame the glass bends; 1024 keeps grid lines crisp through the letter (was 512). */
const BACKDROP_SIZE = 1024;

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

  float hash(vec2 p) {
    // W8-10: sine-free hash; the sine hash left horizontal line banding inside the glass.
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float ggx(float nh, float a) {
    float a2 = a * a;
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
    // W7 BT9 CY7: the colour channels part only toward the rim (grazing normals); flat faces and the body stay one colour.
    float rimSplit = smoothstep(0.2, 0.6, 1.0 - clamp(dot(normal, viewDir), 0.0, 1.0));
    vec3 transmitted = vec3(0.0);
    for (int i = 0; i < ${GLASS_PARAMS.samples}; i++) {
      float fi = float(i);
      float slide = (1.0 + min(flowAmount, 1.0) * 0.5) * ${GLASS_PARAMS.slideBase.toFixed(3)} + hash(gl_FragCoord.xy * 0.37 + fi * 7.13) * ${GLASS_PARAMS.slideRandom.toFixed(3)};
      vec2 jitter = (vec2(hash(gl_FragCoord.xy + fi * 3.1), hash(gl_FragCoord.yx + fi * 5.7)) - 0.5) / uResolution * 0.75; // W7 BT3-3: tight jitter 0.02 (was 0.3, about 20 px blur) so grid lines survive inside the letter
      vec2 base = uv - refractNormal * REFRACT_POWER + jitter;
      vec3 sampleColor;
      sampleColor.r = texture2D(uBackground, clamp(base - refractNormal * slide * (${GLASS_PARAMS.slide[1].toFixed(1)} + (${GLASS_PARAMS.slide[0].toFixed(1)} - ${GLASS_PARAMS.slide[1].toFixed(1)}) * rimSplit), 0.0, 1.0)).r;
      sampleColor.g = texture2D(uBackground, clamp(base - refractNormal * slide * ${GLASS_PARAMS.slide[1].toFixed(1)}, 0.0, 1.0)).g;
      sampleColor.b = texture2D(uBackground, clamp(base - refractNormal * slide * (${GLASS_PARAMS.slide[1].toFixed(1)} + (${GLASS_PARAMS.slide[2].toFixed(1)} - ${GLASS_PARAMS.slide[1].toFixed(1)}) * rimSplit), 0.0, 1.0)).b;
      transmitted += sampleColor * ${GLASS_PARAMS.sampleGain.toFixed(1)};
    }
    vec3 c = transmitted / ${GLASS_PARAMS.samples.toFixed(1)};
    // W8-10: contrast of the bent background (grid lines read through the letter); W8-9: a touch less colour.
    // W8-20: contrast 1.7 to 2.4 for interior detail; W8-18: the saturation mix drops 0.85 to 0.6 so saturated pixels stay near the reference share.
    c = max(vec3(0.3) + (c - vec3(0.3)) * 2.4, vec3(0.0));
    c = mix(vec3(dot(c, vec3(0.3, 0.5, 0.2))), c, 0.6);

    float nv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
    vec3 reflected = studio(reflect(-viewDir, normal));
    vec3 lightDir = normalize(vec3(-1.0, 0.8, 1.0));
    float spec = ggx(clamp(dot(normal, normalize(lightDir + viewDir)), 0.0, 1.0), 0.003 + ROUGHNESS * 0.4);
    // The letter is clear glass: what shows is the bent background. The Fresnel term and a thin spectral
    // rim ride on top at the grazing edges only (the first version added the background to itself, which
    // read as an opaque lilac solid).
    c = mix(c, reflected, fresnel * 0.9);
    // W7 CY15: the flow no longer tints the glass.
    c += flowTint * flowAmount * 0.0;
    float rim = pow(1.0 - nv, 2.6);
    vec3 spectrum = 0.5 + 0.5 * cos(6.2832 * (rim * 2.4 + normal.x * 0.35 + vLocal.y * 0.5 + vec3(0.0, 0.33, 0.67)));
    // W7 CY7: no spectrum band on the glass rim.
    // W8-9: the spectral band is confined to the last few pixels of the rim and a thin white line closes it.
    // W8-18/19: weaker (0.7 to 0.3) and pushed to the rim tip so the colour parts into a thin rainbow edge, not a wall tint.
    c += spectrum * smoothstep(0.55, 0.9, rim) * 0.3;
    c += vec3(smoothstep(0.84, 0.96, rim)) * 0.9;
    c += vec3(min(spec, 1.5));
    // A restrained violet transmission makes the clear face legible even over dark tiles.
    c += vec3(0.0275, 0.0125, 0.065) * (1.0 - rim); // W8-18: halved
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
