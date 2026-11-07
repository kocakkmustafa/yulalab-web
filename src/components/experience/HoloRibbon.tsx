"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, Mesh, NormalBlending, ShaderMaterial, Vector3 } from "three";
import { STAGES } from "./timeline";
import type { QualityTier, TimelineFrame } from "./types";

/**
 * Vision stage: a tall spectral ribbon sweeps diagonally across the glyph as
 * the stage scrolls. Our own shader (cosine spectrum + film grain), driven
 * only by timeline progress, so it adds no ambient frames and capture mode
 * renders it exactly. Phones and low tier get the same ribbon with a lighter
 * mesh.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  uniform float uBend;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uv.y * 3.14159) * uBend + sin(uv.x * 3.14159) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform float uOpacity;
  uniform float uPhase;
  uniform float uLight;
  vec3 spectrum(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }
  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    float t = vUv.y * 1.35 + vUv.x * 0.42 + uPhase;
    vec3 colour = mix(spectrum(t), vec3(1.0), 0.3 + 0.12 * uLight);
    float sheen = smoothstep(0.35, 0.5, vUv.x) * smoothstep(0.65, 0.5, vUv.x);
    colour += sheen * 0.18;
    float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x);
    float ends = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    colour -= grain(gl_FragCoord.xy) * 0.1;
    gl_FragColor = vec4(colour, uOpacity * edge * ends);
  }
`;

/** 0 outside the vision stage, eased in and out at its edges. */
export function holoRibbonState(frame: TimelineFrame) {
  const [start, end] = STAGES.vision;
  const local = (frame.progress - start) / (end - start);
  if (local <= -0.15 || local >= 1.15) return { opacity: 0, sweep: local };
  const fadeIn = Math.min(1, Math.max(0, (local + 0.15) / 0.3));
  const fadeOut = Math.min(1, Math.max(0, (1.15 - local) / 0.3));
  return { opacity: Math.min(fadeIn, fadeOut), sweep: local };
}

export function HoloRibbon({ frame, tier }: { frame: TimelineFrame; tier: QualityTier }) {
  const mesh = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const scratch = useMemo(() => ({ forward: new Vector3(), right: new Vector3(), up: new Vector3(), target: new Vector3() }), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uOpacity: { value: 0 }, uPhase: { value: 0 }, uBend: { value: 0.35 }, uLight: { value: 0 } },
        transparent: true,
        // The white crossing blade is drawn without depth at renderOrder 3.5
        // and paints over everything ordered before it; the ribbon follows it.
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    [],
  );
  const segments = tier === "low" ? 12 : 32;

  useFrame(() => {
    const node = mesh.current;
    if (!node) return;
    const { opacity, sweep } = holoRibbonState(frame);
    node.visible = opacity > 0.001;
    if (!node.visible) return;
    // The vision room is white whatever the display theme (whiteMix), and a
    // light theme lightens every room (themeMix): either way, additive light
    // would vanish into it, so the ribbon is painted normally there.
    const light = Math.max(frame.world.whiteMix, frame.world.themeMix);
    const blending = light > 0.5 ? NormalBlending : AdditiveBlending;
    if (material.blending !== blending) {
      material.blending = blending;
      material.needsUpdate = true;
    }
    material.uniforms.uOpacity.value = opacity * (light > 0.5 ? 0.82 : 0.55);
    material.uniforms.uPhase.value = sweep * 0.6;
    material.uniforms.uLight.value = light;

    // Sit just in front of the glyph (the white vision room's surfaces hide
    // anything behind it) and sweep across the frame from the leading side to
    // the trailing side, crossing the glass the way a light leak would.
    const { forward, right, up, target } = scratch;
    target.set(...frame.camera.target);
    forward.subVectors(target, camera.position);
    const distance = forward.length() * 0.86;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    up.crossVectors(right, forward).normalize();
    const portrait = viewport.width < viewport.height;
    const halfWidth = Math.tan(((frame.camera.fov ?? 40) * Math.PI) / 360) * distance * (viewport.width / viewport.height);
    const x = (sweep - 0.5) * halfWidth * (portrait ? 1.5 : 1.1);
    node.position.copy(camera.position).addScaledVector(forward, distance).addScaledVector(right, x).addScaledVector(up, 0);
    node.quaternion.copy(camera.quaternion);
    node.rotateZ(-0.42 + sweep * 0.12);
    node.rotateY(0.35 - sweep * 0.5);
    const height = Math.tan(((frame.camera.fov ?? 40) * Math.PI) / 360) * distance * 3.2;
    node.scale.set(height * (portrait ? 0.13 : 0.1), height, 1);
  });

  return (
    <mesh ref={mesh} visible={false} renderOrder={3.75} frustumCulled={false}>
      <planeGeometry args={[1, 1, 4, segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
