"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, ShaderMaterial, type Points, type Texture } from "three";
import { pointScanGrid, pointScanState } from "./point-scan";
import type { QualityTier } from "./types";

/**
 * Point-cloud scan of a value panel's own media (our answer to a scanned
 * point-cloud section): each point samples the panel image, is lifted by its
 * luminance into a shallow relief and is rebuilt by a scan front; a sparse
 * floor of points grounds it. Our own shader; driven only by the timeline.
 */

const VERTEX = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFront;
  uniform float uAssemble;
  uniform float uOpacity;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uLight;
  attribute vec2 aUv;
  attribute vec3 aSeed;
  attribute float aFloor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    vec3 tex = texture2D(uMap, aUv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    float ahead = uFront - aUv.x + (aSeed.x - 0.5) * 0.05;
    float built = smoothstep(0.0, 0.16, ahead);
    float glow = exp(-abs(ahead) * 34.0);
    float alpha = (0.38 + lum * 0.9) * mix(0.3, 1.0, built);
    if (aFloor > 0.5) {
      tex = vec3(0.62, 0.68, 0.74);
      built = smoothstep(0.0, 0.35, uAssemble * 1.2 - aSeed.y * 0.4);
      glow = 0.0;
      alpha = (1.0 - abs(aUv.y - 0.5) * 2.0) * (1.0 - abs(aUv.x - 0.5) * 1.6) * 0.55 * built;
    } else {
      p.z += lum * 0.55;
    }
    p += (aSeed - 0.5) * vec3(2.8, 1.9, 3.6) * (1.0 - built);
    vColor = mix(tex, vec3(0.78, 0.94, 1.0), 0.22) + glow * vec3(0.55, 0.85, 1.0);
    // Light rooms: ink-toned points with normal blending, so the cloud reads on white.
    vColor = mix(vColor, mix(vec3(0.07, 0.09, 0.13), tex * 0.45, 0.35) + glow * vec3(0.0, 0.25, 0.55), uLight);
    alpha = mix(alpha, alpha * 0.85 + 0.12, uLight);
    vAlpha = uOpacity * alpha;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + glow * 0.9) / max(0.5, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.18, d));
  }
`;

/** Deterministic seeds so capture frames match between runs. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function PointScan({ texture, width, height, progress, opacity, tier, light }: {
  texture: Texture;
  width: number;
  height: number;
  progress: number;
  opacity: number;
  tier: QualityTier;
  /** The room behind the panel is light (white crossing or light theme). */
  light: boolean;
}) {
  const points = useRef<Points>(null);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  // Phone panels are smaller on screen; keep the points as fine as on desktop.
  const narrow = useThree((state) => state.size.width < 768);
  const [columns, rows] = pointScanGrid(tier);

  const geometry = useMemo(() => {
    const floorColumns = Math.round(columns * 0.6);
    const floorRows = Math.round(rows * 0.28);
    const count = columns * rows + floorColumns * floorRows;
    const position = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const seed = new Float32Array(count * 3);
    const floor = new Float32Array(count);
    const random = seeded(columns * 7919 + rows);
    let i = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1, i += 1) {
        const u = (column + 0.5) / columns;
        const v = (row + 0.5) / rows;
        position.set([(u - 0.5) * width, (v - 0.5) * height, 0], i * 3);
        uv.set([u, v], i * 2);
        seed.set([random(), random(), random()], i * 3);
      }
    }
    for (let row = 0; row < floorRows; row += 1) {
      for (let column = 0; column < floorColumns; column += 1, i += 1) {
        const u = (column + 0.5) / floorColumns;
        const v = (row + 0.5) / floorRows;
        position.set([(u - 0.5) * width * 1.5, -height * 0.56, (v - 0.5) * 3], i * 3);
        uv.set([u, v], i * 2);
        seed.set([random(), random(), random()], i * 3);
        floor[i] = 1;
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(position, 3));
    result.setAttribute("aUv", new BufferAttribute(uv, 2));
    result.setAttribute("aSeed", new BufferAttribute(seed, 3));
    result.setAttribute("aFloor", new BufferAttribute(floor, 1));
    return result;
  }, [columns, rows, width, height]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uMap: { value: texture },
          uFront: { value: 0 },
          uAssemble: { value: 0 },
          uOpacity: { value: 0 },
          uSize: { value: (tier === "low" ? 34 : 26) * (narrow ? 0.72 : 1) },
          uPixelRatio: { value: pixelRatio },
          uLight: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [narrow, pixelRatio, texture, tier],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const state = pointScanState(progress);
    material.uniforms.uFront.value = state.front;
    material.uniforms.uAssemble.value = state.assemble;
    material.uniforms.uOpacity.value = state.pointOpacity * opacity;
    material.uniforms.uLight.value = light ? 1 : 0;
    const blending = light ? NormalBlending : AdditiveBlending;
    if (material.blending !== blending) {
      material.blending = blending;
      material.needsUpdate = true;
    }
    if (points.current) points.current.visible = state.pointOpacity * opacity > 0.002;
  }, -44);

  return <points ref={points} geometry={geometry} material={material} renderOrder={1.5} frustumCulled={false} />;
}
