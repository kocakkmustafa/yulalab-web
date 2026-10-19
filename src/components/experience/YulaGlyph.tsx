"use client";

import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  type Group,
  DataTexture,
  ExtrudeGeometry,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  Shape,
  Texture,
  Vector2,
  Vector3,
} from "three";
import { glyphReadingVisibility, smoothstep, segmentProgress } from "./timeline";
import { glyphViewportPose } from "./layout";
import type { QualityTier, TimelineFrame, Vec3 } from "./types";

export type YulaGlyphProps = {
  frame: TimelineFrame;
  interactionRotation?: Vec3;
  tier: QualityTier;
  portalTexture?: Texture | null;
};

const CAUSTIC_VERTEX_SHADER = `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CAUSTIC_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGlassMix;
  uniform float uHeroMix;
  uniform float uPortal;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    float diagonal = 0.5 + 0.5 * sin(
      vLocalPosition.x * 5.6 + vLocalPosition.y * 7.8 - vLocalPosition.z * 10.0 + uTime * 0.62
    );
    diagonal = pow(diagonal, 12.0);

    float sweepAxis = vLocalPosition.x * 0.82 - vLocalPosition.y * 0.58;
    float sweepCenter = sin(uTime * 0.27) * 0.42;
    float sweep = exp(-pow((sweepAxis - sweepCenter) * 3.4, 2.0));
    float facet = pow(0.5 + 0.5 * sin(vLocalPosition.y * 12.0 - uTime * 0.34), 18.0);
    float rim = pow(1.0 - abs(vViewNormal.z), 2.4);

    float chroma = 0.5 + 0.5 * sin(
      vLocalPosition.x * 4.2 - vLocalPosition.y * 2.6 + uTime * 0.18
    );
    vec3 cyan = vec3(0.38, 0.7, 1.0);
    vec3 violet = vec3(0.4, 0.08, 0.95);
    vec3 magenta = vec3(0.86, 0.35, 1.0);
    vec3 color = mix(cyan, violet, chroma);
    color = mix(color, magenta, facet * 0.42);
    float heroWhite = uHeroMix * clamp(sweep * 0.82 + rim * 0.42 + diagonal * 0.24, 0.0, 1.0);
    color = mix(color, vec3(1.0), heroWhite);

    float portalAxis = vLocalPosition.y * 0.56 + 0.5;
    float portalNoise = 0.08 * sin(vLocalPosition.x * 13.0 + vLocalPosition.z * 17.0 + uTime * 0.2);
    float portal = smoothstep(0.92 - uPortal, 1.04 - uPortal, portalAxis + portalNoise) * uPortal;
    color = mix(color, mix(cyan, magenta, chroma), portal * 0.72);

    float energy = 0.022 + diagonal * 0.16 + sweep * 0.09 + facet * 0.06 + rim * 0.035 + portal * 0.16;
    energy += uHeroMix * (0.12 + sweep * 0.1 + rim * 0.055);
    gl_FragColor = vec4(color * (1.1 + diagonal * 1.6), energy * uGlassMix);
  }
`;

const PORTAL_FRAGMENT_SHADER = `
  uniform sampler2D uPortalTexture;
  uniform vec2 uViewport;
  uniform float uReveal;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vLocalPosition;

  float portalNoise(vec3 point) {
    return 0.5 + 0.5 * sin(
      point.x * 11.0 + sin(point.y * 8.0 - uTime * 0.17) * 2.1 + point.z * 17.0
    );
  }

  void main() {
    vec2 screenUv = gl_FragCoord.xy / max(uViewport, vec2(1.0));
    vec4 portal = texture2D(uPortalTexture, screenUv);
    float coordinate = vLocalPosition.y * 0.5 + 0.5;
    float noise = (portalNoise(vLocalPosition) - 0.5) * 0.2;
    float threshold = 1.08 - uReveal * 1.34;
    float wipe = smoothstep(threshold - 0.075, threshold + 0.075, coordinate + noise);
    wipe *= smoothstep(0.005, 0.08, uReveal);
    vec2 edgeDistance = min(screenUv, vec2(1.0) - screenUv);
    float targetFeather = smoothstep(0.0, 0.065, min(edgeDistance.x, edgeDistance.y));
    float scan = 0.96 + 0.04 * sin(screenUv.y * 420.0 + uTime * 0.38);
    gl_FragColor = vec4(portal.rgb * scan, portal.a * wipe * targetFeather * uOpacity);
    #include <colorspace_fragment>
  }
`;

function makeYShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.95, 0.9);
  shape.lineTo(-0.43, 0.9);
  shape.lineTo(0, 0.27);
  shape.lineTo(0.43, 0.9);
  shape.lineTo(0.95, 0.9);
  shape.lineTo(0.27, -0.08);
  shape.lineTo(0.27, -0.9);
  shape.lineTo(-0.27, -0.9);
  shape.lineTo(-0.27, -0.08);
  shape.closePath();
  return shape;
}

export function YulaGlyph({ frame, tier, portalTexture = null, interactionRotation = [0, 0, 0] }: YulaGlyphProps) {
  const viewportSize = useThree((state) => state.size);
  const renderer = useThree((state) => state.gl);
  const glyphGroup = useRef<Group>(null);
  const causticMaterial = useRef<ShaderMaterial | null>(null);
  const portalMaterial = useRef<ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const high = tier === "high";
    const medium = tier === "medium";
    const result = new ExtrudeGeometry(makeYShape(), {
      depth: 0.28,
      steps: 1,
      curveSegments: high ? 12 : medium ? 8 : 4,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.065,
      bevelOffset: 0,
      bevelSegments: high ? 6 : medium ? 4 : 2,
    });
    result.center();
    result.computeVertexNormals();
    return result;
  }, [tier]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Trace the two faces of our own Y, rather than every bevel seam. Nine
  // vertices per face remain legible in the light room at every quality tier.
  const contour = useMemo(() => new BufferGeometry().setFromPoints(
    makeYShape().getPoints().slice(0, -1).map((point) => new Vector3(point.x, point.y, 0)),
  ), []);
  useEffect(() => () => contour.dispose(), [contour]);

  // Own deterministic polish variation: a tiny repeating height field bends
  // broad studio reflections without changing the Y silhouette or its mesh.
  const chromeBump = useMemo(() => {
    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size * Math.PI * 2;
        const v = y / size * Math.PI * 2;
        const height = 0.5 + 0.18 * Math.sin(u * 2 + Math.sin(v * 3))
          + 0.1 * Math.sin(v * 4 + u);
        const value = Math.round(height * 255);
        const offset = (y * size + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
        pixels[offset + 3] = 255;
      }
    }
    const texture = new DataTexture(pixels, size, size, RGBAFormat);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.minFilter = texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => chromeBump.dispose(), [chromeBump]);

  const interactionMix = 1 - smoothstep(segmentProgress(frame.progress, 0.025, 0.075));
  const rotation: Vec3 = [
    frame.glyph.rotation[0] + interactionRotation[0] * interactionMix,
    frame.glyph.rotation[1] + interactionRotation[1] * interactionMix,
    frame.glyph.rotation[2],
  ];
  const whiteMix = frame.glyph.outlineMix;
  const outlineColor = useMemo(
    () => new Color("#ffffff").lerp(new Color("#16171a"), smoothstep(segmentProgress(frame.world.whiteMix, 0.12, 0.38))),
    [frame.world.whiteMix],
  );
  const readingVisibility = glyphReadingVisibility(frame);
  // Hand the portal to the readable SERVICE media, then keep the emblem
  // retired through the closing wordmark/contact.
  const closingHandoff = 1 - smoothstep(segmentProgress(frame.world.closingDraw, 0, 0.58));
  const closingVisibility = closingHandoff
    * (1 - frame.world.serviceIn) * readingVisibility;
  const bodyColor = useMemo(
    () => new Color("#ffffff").lerp(new Color("#e0d3ff"), frame.overlay.hero * 0.42).lerp(new Color("#f8f7f2"), whiteMix),
    [frame.overlay.hero, whiteMix],
  );
  const bodyOpacity = (1 - whiteMix * 0.94) * closingVisibility;
  // The constrained tier uses alpha, not an extra transmission render pass.
  // This is a light transparent approximation; physical refraction stays in
  // the existing medium/high material.
  const fallbackOpacity = bodyOpacity * (tier === "low" ? 1 - frame.glyph.glassMix * 0.7 : 1);
  const glassVisible = frame.glyph.glassMix > 0.015 && closingVisibility > 0.01;
  const transmission =
    tier === "high" ? 0.96 * frame.glyph.glassMix : tier === "medium" ? 0.94 * frame.glyph.glassMix : 0;
  const fringeOpacity =
    frame.glyph.glassMix * (tier === "low" ? 0.006 : 0.004) * closingVisibility;
  const outlineOpacity = (0.025 + Math.max(whiteMix, frame.world.whiteMix) * 0.625) * closingVisibility;
  const viewportPose = glyphViewportPose(
    frame.progress,
    viewportSize.width / Math.max(1, viewportSize.height),
    viewportSize.width,
  );
  const position = useMemo(
    () => [
      frame.glyph.position[0] + viewportPose.offset[0],
      frame.glyph.position[1] + viewportPose.offset[1],
      frame.glyph.position[2] + viewportPose.offset[2],
    ] as const,
    [frame.glyph.position, viewportPose.offset],
  );
  const causticUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlassMix: { value: 1 },
      uHeroMix: { value: 0 },
      uPortal: { value: 0 },
    }),
    [],
  );
  const portalUniforms = useMemo(
    () => ({
      uPortalTexture: { value: null },
      uViewport: { value: new Vector2(1, 1) },
      uReveal: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );
  const drawingBufferSize = useMemo(() => new Vector2(), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (glyphGroup.current) glyphGroup.current.rotation.set(rotation[0] + Math.sin(time * 0.26) * 0.012 * frame.overlay.hero, rotation[1] + Math.sin(time * 0.2) * 0.035 * frame.overlay.hero, rotation[2]);
    chromeBump.offset.set(Math.sin(time * 0.17) * 0.08, time * 0.012);
    if (causticMaterial.current) {
      causticMaterial.current.uniforms.uTime.value = frame.progress * 18 + time * 0.72;
      causticMaterial.current.uniforms.uGlassMix.value =
        frame.glyph.glassMix * closingVisibility * (0.65 + frame.world.visionPortal * 0.35)
        * (tier === "low" ? 0.48 : 1);
      causticMaterial.current.uniforms.uHeroMix.value = frame.overlay.hero;
      causticMaterial.current.uniforms.uPortal.value = frame.world.visionPortal;
    }

    if (portalMaterial.current) {
      renderer.getDrawingBufferSize(drawingBufferSize);
      portalMaterial.current.uniforms.uPortalTexture.value = portalTexture;
      portalMaterial.current.uniforms.uViewport.value.copy(drawingBufferSize);
      portalMaterial.current.uniforms.uReveal.value = frame.world.visionPortal;
      portalMaterial.current.uniforms.uOpacity.value = frame.world.servicePortalOpacity;
      portalMaterial.current.uniforms.uTime.value = frame.progress * 18 + time * 0.72;
    }
  });

  return (
    <group
      ref={glyphGroup}
      position={position}
      rotation={rotation}
      scale={frame.glyph.scale * viewportPose.scaleMultiplier}
      visible={closingVisibility > 0.001}
    >
      <mesh
        castShadow={tier !== "low"}
        geometry={geometry}
        receiveShadow
        visible={tier === "low" || !glassVisible}
      >
        <meshPhysicalMaterial
          attenuationColor="#ffffff"
          bumpMap={chromeBump}
          bumpScale={0.012}
          attenuationDistance={1.6}
          clearcoat={0.92}
          clearcoatRoughness={0.15}
          color={bodyColor}
          depthWrite={fallbackOpacity > 0.55}
          envMapIntensity={1.25}
          ior={1.35}
          metalness={0.04}
          opacity={fallbackOpacity}
          roughness={tier === "low" ? 0.2 : 0.15}
          thickness={0}
          transmission={0}
          transparent
        />
      </mesh>

      {tier !== "low" ? (
        <mesh castShadow geometry={geometry} receiveShadow>
          <MeshTransmissionMaterial
            anisotropicBlur={tier === "high" ? 0.02 : 0.04}
            attenuationColor="#ffffff"
            bumpMap={chromeBump}
            bumpScale={0.012}
            attenuationDistance={8}
            backsideResolution={1}
            chromaticAberration={0.025}
            clearcoat={1}
            clearcoatRoughness={tier === "high" ? 0.04 : 0.08}
            color={bodyColor}
            depthWrite={bodyOpacity > 0.55}
            distortion={0.12}
            distortionScale={0.34}
            envMapIntensity={tier === "high" ? 1.8 : 1.5}
            ior={1.35}
            iridescence={0.3}
            iridescenceIOR={1.35}
            metalness={0.04}
            opacity={bodyOpacity}
            roughness={tier === "high" ? 0.08 : 0.1}
            samples={tier === "high" ? 3 : 2}
            temporalDistortion={0}
            thickness={tier === "high" ? 0.55 : 0.45}
            transmission={transmission}
            transmissionSampler
            resolution={1}
            transparent
            visible={glassVisible}
          />
        </mesh>
      ) : null}

      <lineLoop geometry={contour} position={[0, 0, 0.216]} renderOrder={5}>
        <lineBasicMaterial
          color={outlineColor}
          depthTest={false}
          depthWrite={false}
          opacity={outlineOpacity}
          toneMapped={false}
          transparent
        />
      </lineLoop>
      <lineLoop geometry={contour} position={[0, 0, -0.216]} renderOrder={5}>
        <lineBasicMaterial
          color={outlineColor}
          depthTest={false}
          depthWrite={false}
          opacity={outlineOpacity * 0.28}
          toneMapped={false}
          transparent
        />
      </lineLoop>

      <mesh
        geometry={geometry}
        position={[0, 0, 0.012]}
        renderOrder={3}
        scale={0.986}
        visible={glassVisible}
      >
        <shaderMaterial
          ref={causticMaterial}
          blending={AdditiveBlending}
          depthTest
          depthWrite={false}
          fragmentShader={CAUSTIC_FRAGMENT_SHADER}
          toneMapped={false}
          transparent
          uniforms={causticUniforms}
          vertexShader={CAUSTIC_VERTEX_SHADER}
        />
      </mesh>

      {portalTexture && frame.world.servicePortalOpacity > 0.001 ? (
        <mesh
          geometry={geometry}
          position={[0, 0, 0.02]}
          renderOrder={4}
          scale={0.992}
        >
          <shaderMaterial
            ref={portalMaterial}
            depthTest={false}
            depthWrite={false}
            fragmentShader={PORTAL_FRAGMENT_SHADER}
            toneMapped={false}
            transparent
            uniforms={portalUniforms}
            vertexShader={CAUSTIC_VERTEX_SHADER}
          />
        </mesh>
      ) : null}

      <mesh
        geometry={geometry}
        position={[-0.014, 0, -0.008]}
        scale={1.018}
        visible={glassVisible}
      >
        <meshBasicMaterial
          color="#cad3df"
          depthWrite={false}
          opacity={fringeOpacity}
          toneMapped={false}
          transparent
          wireframe
        />
      </mesh>
      <mesh
        geometry={geometry}
        position={[0.014, 0, 0.008]}
        scale={1.026}
        visible={glassVisible}
      >
        <meshBasicMaterial
          color="#ddd5e2"
          depthWrite={false}
          opacity={fringeOpacity * 0.82}
          toneMapped={false}
          transparent
          wireframe
        />
      </mesh>
    </group>
  );
}
