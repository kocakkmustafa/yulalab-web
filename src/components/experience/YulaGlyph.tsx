"use client";

import { Edges } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Color, ExtrudeGeometry, Shape } from "three";
import type { QualityTier, TimelineFrame } from "./types";

export type YulaGlyphProps = {
  frame: TimelineFrame;
  tier: QualityTier;
};

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

export function YulaGlyph({ frame, tier }: YulaGlyphProps) {
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

  const whiteMix = frame.glyph.outlineMix;
  const bodyColor = useMemo(
    () => new Color("#b9a7d8").lerp(new Color("#f8f7f2"), whiteMix),
    [whiteMix],
  );
  const bodyOpacity = 1 - whiteMix * 0.7;
  const isTransmissionTier = tier !== "low";
  const transmission =
    tier === "high" ? 0.94 * frame.glyph.glassMix : tier === "medium" ? 0.72 * frame.glyph.glassMix : 0;
  const fringeOpacity = 0.035 + frame.glyph.glassMix * (tier === "low" ? 0.18 : 0.11);

  return (
    <group
      position={frame.glyph.position}
      rotation={frame.glyph.rotation}
      scale={frame.glyph.scale}
    >
      <mesh castShadow={tier !== "low"} geometry={geometry} receiveShadow>
        <meshPhysicalMaterial
          attenuationColor="#8d6db7"
          attenuationDistance={1.6}
          clearcoat={tier === "low" ? 0.92 : 1}
          clearcoatRoughness={tier === "low" ? 0.15 : 0.06}
          color={bodyColor}
          depthWrite={bodyOpacity > 0.55}
          envMapIntensity={tier === "high" ? 1.8 : 1.25}
          ior={1.35}
          iridescence={tier === "high" ? 0.08 * frame.glyph.glassMix : 0}
          iridescenceIOR={1.35}
          metalness={isTransmissionTier ? 0.04 : 0.74}
          opacity={bodyOpacity}
          roughness={tier === "low" ? 0.27 : tier === "medium" ? 0.19 : 0.11}
          thickness={tier === "high" ? 1.25 : tier === "medium" ? 0.72 : 0}
          transmission={transmission}
          transparent
        />
        <Edges
          color="#ffffff"
          opacity={0.12 + whiteMix * 0.84}
          scale={1.012}
          threshold={18}
          transparent
        />
      </mesh>

      <mesh
        geometry={geometry}
        position={[-0.014, 0, -0.008]}
        scale={1.018}
      >
        <meshBasicMaterial
          color="#39e6ff"
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
      >
        <meshBasicMaterial
          color="#ff43c8"
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
