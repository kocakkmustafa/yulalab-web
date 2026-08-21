"use client";

import { RoundedBox } from "@react-three/drei";
import { clamp01, segmentProgress, smoothstep } from "./timeline";
import type { QualityTier, TimelineFrame, Vec3 } from "./types";

export type ValueDioramasProps = {
  frame: TimelineFrame;
  tier: QualityTier;
};

type DioramaProps = {
  opacity: number;
  tier: QualityTier;
};

function TransparencyDiorama({ opacity, tier }: DioramaProps) {
  const detail = tier === "low" ? 1 : tier === "medium" ? 2 : 3;
  const petals = [
    { position: [0, 0.7, 0.02] as Vec3, rotation: [0.2, -0.24, 0] as Vec3 },
    { position: [-0.66, 0.18, 0.14] as Vec3, rotation: [-0.12, 0.32, 1.24] as Vec3 },
    { position: [-0.42, -0.58, -0.06] as Vec3, rotation: [0.16, -0.3, 2.5] as Vec3 },
    { position: [0.42, -0.58, 0.12] as Vec3, rotation: [-0.18, 0.26, -2.5] as Vec3 },
    { position: [0.66, 0.18, -0.1] as Vec3, rotation: [0.1, -0.34, -1.24] as Vec3 },
  ];

  return (
    <group userData={{ value: "Transparency" }} rotation={[0.08, -0.12, 0.08]}>
      <mesh rotation={[0.35, -0.42, 0.18]}>
        <icosahedronGeometry args={[1.52, detail]} />
        <meshBasicMaterial
          color="#ffba78"
          depthWrite={false}
          opacity={opacity * 0.14}
          transparent
          wireframe
        />
      </mesh>
      {petals.map((petal, index) => (
        <RoundedBox
          args={[1.5, 0.48, 0.15]}
          key={index}
          position={petal.position}
          radius={0.22}
          rotation={petal.rotation}
          smoothness={tier === "low" ? 2 : tier === "medium" ? 4 : 6}
        >
          <meshPhysicalMaterial
            clearcoat={0.92}
            color={index % 2 === 0 ? "#ff796f" : "#ffd39a"}
            depthWrite={tier === "low"}
            emissive={index % 2 === 0 ? "#5f122d" : "#5c3019"}
            emissiveIntensity={0.12}
            ior={1.36}
            metalness={tier === "low" ? 0.24 : 0.02}
            opacity={opacity * (0.5 + index * 0.06)}
            roughness={tier === "low" ? 0.28 : 0.12}
            thickness={tier === "low" ? 0 : 0.55}
            transmission={tier === "low" ? 0 : 0.66}
            transparent
          />
        </RoundedBox>
      ))}
      <mesh rotation={[-0.3, 0.52, -0.2]}>
        <dodecahedronGeometry args={[0.42, tier === "high" ? 1 : 0]} />
        <meshPhysicalMaterial
          clearcoat={0.9}
          color="#fff4dc"
          emissive="#b34a49"
          emissiveIntensity={0.16}
          metalness={0.12}
          opacity={opacity * 0.88}
          roughness={0.16}
          transparent
        />
      </mesh>
    </group>
  );
}

