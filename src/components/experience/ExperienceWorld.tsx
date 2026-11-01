"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, Fog } from "three";
import { CameraRig } from "./CameraRig";
import { GridRoom, type WallTitles } from "./GridRoom";
import { PortfolioField } from "./PortfolioField";
import { evaluateTimeline } from "./timeline";
import type {
  ExperienceMode,
  ExperienceProduct,
  QualityTier,
  Vec3,
  TimelineFrame,
} from "./types";
import { ValueDioramas } from "./ValueDioramas";
import { VisionServicePortal } from "./VisionServicePortal";
import { useShowcaseTextures } from "./useShowcaseTextures";
import { applyExperienceTheme, WORLD_DARK_COLOR, WORLD_LIGHT_COLOR } from "./theme";
import type { ResolvedTheme } from "@/lib/theme";

export type ExperienceWorldProps = {
  displayTheme?: ResolvedTheme;
  products: ExperienceProduct[];
  glyphRotation?: Vec3;
  progress: number;
  mode: ExperienceMode;
  tier: QualityTier;
  onAssetsSettled: () => void;
  wallTitles?: WallTitles;
};

function WorldTheme({ frame }: { frame: TimelineFrame }) {
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const colors = useMemo(
    () => ({
      dark: new Color(WORLD_DARK_COLOR),
      light: new Color(WORLD_LIGHT_COLOR),
      mixed: new Color(),
    }),
    [],
  );

  useFrame(() => {
    colors.mixed.lerpColors(colors.dark, colors.light, frame.world.themeMix);
    renderer.setClearColor(colors.mixed, 1);

    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(colors.mixed);
      scene.fog.near = 12 + frame.world.themeMix * 4;
      scene.fog.far = 58 + frame.world.themeMix * 12;
    }
  }, -90);

  return <fog attach="fog" args={[WORLD_DARK_COLOR, 12, 58]} />;
}

export function ExperienceWorld({
  displayTheme = "dark",
  glyphRotation,
  products,
  progress,
  mode,
  tier,
  onAssetsSettled,
  wallTitles,
}: ExperienceWorldProps) {
  const frame = useMemo(
    () => applyExperienceTheme(evaluateTimeline(progress, mode), displayTheme),
    [displayTheme, mode, progress],
  );
  const environmentResolution = tier === "high" ? 256 : tier === "medium" ? 128 : 64;
  const mediaTextures = useShowcaseTextures(products[0]?.href.startsWith("/en/") ?? false, progress >= 0.705, 1024);

  return (
    <>
      <WorldTheme frame={frame} />
      <CameraRig mode={mode} progress={progress} />

      <ambientLight intensity={0.28 + frame.world.themeMix * 0.72} />
      <directionalLight
        castShadow={tier !== "low"}
        color={frame.world.themeMix > 0.5 ? "#fffaf0" : "#ffffff"}
        intensity={2.2}
        position={[6, 9, 8]}
        shadow-mapSize-height={tier === "high" ? 1024 : 512}
        shadow-mapSize-width={tier === "high" ? 1024 : 512}
      />
      <pointLight color="#9764ff" intensity={4} position={[-7, 2, 4]} />
      <pointLight color="#555cff" intensity={2} position={[7, -2, -8]} />

      <Environment
        background={false}
        environmentIntensity={0.85 + frame.world.themeMix * 0.35}
        frames={1}
        resolution={environmentResolution}
      >
        <Lightformer
          color="#ffffff"
          form="rect"
          intensity={1.8}
          position={[0, 0.2, 5]}
          rotation={[0, 0, -0.28]}
          scale={[10, 0.8, 1]}
        />
        <Lightformer
          color="#b388ff"
          form="rect"
          intensity={5}
          position={[4, 1, 3]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[1.2, 6, 1]}
        />
        <Lightformer
          color="#5c5cff"
          form="rect"
          intensity={1.4}
          position={[2, -4, -8]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 5, 1]}
        />
      </Environment>

      <GridRoom frame={frame} tier={tier} mediaTextures={mediaTextures} wallTitles={wallTitles} />
      <VisionServicePortal frame={frame} tier={tier} glyphRotation={glyphRotation} mediaTextures={mediaTextures} />
      <PortfolioField
        frame={frame}
        mode={mode}
        onAssetsSettled={onAssetsSettled}
        products={products}
        tier={tier}
      />
      <ValueDioramas frame={frame} tier={tier} mediaTextures={mediaTextures} />
    </>
  );
}
