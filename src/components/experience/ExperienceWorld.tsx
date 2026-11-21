"use client";

import { Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, Fog } from "three";
import { CameraRig } from "./CameraRig";
import { MouseFluid } from "./MouseFluid";
import { GridRoom, type WallTitles } from "./GridRoom";
import { LightformerEnvironment } from "./LightformerEnvironment";
import { PortfolioField } from "./PortfolioField";
import { evaluateTimeline, STAGES } from "./timeline";
import type {
  ExperienceMode,
  ExperienceProduct,
  QualityTier,
  Vec3,
  TimelineFrame,
} from "./types";
import { ValueDioramas } from "./ValueDioramas";
import { ValuesScreen } from "./ValuesScreen";
import { VisionServicePortal } from "./VisionServicePortal";
import { useShowcaseTextures } from "./useShowcaseTextures";
import { useWorksCardTextures } from "./useWorksCardTextures";
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

const VALUES_ROOM_START = 0.84;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
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
  const worksTextures = useWorksCardTextures(products, progress < 0.52);

  // W8 Q7: the hero draws no shadow map (the reference has none). autoUpdate keeps the shader paths unchanged, so leaving the hero
  // does not recompile every lit material; it only starts the shadow pass again.
  const glRenderer = useThree((state) => state.gl);
  const inHero = progress < STAGES.hero[1];
  useEffect(() => {
    glRenderer.shadowMap.autoUpdate = !inHero;
    glRenderer.shadowMap.needsUpdate = !inHero;
  }, [glRenderer, inHero]);

  return (
    <>
      <WorldTheme frame={frame} />
      <CameraRig mode={mode} progress={progress} />
      <MouseFluid active={mode === "desktop" && tier !== "low" && !prefersReducedMotion()} />

      <ambientLight intensity={0.28 + frame.world.themeMix * 0.72} />
      <directionalLight
        castShadow={tier !== "low"}
        color={frame.world.themeMix > 0.5 ? "#fffaf0" : "#ffffff"}
        intensity={2.2}
        position={[6, 9, 8]}
        shadow-mapSize-height={tier === "high" ? 1024 : 512}
        shadow-mapSize-width={tier === "high" ? 1024 : 512}
      />
      <pointLight color="#ffffff" intensity={3} position={[-7, 2, 4]} />
      <pointLight color="#e8eeff" intensity={1.5} position={[7, -2, -8]} />

      <LightformerEnvironment
        environmentIntensity={0.85 + frame.world.themeMix * 0.35}
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
        {/* Neutral studio strips: thin sources give the glass crisp edge
            highlights, and its dispersion supplies the only colour. */}
        <Lightformer
          color="#ffffff"
          form="rect"
          intensity={4}
          position={[4, 1, 3]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[0.5, 7, 1]}
        />
        <Lightformer
          color="#ffffff"
          form="rect"
          intensity={3}
          position={[-4, 0, 3]}
          rotation={[0, Math.PI / 3, 0]}
          scale={[0.35, 7, 1]}
        />
        <Lightformer
          color="#ffffff"
          form="rect"
          intensity={0.6}
          position={[2, -4, -8]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 5, 1]}
        />
      </LightformerEnvironment>

      <GridRoom frame={frame} tier={tier} mediaTextures={mediaTextures} worksTextures={worksTextures} wallTitles={wallTitles} />
      {/* W1D K5: the values room is flat ground light; the glyph and the opaque service panels are gone from there. */}
      {frame.progress < VALUES_ROOM_START ? (
        <VisionServicePortal frame={frame} tier={tier} glyphRotation={glyphRotation} mediaTextures={mediaTextures} />
      ) : null}
      <PortfolioField
        frame={frame}
        mode={mode}
        onAssetsSettled={onAssetsSettled}
        products={products}
        tier={tier}
      />
      {frame.progress >= 0.835 && frame.progress < 0.92 ? <ValuesScreen frame={frame} mode={mode} /> : null}
      {frame.progress < VALUES_ROOM_START ? (
        <ValueDioramas frame={frame} tier={tier} mediaTextures={mediaTextures} />
      ) : null}
    </>
  );
}