function CraftDiorama({ opacity, tier }: DioramaProps) {
  const layers = [
    { position: [-0.72, -0.22, 0.28] as Vec3, color: "#af75ff", scale: [1.2, 0.3, 0.82] as Vec3 },
    { position: [0, 0.15, 0] as Vec3, color: "#47cfff", scale: [1.35, 0.3, 0.86] as Vec3 },
    { position: [0.78, 0.52, -0.26] as Vec3, color: "#ff5dc8", scale: [1.1, 0.3, 0.76] as Vec3 },
  ];

  return (
    <group userData={{ value: "Craft", product: "braavolabs" }}>
      <RoundedBox args={[3.75, 0.18, 2.45]} position={[0, -0.88, 0]} radius={0.09} smoothness={tier === "low" ? 2 : 5}>
        <meshStandardMaterial
          color="#17121f"
          metalness={0.52}
          opacity={opacity * 0.9}
          roughness={0.32}
          transparent
        />
      </RoundedBox>
      {layers.map((layer, index) => (
        <group key={index} position={layer.position}>
          <RoundedBox
            args={[layer.scale[0], layer.scale[1], layer.scale[2]]}
            radius={0.08}
            smoothness={tier === "low" ? 2 : 5}
          >
            <meshPhysicalMaterial
              clearcoat={0.65}
              color={layer.color}
              emissive={layer.color}
              emissiveIntensity={0.08}
              metalness={0.28}
              opacity={opacity * (0.72 + index * 0.08)}
              roughness={0.24}
              transparent
            />
          </RoundedBox>
          {[0, 1, 2].map((port) => (
            <mesh key={port} position={[-0.38 + port * 0.38, 0.18, 0.01]}>
              <cylinderGeometry args={[0.035, 0.035, 0.13, tier === "low" ? 8 : 16]} />
              <meshBasicMaterial
                color="#ffffff"
                opacity={opacity * 0.58}
                transparent
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -0.2, -0.72]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 3.1, tier === "low" ? 8 : 16]} />
        <meshBasicMaterial color="#8f7ea8" opacity={opacity * 0.48} transparent />
      </mesh>
    </group>
  );
}

function PrivacyDiorama({ opacity, tier }: DioramaProps) {
  const detail = tier === "low" ? 2 : tier === "medium" ? 3 : 5;
  const ringSegments = tier === "low" ? 40 : 96;

  return (
    <group userData={{ value: "Privacy", product: "lifeos" }}>
      <mesh rotation={[0.55, -0.42, 0.2]}>
        <icosahedronGeometry args={[0.98, detail]} />
        <meshPhysicalMaterial
          attenuationColor="#49d8c2"
          attenuationDistance={1.4}
          clearcoat={0.9}
          color="#2bdeb6"
          emissive="#073f40"
          emissiveIntensity={0.35}
          ior={1.35}
          metalness={tier === "low" ? 0.65 : 0.08}
          opacity={opacity * 0.9}
          roughness={tier === "low" ? 0.27 : 0.1}
          thickness={tier === "low" ? 0 : 0.8}
          transmission={tier === "low" ? 0 : 0.55}
          transparent
        />
      </mesh>
      {([
        [Math.PI / 2, 0.18, 0],
        [0.18, Math.PI / 2, 0.24],
        [0.72, 0.42, Math.PI / 2],
      ] as const).map((rotation, index) => (
        <mesh key={index} rotation={rotation}>
          <torusGeometry args={[1.35 + index * 0.25, 0.022, 7, ringSegments]} />
          <meshBasicMaterial
            color={index === 1 ? "#ffffff" : "#42f0ca"}
            depthWrite={false}
            opacity={opacity * (0.58 - index * 0.1)}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
      <RoundedBox args={[3.45, 2.8, 0.12]} radius={0.12} smoothness={tier === "low" ? 2 : 4}>
        <meshBasicMaterial
          color="#3af0ca"
          depthWrite={false}
          opacity={opacity * 0.2}
          transparent
          wireframe
        />
      </RoundedBox>
      {([
        [-1.55, 1.15, 0.04],
        [1.55, 1.15, 0.04],
        [-1.55, -1.15, 0.04],
        [1.55, -1.15, 0.04],
      ] as const).map((position, index) => (
        <mesh key={index} position={position}>
          <boxGeometry args={[0.13, 0.13, 0.13]} />
          <meshBasicMaterial color="#ffffff" opacity={opacity * 0.68} transparent />
        </mesh>
      ))}
    </group>
  );
}

function ScienceDiorama({ opacity, tier }: DioramaProps) {
  const tubeSegments = tier === "low" ? 44 : tier === "medium" ? 84 : 132;
  const radialSegments = tier === "low" ? 5 : tier === "medium" ? 8 : 12;

  return (
    <group userData={{ value: "Science" }} rotation={[0.18, -0.3, -0.14]}>
      <mesh rotation={[0.42, 0.14, -0.22]}>
        <torusKnotGeometry
          args={[1.02, 0.16, tubeSegments, radialSegments, 2, 3]}
        />
        <meshPhysicalMaterial
          clearcoat={0.84}
          color="#9d32ca"
          emissive="#4c105e"
          emissiveIntensity={0.24}
          metalness={0.46}
          opacity={opacity * 0.9}
          roughness={0.2}
          transparent
        />
      </mesh>
      {tier !== "low" && (
        <mesh rotation={[-0.34, 0.64, 0.38]} scale={0.74}>
          <torusKnotGeometry
            args={[1.02, 0.07, tubeSegments, radialSegments, 3, 2]}
          />
          <meshPhysicalMaterial
            clearcoat={0.95}
            color="#f3dfff"
            depthWrite={false}
            emissive="#8a3ca7"
            emissiveIntensity={0.2}
            opacity={opacity * 0.62}
            roughness={0.13}
            thickness={0.35}
            transmission={0.34}
            transparent
          />
        </mesh>
      )}
      <mesh rotation={[-0.18, 0.38, 0.26]}>
        <dodecahedronGeometry args={[0.48, tier === "high" ? 1 : 0]} />
        <meshPhysicalMaterial
          clearcoat={0.88}
          color="#211525"
          emissive="#7c2492"
          emissiveIntensity={0.28}
          metalness={0.54}
          opacity={opacity}
          roughness={0.18}
          transparent
        />
      </mesh>
      <mesh rotation={[0.28, -0.18, 0.5]} scale={1.42}>
        <icosahedronGeometry args={[1, tier === "high" ? 2 : 1]} />
        <meshBasicMaterial
          color="#b26ad0"
          depthWrite={false}
          opacity={opacity * 0.12}
          transparent
          wireframe
        />
      </mesh>
    </group>
  );
}

const DIORAMA_POSITIONS: readonly Vec3[] = [
  [0.42, 0.02, -25.4],
  [-0.55, 0.05, -27.75],
  [0.62, 0.08, -30.05],
  [-0.72, 0.04, -32.2],
];

export function ValueDioramas({ frame, tier }: ValueDioramasProps) {
  const enter = smoothstep(segmentProgress(frame.progress, 0.815, 0.845));
  const leave = 1 - smoothstep(segmentProgress(frame.progress, 0.955, 0.992));
  const journeyOpacity = enter * leave;
  const components = [
    TransparencyDiorama,
    CraftDiorama,
    PrivacyDiorama,
    ScienceDiorama,
  ] as const;

  return (
    <group visible={journeyOpacity > 0.001}>
      {components.map((Diorama, index) => {
        const distance = Math.abs(index - frame.valueFloat);
        const focus = 1 - smoothstep(clamp01(distance));
        const opacity = journeyOpacity * (0.08 + focus * 0.92);
        const scale = 0.7 + focus * 0.3;

        return (
          <group
            key={index}
            position={DIORAMA_POSITIONS[index]}
            rotation={[
              (index % 2 === 0 ? -1 : 1) * 0.06,
              (frame.valueFloat - index) * 0.22 + index * 0.12,
              0,
            ]}
            scale={scale}
          >
            <Diorama opacity={opacity} tier={tier} />
          </group>
        );
      })}
    </group>
  );
}
