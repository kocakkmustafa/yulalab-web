"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  Vector2,
  type Texture,
} from "three";
import type { QualityTier, TimelineFrame } from "./types";
import { segmentProgress, smoothstep, STAGES } from "./timeline";
import { WORLD_LIGHT_COLOR } from "./theme";
import { glyphViewportPose, viewportMobileMix } from "./layout";

export type GridRoomProps = {
  frame: TimelineFrame;
  tier: QualityTier;
  mediaTextures?: readonly Texture[];
};

const ROOM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vViewDepth;
  varying float vFacing;

  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDepth = -viewPosition.z;
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-viewPosition.xyz)));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const ROOM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uWhiteMix; uniform float uOpacity; uniform float uGalleryMix;
  uniform float uTime; uniform sampler2D uProjectionA; uniform sampler2D uProjectionB;
  uniform float uProjectionMix; uniform float uProjectionBlend;
  varying vec2 vUv; varying float vViewDepth; varying float vFacing;
  float gridLine(vec2 uv, vec2 density) {
    vec2 coordinate = uv * density;
    vec2 derivative = max(fwidth(coordinate), vec2(0.0001));
    vec2 distanceToLine = abs(fract(coordinate - 0.5) - 0.5) / derivative;
    return 1.0 - min(min(distanceToLine.x, distanceToLine.y), 1.0);
  }
  void main() {
    float fine = gridLine(vUv, vec2(256.0, 128.0));
    float major = gridLine(vUv, vec2(64.0, 32.0));
    vec2 cell = floor(vUv * vec2(64.0, 32.0));
    float cellTone = fract(sin(dot(cell, vec2(17.13, 71.7))) * 43758.5453);
    float band = pow(0.5 + 0.5 * sin(vUv.x * 56.0 + vUv.y * 18.0 + uTime * 0.27), 5.0);
    float wallLight = 0.4 + 0.6 * pow(vFacing, 0.7);
    vec2 dots = fract(vUv * vec2(1536.0, 768.0)) - 0.5;
    float dotMask = 1.0 - smoothstep(0.18, 0.38, length(dots));
    vec3 color = vec3(0.015 + band * 0.34 + cellTone * 0.035) * wallLight;
    color *= 0.64 + dotMask * 0.36;
    color = mix(color, vec3(0.4), fine * 0.28);
    color = mix(color, vec3(0.008), major * 0.72);
    vec2 crossPoint = abs(fract(vUv * vec2(32.0, 16.0)) - 0.5);
    float cross = max(step(crossPoint.x, 0.008) * step(crossPoint.y, 0.06), step(crossPoint.y, 0.008) * step(crossPoint.x, 0.06));
    color += vec3(cross * 0.28);
    vec2 mediaUv = fract(vUv * vec2(3.0, 1.0) + vec2(uTime * 0.008, sin(uTime * 0.12) * 0.025));
    vec3 projection = mix(texture2D(uProjectionA, mediaUv).rgb, texture2D(uProjectionB, mediaUv).rgb, uProjectionBlend);
    color = mix(color, projection * 0.55 + color * 0.5, uProjectionMix);
    color = mix(color, vec3(0.62), uWhiteMix * 0.7);
    float fade = (1.0 - smoothstep(60.0, 110.0, vViewDepth)) * smoothstep(0.0, 0.03, vUv.y) * (1.0 - smoothstep(0.97, 1.0, vUv.y));
    float alpha = (0.65 + fine * 0.16 + major * 0.12) * fade * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const WHITE_RISE_FRAGMENT = /* glsl */ `
  uniform float uRise; uniform float uOpacity; uniform vec2 uViewport; uniform vec3 uColor;
  varying vec2 vUv;
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
    vec3 color = mix(uColor, vec3(0.32), grid * 0.045 + cross * 0.3);
    gl_FragColor = vec4(color, mask * uOpacity);
    #include <colorspace_fragment>
  }
`;

const HALFTONE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALFTONE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uWhiteMix;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 cells = vec2(46.0, 28.0);
    vec2 local = fract(vUv * cells) - 0.5;
    float radial = length(local);
    float field = 0.18 + 0.15 * sin(vUv.x * 11.0 + vUv.y * 7.0);
    float dotMask = 1.0 - smoothstep(field, field + 0.08, radial);
    float edgeFade = smoothstep(0.0, 0.16, vUv.x) *
      (1.0 - smoothstep(0.84, 1.0, vUv.x)) *
      smoothstep(0.0, 0.2, vUv.y) *
      (1.0 - smoothstep(0.8, 1.0, vUv.y));
    vec3 color = mix(vec3(0.54, 0.22, 0.88), vec3(0.25, 0.23, 0.28), uWhiteMix);
    float alpha = dotMask * edgeFade * uOpacity * mix(0.012, 0.012, uWhiteMix);

    if (alpha < 0.008) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function makeWordmarkTexture(label: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f2eaff";
    context.font = "900 300px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 12, canvas.width * 0.92);

    context.globalCompositeOperation = "destination-out";
    context.globalAlpha = 0.13;
    context.fillText(label, canvas.width / 2 + 11, canvas.height / 2 + 12, canvas.width * 0.92);
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

export function GridRoom({ frame, tier, mediaTextures }: GridRoomProps) {
  const viewport = useThree((state) => state.size);
  const viewportWidth = viewport.width;
  const heroLift = glyphViewportPose(frame.progress, viewport.width / Math.max(1, viewport.height), viewport.width).offset[1] * frame.overlay.hero;
  const wordmarkWidth = 14.2 * (1 - viewportMobileMix(viewportWidth) * 0.56);
  const gridMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uWhiteMix: { value: 0 },
          uOpacity: { value: 1 },
          uGalleryMix: { value: 0 }, uTime: { value: 0 },
          uProjectionA: { value: null }, uProjectionB: { value: null },
          uProjectionMix: { value: 0 }, uProjectionBlend: { value: 0 },
        },
        vertexShader: ROOM_VERTEX_SHADER,
        fragmentShader: ROOM_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: BackSide,
        toneMapped: false,
      }),
    [],
  );
  const halftoneMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uWhiteMix: { value: 0 },
          uOpacity: { value: 1 },
        },
        vertexShader: HALFTONE_VERTEX_SHADER,
        fragmentShader: HALFTONE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  const yulaWordmark = useMemo(() => makeWordmarkTexture("YULA"), []);
  const worksWordmark = useMemo(() => makeWordmarkTexture("WORKS"), []);
  const bladeMaterial = useMemo(() => new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(WORLD_LIGHT_COLOR) },
      uRise: { value: 0 },
      uOpacity: { value: 0 },
      uViewport: { value: new Vector2() },
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

  useFrame((state) => {
    const mediaFloat = frame.valueFloat / 3 * Math.max(0, (mediaTextures?.length ?? 0) - 1);
    const mediaIndex = Math.floor(mediaFloat);
    gridMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    gridMaterial.uniforms.uProjectionA.value = mediaTextures?.[mediaIndex] ?? null;
    gridMaterial.uniforms.uProjectionB.value = mediaTextures?.[Math.min(mediaIndex + 1, (mediaTextures?.length ?? 1) - 1)] ?? null;
    gridMaterial.uniforms.uProjectionMix.value = mediaTextures?.length ? frame.world.serviceIn * (1 - frame.world.serviceOut) * 0.82 : 0;
    gridMaterial.uniforms.uProjectionBlend.value = smoothstep(mediaFloat - mediaIndex);
    bladeMaterial.uniforms.uRise.value = frame.world.bladeProgress;
    bladeMaterial.uniforms.uOpacity.value = 1 - smoothstep(segmentProgress(frame.progress, 0.815, 0.835));
    bladeMaterial.uniforms.uViewport.value.set(viewport.width, viewport.height);
    gridMaterial.uniforms.uWhiteMix.value = frame.world.themeMix;
    gridMaterial.uniforms.uGalleryMix.value = frame.world.worksBackdropMix;
    // Let the physical white blade soften the room before the global theme settles.
    gridMaterial.uniforms.uOpacity.value = frame.world.roomOpacity
      * (1 - frame.world.worksBackdropMix * 0.35) * (1 - frame.world.whiteMix * 0.38);
    halftoneMaterial.uniforms.uWhiteMix.value = frame.world.themeMix;
    halftoneMaterial.uniforms.uOpacity.value = frame.world.roomOpacity * (1 - frame.world.worksBackdropMix * 0.8);
  });

  useEffect(
    () => () => {
      gridMaterial.dispose();
      bladeMaterial.dispose();
      halftoneMaterial.dispose();
      yulaWordmark.dispose();
      worksWordmark.dispose();
    },
    [bladeMaterial, gridMaterial, halftoneMaterial, worksWordmark, yulaWordmark],
  );

  const blade = frame.world.bladeProgress;
  const wordmarkZ = frame.progress < STAGES.portfolio[0]
    ? -1.25
    : -2.35 - frame.productFloat * 1.36;

  return (
    <group>
      <mesh position={[0, 0, -11.5]} rotation={[0, -Math.PI * 0.08, 0]} scale={[0.62, 1, 1]}>
        <cylinderGeometry
          args={[
            28,
            28,
            34,
            radialSegments,
            heightSegments,
            true,
            Math.PI * 0.17,
            Math.PI * 1.66,
          ]}
        />
        <primitive attach="material" object={gridMaterial} />
      </mesh>

      {[
        { position: [-7.2, 0.8, -4.8] as const, rotation: [0, 0.22, 0.04] as const },
        { position: [7.4, -0.7, -13.2] as const, rotation: [0, -0.24, -0.03] as const },
        { position: [-6.4, 1.1, -22.5] as const, rotation: [0, 0.18, 0] as const },
      ].map((panel, index) => (
        <mesh
          key={index}
          position={panel.position}
          rotation={panel.rotation}
          scale={index === 1 ? [1.2, 1.2, 1] : [1, 1, 1]}
        >
          <planeGeometry args={[7.5, 5.2, 1, 1]} />
          <primitive attach="material" object={halftoneMaterial} />
        </mesh>
      ))}

      <mesh position={[0, 0.1 + heroLift, wordmarkZ]} renderOrder={-2}>
        <planeGeometry args={[wordmarkWidth, 3.55]} />
        <meshBasicMaterial
          color={frame.world.themeMix > 0.5 ? "#26212b" : "#ffffff"}
          depthTest
          depthWrite={false}
          map={yulaWordmark}
          opacity={frame.world.wordmarkOpacity * (1 - frame.world.worksBackdropMix)}
          toneMapped={false}
          transparent
        />
      </mesh>

      <mesh position={[0, 0.1, wordmarkZ - 0.02]} renderOrder={-2}>
        <planeGeometry args={[15.8, 3.55]} />
        <meshBasicMaterial
          color="#ffffff"
          depthTest
          depthWrite={false}
          map={worksWordmark}
          opacity={frame.world.worksBackdropMix * 0.015}
          toneMapped={false}
          transparent
        />
      </mesh>

      <mesh visible={blade > 0.001 && frame.progress < 0.835} frustumCulled={false} renderOrder={3.5}>
        <planeGeometry args={[2, 2]} />
        <primitive attach="material" object={bladeMaterial} />
      </mesh>

      <ClosingGeometry draw={frame.world.closingDraw} />
    </group>
  );
}
