"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { segmentProgress, smoothstep } from "./timeline";
import type { ExperienceMode, TimelineFrame } from "./types";

/**
 * W6 K5: the Values slanted screen (reference `service` section). The rainbow surface the Y carries in K4
 * spreads into a 16:9 screen with the K5 picture on it. The screen is a real 3D slab placed in WORLD space
 * from the camera pose (not the live camera), so the pointer parallax of the camera rig moves it too.
 *
 * Final pose = the four corner points of the face as screen fractions (spec W6-yerlesim-sartnamesi.md). The
 * face is a planar rectangle turned about the vertical axis: both vertical edges sit at one depth each, with
 * the depth ratio equal to the inverse of the edge heights (467:338 on desktop).
 */
type Corners = {
  /** NDC-like screen fractions (0..1, y down) of left/right edges. */
  leftX: number;
  rightX: number;
  leftTop: number;
  leftBottom: number;
  rightTop: number;
  rightBottom: number;
  /** Depth of the left edge; the right edge depth follows from the height ratio. */
  leftDepth: number;
};

const FINAL: Record<ExperienceMode, Corners> = {
  desktop: {
    leftX: 113 / 1440,
    rightX: 915 / 1440,
    leftTop: 205 / 900,
    leftBottom: 672 / 900,
    rightTop: 262 / 900,
    rightBottom: 600 / 900,
    leftDepth: 6,
  },
  mobile: {
    leftX: -20 / 390,
    rightX: 360 / 390,
    leftTop: 230 / 844,
    leftBottom: 510 / 844,
    rightTop: 265 / 844,
    rightBottom: 470 / 844,
    leftDepth: 6,
  },
};

/** Start: the small side screen inside the Y (centre of the view, a quarter the size). */
function startCorners(mode: ExperienceMode): Corners {
  const f = FINAL[mode];
  const cx = 0.5;
  const cy = 0.5;
  const k = 0.28;
  const shrink = (v: number, c: number) => c + (v - c) * k;
  return {
    leftX: shrink(f.leftX, cx),
    rightX: shrink(f.rightX, cx),
    leftTop: shrink(f.leftTop, cy),
    leftBottom: shrink(f.leftBottom, cy),
    rightTop: shrink(f.rightTop, cy),
    rightBottom: shrink(f.rightBottom, cy),
    leftDepth: f.leftDepth * 1.6,
  };
}

const SCREEN_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SCREEN_FRAGMENT = `
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uMix;
  uniform float uShift;
  uniform float uOpacity;
  vec3 band(vec2 uv, float shift) {
    float t = fract(uv.x * 0.72 + uv.y * 0.55 + shift);
    vec3 c = mix(vec3(0.16, 0.86, 1.0), vec3(0.52, 0.32, 1.0), smoothstep(0.0, 0.34, t));
    c = mix(c, vec3(1.0, 0.26, 0.78), smoothstep(0.34, 0.68, t));
    c = mix(c, vec3(1.0, 0.72, 0.28), smoothstep(0.68, 1.0, t));
    return mix(c, vec3(1.0), 0.45);
  }
  void main() {
    // Texture lookup drifts from the colour-band surface to the picture: mix(geoUV, screenUV, pow(p, 0.2)).
    vec3 tex = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y)).rgb;
    vec3 color = mix(band(vUv, uShift), tex, smoothstep(0.0, 1.0, pow(uMix, 0.2)));
    // Main-scene vignette: smoothstep(1.2, 0.0, len) on the screen's own centre distance.
    float len = length((vUv - 0.5) * 2.0);
    float vignette = mix(0.9, 1.0, smoothstep(1.2, 0.0, len));
    gl_FragColor = vec4(color * vignette, uOpacity);
  }
`;

const _a = new Vector3();
const _f = new Vector3();
const _r = new Vector3();
const _u = new Vector3();
const _tmp = new Vector3();

function mixCorners(a: Corners, b: Corners, t: number): Corners {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    leftX: m(a.leftX, b.leftX),
    rightX: m(a.rightX, b.rightX),
    leftTop: m(a.leftTop, b.leftTop),
    leftBottom: m(a.leftBottom, b.leftBottom),
    rightTop: m(a.rightTop, b.rightTop),
    rightBottom: m(a.rightBottom, b.rightBottom),
    leftDepth: m(a.leftDepth, b.leftDepth),
  };
}

/** Point under screen fraction (x, y) at view depth d, from camera pose vectors. */
function pointAt(out: Vector3, x: number, y: number, depth: number, tanHalf: number, aspect: number) {
  const halfH = tanHalf * depth;
  const halfW = halfH * aspect;
  return out
    .copy(_a)
    .addScaledVector(_f, depth)
    .addScaledVector(_r, (x * 2 - 1) * halfW)
    .addScaledVector(_u, (1 - y * 2) * halfH);
}

