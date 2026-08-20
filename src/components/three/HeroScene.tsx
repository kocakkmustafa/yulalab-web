"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Edges,
  Grid,
  Text,
  MeshTransmissionMaterial,
  Environment,
  Lightformer,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Vector2 } from "three";
import type { Mesh, PerspectiveCamera } from "three";


const CA_OFFSET = new Vector2(0.0006, 0.0004);

/**
 * The hero stage: neutral dark grid "room", giant YULA type, and a glass
 * prism that refracts the letters passing behind it (ALCHE-language,
 * YULA-branded — the stage stays neutral so each product can later light
 * it with its own color).
 *
 * Tunables the founder may want to direct are grouped here rather than
 * scattered through the JSX.
 */
const TUNE = {
  /** How hard the prism chases the pointer (world units at pointer=±1). */
  prismFollowX: 2.4,
  prismFollowY: 1.3,
  /** Lerp speeds — lower = heavier, dreamier. */
  prismLerp: 2.2,
  cameraLerp: 1.8,
  /** Pendulum swing rate of the prism (rad/s into a ±0.35 rad sweep). */
  prismSpin: 0.25,
  /** Camera parallax amplitude. */
  cameraDrift: 0.55,
};

function PrismRig() {
  const mesh = useRef<Mesh>(null);
  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const k = Math.min(1, delta * TUNE.prismLerp);
    m.position.x += (state.pointer.x * TUNE.prismFollowX - m.position.x) * k;
    m.position.y += (state.pointer.y * TUNE.prismFollowY - m.position.y) * k;
    m.rotation.z = Math.PI + Math.sin(state.clock.elapsedTime * TUNE.prismSpin) * 0.35;
  });
  return (
    // Triangular prism: a 3-segment cylinder with its axis pointed at the
    // camera, so the cross-section reads as the triangle from the reel.
    <mesh ref={mesh} position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, Math.PI]}>
      <cylinderGeometry args={[1.55, 1.55, 1.15, 3, 1]} />
      <MeshTransmissionMaterial
        transmission={1}
        thickness={1.4}
        roughness={0.06}
        ior={1.45}
        chromaticAberration={0.35}
        anisotropicBlur={0.25}
        distortion={0.28}
        distortionScale={0.5}
        temporalDistortion={0.12}
        backside
      />
      {/* The glass alone is invisible against the dark stage until light
          crosses it — the reel's prism reads through its bright rim. */}
      <Edges threshold={20} color="#8A8A96" />
    </mesh>
  );
}

function CameraRig() {
  useFrame((state, delta) => {
    const cam = state.camera as PerspectiveCamera;
    const k = Math.min(1, delta * TUNE.cameraLerp);
    cam.position.x += (state.pointer.x * TUNE.cameraDrift - cam.position.x) * k;
    cam.position.y += (state.pointer.y * TUNE.cameraDrift * 0.6 - cam.position.y) * k;
    cam.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene({ onTextReady }: { onTextReady?: () => void }) {
  return (
    <Canvas
      // The DOM above carries the real heading; the canvas is scenery.
      aria-hidden
      camera={{ position: [0, 0, 9], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0A0A0B"]} />
      <fog attach="fog" args={["#08080A", 11, 30]} />

      {/* The word itself — real glyph geometry, so the prism has something
          true to refract. The visible-to-readers copy lives in the DOM. */}
      <Suspense fallback={null}>
      <Text
        font="/fonts/space-grotesk-700.woff"
        fontSize={3.3}
        letterSpacing={-0.06}
        color="#F4F4F5"
        position={[0, 0, -0.6]}
        anchorX="center"
        anchorY="middle"
        onSync={onTextReady}
      >
        YULA
      </Text>
      </Suspense>

      <PrismRig />
      <CameraRig />

      {/* Floor + back wall of the "room". */}
      <Grid
        position={[0, -2.5, 0]}
        cellSize={0.9}
        cellThickness={0.6}
        cellColor="#232329"
        sectionSize={4.5}
        sectionThickness={1}
        sectionColor="#34343E"
        fadeDistance={28}
        fadeStrength={2.5}
        infiniteGrid
      />
      <Grid
        position={[0, 0, -7]}
        rotation={[Math.PI / 2, 0, 0]}
        cellSize={0.9}
        cellThickness={0.6}
        cellColor="#1D1D23"
        sectionSize={4.5}
        sectionThickness={1}
        sectionColor="#2B2B33"
        fadeDistance={30}
        fadeStrength={2.2}
        infiniteGrid
      />

      {/* Local (no-network) environment: white strip lights are what give
          the glass its streak highlights. */}
      <Environment resolution={128}>
        <Lightformer intensity={3.6} position={[5, 4, 6]} scale={[7, 0.6, 1]} rotation-y={-0.6} />
        <Lightformer intensity={2.4} position={[-6, 2, 4]} scale={[6, 0.5, 1]} rotation-y={0.7} />
        <Lightformer intensity={1.6} position={[0, -4, 5]} scale={[8, 0.4, 1]} rotation-x={0.8} color="#B8C4FF" />
      </Environment>

      <EffectComposer>
        <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
        <ChromaticAberration offset={CA_OFFSET} />
        <Noise premultiply opacity={0.5} />
        <Vignette eskil={false} offset={0.18} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}