export function ValuesScreen({ frame, mode }: { frame: TimelineFrame; mode: ExperienceMode }) {
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const front = useRef<BufferGeometry>(null);
  const body = useRef<BufferGeometry>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: SCREEN_VERTEX,
        fragmentShader: SCREEN_FRAGMENT,
        uniforms: { uMap: { value: null }, uMix: { value: 0 }, uShift: { value: 0 }, uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const bodyMaterial = useMemo(
    () => new MeshBasicMaterial({ color: "#0b0f12", transparent: true, side: DoubleSide, toneMapped: false }),
    [],
  );
  const frontPositions = useMemo(() => new Float32Array(12), []);
  const bodyPositions = useMemo(() => new Float32Array(24 * 3), []);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();
    loader.load("/experience/values-screen.webp", (texture: Texture) => {
      if (!alive) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      material.uniforms.uMap.value = texture;
      material.needsUpdate = true;
    });
    return () => {
      alive = false;
      (material.uniforms.uMap.value as Texture | null)?.dispose();
    };
  }, [gl, material]);
  useEffect(
    () => () => {
      material.dispose();
      bodyMaterial.dispose();
    },
    [material, bodyMaterial],
  );

  const progress = frame.progress;
  // In: 0.835 → 0.866 (values_in), the screen holds through the four values, out into the stella section.
  const p = smoothstep(segmentProgress(progress, 0.835, 0.866));
  const out = smoothstep(segmentProgress(progress, 0.9, 0.915));
  const opacity = p > 0.001 ? 1 - out : 0;

  useFrame(() => {
    if (opacity <= 0.001 || !front.current || !body.current) return;
    const pose = frame.camera;
    _a.set(...pose.position);
    _f.set(pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]).normalize();
    _r.crossVectors(_f, _tmp.set(0, 1, 0)).normalize();
    _u.crossVectors(_r, _f).normalize();
    const tanHalf = Math.tan((pose.fov * Math.PI) / 360);
    const aspect = size.width / Math.max(1, size.height);
    const c = mixCorners(startCorners(mode), FINAL[mode], p);
    const heightL = c.leftBottom - c.leftTop;
    const heightR = Math.max(0.01, c.rightBottom - c.rightTop);
    // Equal physical edge heights: projected height ∝ 1/depth.
    const rightDepth = c.leftDepth * (heightL / heightR);

    const tl = pointAt(new Vector3(), c.leftX, c.leftTop, c.leftDepth, tanHalf, aspect);
    const bl = pointAt(new Vector3(), c.leftX, c.leftBottom, c.leftDepth, tanHalf, aspect);
    const tr = pointAt(new Vector3(), c.rightX, c.rightTop, rightDepth, tanHalf, aspect);
    const br = pointAt(new Vector3(), c.rightX, c.rightBottom, rightDepth, tanHalf, aspect);

    // Front face: tl, tr, br, bl.
    const corners = [tl, tr, br, bl];
    corners.forEach((v, i) => v.toArray(frontPositions, i * 3));
    (front.current.getAttribute("position") as BufferAttribute).needsUpdate = true;
    front.current.computeBoundingSphere();

    // Slab: shift the back face away from the viewer by 6 % of the face width along the face normal.
    const normal = new Vector3().crossVectors(tr.clone().sub(tl), bl.clone().sub(tl)).normalize();
    if (normal.dot(_f) < 0) normal.negate();
    const thickness = tl.distanceTo(tr) * 0.06 * smoothstep(segmentProgress(progress, 0.84, 0.86));
    const back = corners.map((v) => v.clone().addScaledVector(normal, thickness));
    const quads = [
      [0, 1, 1, 0],
      [1, 2, 2, 1],
      [2, 3, 3, 2],
      [3, 0, 0, 3],
    ];
    // Four side quads between the front ring and the shifted back ring.
    quads.forEach(([a, b], q) => {
      const verts = [corners[a], corners[b], back[b], back[a]];
      verts.forEach((v, i) => v.toArray(bodyPositions, (q * 4 + i) * 3));
    });
    (body.current.getAttribute("position") as BufferAttribute).needsUpdate = true;
    body.current.computeBoundingSphere();

    material.uniforms.uMix.value = p;
    material.uniforms.uShift.value = frame.progress * 1.6;
    material.uniforms.uOpacity.value = opacity;
    bodyMaterial.opacity = opacity;
  });

  const frontIndex = useMemo(() => [0, 1, 2, 0, 2, 3], []);
  const bodyIndex = useMemo(() => {
    const idx: number[] = [];
    for (let q = 0; q < 4; q += 1) idx.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3);
    return idx;
  }, []);
  const uvs = useMemo(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), []);

  if (opacity <= 0.001) return null;
  return (
    <group>
      <mesh frustumCulled={false} material={bodyMaterial} renderOrder={5}>
        <bufferGeometry ref={body}>
          <bufferAttribute attach="attributes-position" args={[bodyPositions, 3]} />
          <bufferAttribute attach="index" args={[new Uint16Array(bodyIndex), 1]} />
        </bufferGeometry>
      </mesh>
      <mesh frustumCulled={false} material={material} renderOrder={6}>
        <bufferGeometry ref={front}>
          <bufferAttribute attach="attributes-position" args={[frontPositions, 3]} />
          <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          <bufferAttribute attach="index" args={[new Uint16Array(frontIndex), 1]} />
        </bufferGeometry>
      </mesh>
    </group>
  );
}

export default ValuesScreen;
