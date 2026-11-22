"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  PlaneGeometry,
  SRGBColorSpace,
  type Group,
  Texture,
  TextureLoader,
} from "three";
import { presentationImageUrl } from "./useShowcaseTextures";
import {
  CARD_DEPTH_STEP,
  clamp01,
  interpolateViewportCamera,
  SCENE_PRODUCT_COUNT,
  segmentProgress,
  smoothstep,
} from "./timeline";
import { developmentViewportComposition, portfolioViewportComposition, proofLayoutPose, shouldLoadPortfolioMedia, viewportMobileMix } from "./layout";
import type {
  ExperienceMode,
  ExperienceProduct,
  ExperienceScreenshot,
  QualityTier,
  TimelineFrame,
  Vec3,
} from "./types";

export type PortfolioFieldProps = {
  products: ExperienceProduct[];
  frame: TimelineFrame;
  mode: ExperienceMode;
  tier: QualityTier;
  onAssetsSettled?: () => void;
};

type LoadedTexture = {
  texture: Texture | null;
  aspect: number;
  failed: boolean;
  status: "loading" | "loaded" | "failed";
};

const DEFAULT_ASPECT = 1.6;
// Works hang on a shallow cylinder around the glyph: every face bends around a
// vertical axis so its edges recede, like the reference's curved media panels.
export const PANEL_BEND_RADIUS = 4.6;
const PANEL_BACKING_DEPTH = 0.05;

export function bentPanelGeometry(width: number, height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height, 32, 1);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const angle = position.getX(index) / PANEL_BEND_RADIUS;
    position.setXYZ(
      index,
      Math.sin(angle) * PANEL_BEND_RADIUS,
      position.getY(index),
      -(1 - Math.cos(angle)) * PANEL_BEND_RADIUS,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function useBentPanel(width: number, height: number): PlaneGeometry {
  const geometry = useMemo(() => bentPanelGeometry(width, height), [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function imageAspect(texture: Texture): number {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  if (width <= 0 || height <= 0) return DEFAULT_ASPECT;
  return width / height;
}

function useCardTexture(
  path: string | undefined,
  tier: QualityTier,
  onSettled: (path: string) => void,
): LoadedTexture {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const gl = useThree((state) => state.gl);
  const [state, setState] = useState<LoadedTexture>({
    texture: null,
    aspect: DEFAULT_ASPECT,
    failed: false,
    status: "loading",
  });
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    let active = true;
    let loadedTexture: Texture | null = null;
    setState({ texture: null, aspect: DEFAULT_ASPECT, failed: false, status: "loading" });

    if (!path) {
      setState({ texture: null, aspect: DEFAULT_ASPECT, failed: true, status: "failed" });
      return;
    }
    const loader = new TextureLoader();
    loader.load(
      presentationImageUrl(path),
      (texture) => {
        loadedTexture = texture;
        texture.colorSpace = SRGBColorSpace;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        if (!active) {
          texture.dispose();
          return;
        }
        setState({
          texture,
          aspect: imageAspect(texture),
          failed: false,
          status: "loaded",
        });
      },
      undefined,
      () => {
        if (active) {
          setState({
            texture: null,
            aspect: DEFAULT_ASPECT,
            failed: true,
            status: "failed",
          });
        }
      },
    );

    return () => {
      active = false;
      loadedTexture?.dispose();
    };
  }, [path]);

  useEffect(() => {
    if (!state.texture) return;
    state.texture.anisotropy = Math.min(
      maxAnisotropy,
      tier === "high" ? 8 : tier === "medium" ? 4 : 2,
    );
    state.texture.needsUpdate = true;
    // W7 BT10: upload to the GPU now (idle, as the picture arrives) instead of during the first frame that draws the card.
    gl.initTexture(state.texture);
  }, [gl, maxAnisotropy, state.texture, tier]);

  // Effects run after React has committed the loaded/fallback material. The
  // Canvas lifecycle then waits one additional rendered frame before capture.
  useEffect(() => {
    if (path && state.status !== "loading") onSettledRef.current(path);
  }, [path, state.status]);

  return state;
}

function dimensionsForAspect(aspect: number): readonly [number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : DEFAULT_ASPECT;
  const maxWidth = 3.9;
  const maxHeight = 2.65;

  if (safeAspect >= maxWidth / maxHeight) {
    return [maxWidth, maxWidth / safeAspect];
  }
  return [maxHeight * safeAspect, maxHeight];
}

function makeFallbackTexture(product: ExperienceProduct): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 480;
  const context = canvas.getContext("2d");

  if (context) {
    const scale = canvas.width / 1024;
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, product.colors.background);
    gradient.addColorStop(0.58, product.colors.primary);
    gradient.addColorStop(1, product.colors.secondary);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.globalAlpha = 0.28;
    context.strokeStyle = product.colors.accent;
    context.lineWidth = 3 * scale;
    for (let index = -4; index < 14; index += 1) {
      context.beginPath();
      context.moveTo(index * 110 * scale, 0);
      context.lineTo((index * 110 + 420) * scale, canvas.height);
      context.stroke();
    }

    context.globalAlpha = 1;
    context.fillStyle = "#ffffff";
    context.font = `800 ${190 * scale}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(product.monogram, canvas.width * 0.64, 265 * scale);
    context.font = `650 ${62 * scale}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    context.fillText(product.name, canvas.width * 0.64, 455 * scale);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function BrandedFallback({
  product,
  opacity,
  compact = false,
}: {
  product: ExperienceProduct;
  opacity: number;
  compact?: boolean;
}) {
  const texture = useMemo(() => makeFallbackTexture(product), [product]);
  useEffect(() => () => texture.dispose(), [texture]);
  const width = compact ? 3.15 : 3.75;
  const height = width / DEFAULT_ASPECT;
  const backing = useBentPanel(width + 0.14, height + 0.14);
  const face = useBentPanel(width, height);

  return (
    <group>
      <mesh geometry={backing} position={[0, 0, -PANEL_BACKING_DEPTH]}>
        <meshStandardMaterial
          color={product.colors.background}
          depthWrite={opacity > 0.9}
          metalness={0.25}
          opacity={opacity}
          roughness={0.42}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh geometry={face}>
        <meshBasicMaterial
          depthWrite={false}
          map={texture}
          opacity={opacity}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}

function ScreenshotLayer({
  screenshot,
  product,
  layerIndex,
  opacity,
  tier,
  onAssetSettled,
}: {
  screenshot: ExperienceScreenshot;
  product: ExperienceProduct;
  layerIndex: number;
  opacity: number;
  tier: QualityTier;
  onAssetSettled: (path: string) => void;
}) {
  const loaded = useCardTexture(screenshot.path, tier, onAssetSettled);
  const viewportSize = useThree((state) => state.size);
  const [width, height] = dimensionsForAspect(loaded.aspect);
  const backing = useBentPanel(width + 0.14, height + 0.14);
  const face = useBentPanel(width, height);
  const detail = layerIndex > 0;
  const wideCapture = loaded.aspect > 2.5;
  const mobileMix = viewportMobileMix(viewportSize.width);
  const compactWideMix = mobileMix
    * (1 - smoothstep((viewportSize.height - 680) / 120));
  const layerOpacity = opacity * (detail ? 0.94 : 1);
  // One dominant, uncropped image anchors the work; supporting captures sit
  // smaller at the side. Portrait wide strips retain the short-screen layout.
  const position: Vec3 = wideCapture
    ? detail
      ? [2.35 * (1 - mobileMix), -0.35 - mobileMix * 0.27 + compactWideMix * 0.15, -0.48 + mobileMix * 0.42]
      : [0, 0.72, 0]
    : detail ? [2.5, 0.15, -0.6] : [0, 0, 0];
  const rotation: Vec3 = [0, detail ? -0.18 * (wideCapture ? 1 - mobileMix : 1) : 0, 0];
  // The667px portrait detail remains at.75scale/y-.47; taller viewports give
  // the primary more visual weight without cropping either registered image.
  const scale = detail ? (wideCapture ? 0.62 + compactWideMix * 0.13 : 0.46) : 1;

  if (!loaded.texture || loaded.failed) {
    return (
      <group
        position={position}
        rotation={rotation}
        scale={scale}
      >
        <BrandedFallback compact={layerIndex > 0} opacity={layerOpacity} product={product} />
      </group>
    );
  }

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <mesh geometry={backing} position={[0, 0, -PANEL_BACKING_DEPTH]}>
        <meshStandardMaterial
          color={product.colors.background}
          depthWrite={layerOpacity > 0.9}
          metalness={0.18}
          opacity={layerOpacity}
          roughness={0.35}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh geometry={face}>
        <meshBasicMaterial
          depthWrite={layerOpacity > 0.85}
          fog={false}
          map={loaded.texture}
          opacity={layerOpacity}
          toneMapped={false}
          transparent={layerOpacity < 0.999}
        />
      </mesh>
    </group>
  );
}

function LifeOSCore({
  product,
  opacity,
  tier,
}: {
  product: ExperienceProduct;
  opacity: number;
  tier: QualityTier;
}) {
  const segments = tier === "low" ? 2 : tier === "medium" ? 3 : 5;

  return (
    <group scale={0.88}>
      <mesh rotation={[0.55, 0.75, 0]}>
        <icosahedronGeometry args={[1.05, segments]} />
        <meshPhysicalMaterial
          clearcoat={0.8}
          color={product.colors.primary}
          depthWrite={opacity > 0.8}
          emissive={product.colors.secondary}
          emissiveIntensity={0.14}
          ior={1.35}
          metalness={tier === "low" ? 0.6 : 0.12}
          opacity={opacity * 0.88}
          roughness={tier === "low" ? 0.3 : 0.12}
          thickness={tier === "low" ? 0 : 0.75}
          transmission={tier === "low" ? 0 : 0.58}
          transparent
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.18, 0]}>
        <torusGeometry args={[1.42, 0.025, 8, tier === "low" ? 48 : 96]} />
        <meshBasicMaterial
          color={product.colors.accent}
          depthWrite={false}
          opacity={opacity * 0.74}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh rotation={[0.25, Math.PI / 2, 0]}>
        <torusGeometry args={[1.66, 0.018, 8, tier === "low" ? 48 : 96]} />
        <meshBasicMaterial
          color="#ffffff"
          depthWrite={false}
          opacity={opacity * 0.45}
          transparent
        />
      </mesh>
      <mesh>
        <boxGeometry args={[3.45, 2.65, 0.08]} />
        <meshBasicMaterial
          color={product.colors.accent}
          depthWrite={false}
          opacity={opacity * 0.28}
          transparent
          wireframe
        />
      </mesh>
    </group>
  );
}

function WireMaterial({ color, opacity }: { color: string; opacity: number }) {
  return (
    <meshBasicMaterial
      color={color}
      depthWrite={false}
      opacity={opacity}
      toneMapped={false}
      transparent
      wireframe
    />
  );
}

function ResearchWireframe({
  product,
  variant,
  opacity,
  tier,
}: {
  product: ExperienceProduct;
  variant: number;
  opacity: number;
  tier: QualityTier;
}) {
  const radialSegments = tier === "low" ? 24 : 56;

  return (
    <group scale={0.92}>
      <mesh rotation={[0.25, 0.4, 0]}>
        {variant === 0 ? <sphereGeometry args={[0.72, radialSegments, tier === "low" ? 12 : 24]} /> : null}
        {variant === 1 ? <torusKnotGeometry args={[0.7, 0.18, radialSegments * 2, 8, 2, 3]} /> : null}
        {variant === 2 ? <octahedronGeometry args={[0.82, 0]} /> : null}
        {variant === 3 ? <torusGeometry args={[0.59, 0.12, 12, radialSegments]} /> : null}
        {variant === 4 ? <dodecahedronGeometry args={[0.92, 0]} /> : null}
        <meshStandardMaterial
          color={product.colors.primary}
          depthWrite={opacity > 0.9}
          emissive={product.colors.secondary}
          emissiveIntensity={0.12}
          fog={false}
          metalness={0.72}
          opacity={opacity}
          roughness={0.24}
          transparent
        />
      </mesh>
      {variant === 0 && (
        <>
          <mesh>
            <sphereGeometry args={[0.82, radialSegments, tier === "low" ? 12 : 28]} />
            <WireMaterial color={product.colors.primary} opacity={opacity * 0.7} />
          </mesh>
          {[0, 1, 2].map((index) => (
            <mesh key={index} rotation={[index * 0.72, index * 0.48, 0]}>
              <torusGeometry args={[1.18 + index * 0.18, 0.025, 6, radialSegments]} />
              <WireMaterial color={product.colors.accent} opacity={opacity * 0.62} />
            </mesh>
          ))}
        </>
      )}
      {variant === 1 && (
        <>
          <mesh rotation={[0.5, 0.2, 0]}>
            <torusKnotGeometry args={[0.84, 0.22, radialSegments * 2, 8, 2, 3]} />
            <WireMaterial color={product.colors.primary} opacity={opacity * 0.72} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.38, 1.43, radialSegments]} />
            <WireMaterial color={product.colors.accent} opacity={opacity * 0.52} />
          </mesh>
        </>
      )}
      {variant === 2 && (
        <>
          {[-1, 0, 1].map((index) => (
            <mesh
              key={index}
              position={[index * 0.82, Math.abs(index) * -0.28, index * -0.12]}
              rotation={[index * 0.28, index * 0.45, 0]}
            >
              <octahedronGeometry args={[index === 0 ? 0.92 : 0.58, tier === "low" ? 0 : 1]} />
              <WireMaterial
                color={index === 0 ? product.colors.primary : product.colors.accent}
                opacity={opacity * (index === 0 ? 0.75 : 0.5)}
              />
            </mesh>
          ))}
        </>
      )}
      {variant === 3 && (
        <>
          {[-1.25, -0.62, 0, 0.62, 1.25].map((x, index) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, index * 0.18, 0]}>
              <torusGeometry args={[0.6 + Math.abs(index - 2) * 0.08, 0.045, 6, radialSegments]} />
              <WireMaterial
                color={index % 2 === 0 ? product.colors.primary : product.colors.accent}
                opacity={opacity * (0.42 + (2 - Math.abs(index - 2)) * 0.1)}
              />
            </mesh>
          ))}
        </>
      )}
      {variant === 4 && (
        <>
          <mesh rotation={[0.25, 0.55, 0]}>
            <dodecahedronGeometry args={[1.05, tier === "low" ? 0 : 1]} />
            <WireMaterial color={product.colors.primary} opacity={opacity * 0.72} />
          </mesh>
          {([
            [-1.45, 0.72, 0],
            [1.4, 0.62, -0.1],
            [-1.18, -0.92, 0.1],
            [1.32, -0.82, 0],
          ] as const).map((position, index) => (
            <mesh key={index} position={position}>
              <icosahedronGeometry args={[0.18, 1]} />
              <meshBasicMaterial
                color={product.colors.accent}
                depthWrite={false}
                opacity={opacity * 0.74}
                toneMapped={false}
                transparent
              />
            </mesh>
          ))}
        </>
      )}

      <mesh rotation={[0.08, -0.12, 0]}>
        <boxGeometry args={[3.65, 2.55, 0.16]} />
        <WireMaterial color={product.colors.secondary} opacity={opacity * 0.24} />
      </mesh>
    </group>
  );
}

type IdentityProps = {
  product: ExperienceProduct; opacity: number; tier: QualityTier; onAssetSettled: (path: string) => void;
};

/** iOS app-icon corner radius as a share of the side (continuous-corner approximation). */
const ICON_CORNER_RATIO = 0.2237;
const ICON_MASK_SIZE = 1024;

/** Squircle coverage mask (white inside, black outside) for meshBasicMaterial.alphaMap, which reads the green channel. */
function makeIconMask(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = ICON_MASK_SIZE;
  canvas.height = ICON_MASK_SIZE;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.fillStyle = "#000";
  c.fillRect(0, 0, ICON_MASK_SIZE, ICON_MASK_SIZE);
  c.fillStyle = "#fff";
  c.beginPath();
  c.roundRect(0, 0, ICON_MASK_SIZE, ICON_MASK_SIZE, ICON_MASK_SIZE * ICON_CORNER_RATIO);
  c.fill();
  const mask = new CanvasTexture(canvas);
  mask.generateMipmaps = true;
  mask.minFilter = LinearMipmapLinearFilter;
  mask.magFilter = LinearFilter;
  return mask;
}

function IdentityPlane({ product, opacity, map }: { product: ExperienceProduct; opacity: number; map: Texture | null }) {
  // The real app icon (iOS 1024 px master, unaltered) on a squircle mask: no recolour, no backing box.
  const mask = useMemo(() => makeIconMask(), []);
  useEffect(() => () => mask?.dispose(), [mask]);
  return (
    <group userData={{ presentationKind: product.developmentPreviews?.length ? "development" : "identity" }}>
      {map && (
        <mesh>
          {/* W8-26: 2.45 (was 2.6) keeps the on-stage icon <= 512 CSS px (was 540), so the 1024 px master stays >= 2x. */}
          <planeGeometry args={[2.45, 2.45]} />
          <meshBasicMaterial map={map} alphaMap={mask} opacity={opacity} transparent depthWrite={opacity > 0.85} toneMapped={false} fog={false} />
        </mesh>
      )}
    </group>
  );
}

/** The scene cover is the product's real icon.png (1024 px, sRGB, mipmapped by useCardTexture) on a squircle mask. */
function IdentityPresentation({ product, opacity, tier, onAssetSettled }: IdentityProps) {
  const icon = useCardTexture(product.icon, tier, onAssetSettled);
  return <IdentityPlane product={product} opacity={opacity} map={icon.texture} />;
}

function ProductCard({
  product,
  productIndex,
  opacity,
  tier,
  loadRichMedia,
  onAssetSettled,
}: {
  product: ExperienceProduct;
  productIndex: number;
  opacity: number;
  tier: QualityTier;
  loadRichMedia: boolean;
  onAssetSettled: (path: string) => void;
}) {
  if (product.screenshots.length > 0) {
    if (!loadRichMedia) {
      return <BrandedFallback opacity={opacity} product={product} />;
    }

    return (
      <group>
        {product.screenshots.map((screenshot, layerIndex) => (
          <ScreenshotLayer
            key={`${screenshot.path}:${screenshot.sourceBuild}`}
            layerIndex={layerIndex}
            opacity={opacity}
            product={product}
            screenshot={screenshot}
            tier={tier}
            onAssetSettled={onAssetSettled}
          />
        ))}
      </group>
    );
  }

  if (product.developmentPreviews?.length && loadRichMedia) {
    return <ScreenshotLayer screenshot={product.developmentPreviews[0]} product={product} layerIndex={0} opacity={opacity} tier={tier} onAssetSettled={onAssetSettled} />;
  }

  if (product.icon && loadRichMedia) {
    return <IdentityPresentation product={product} opacity={opacity} tier={tier} onAssetSettled={onAssetSettled} />;
  }

  if (product.slug === "lifeos") {
    return (
      <group>
        <BrandedFallback opacity={opacity} product={product} />
        <group position={[-0.88, 0.08, 0.1]} scale={0.62}>
          <LifeOSCore opacity={opacity * 0.24} product={product} tier={tier} />
        </group>
      </group>
    );
  }

  if (product.lifecycle === "research") {
    return (
      <group>
        <group position={[1.24, -0.78, 0.4]} scale={0.28}>
          <BrandedFallback compact opacity={opacity * 0.82} product={product} />
        </group>
        <group rotation={[0.03, -0.12, 0]}>
          <ResearchWireframe
            opacity={opacity}
            product={product}
            tier={tier}
            variant={(productIndex - 2 + 5) % 5}
          />
        </group>
      </group>
    );
  }

  return <BrandedFallback opacity={opacity} product={product} />;
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function lerpVec3(a: Vec3, b: Vec3, amount: number): Vec3 {
  return [
    lerp(a[0], b[0], amount),
    lerp(a[1], b[1], amount),
    lerp(a[2], b[2], amount),
  ];
}

function productPose(
  index: number,
  frame: TimelineFrame,
  mode: ExperienceMode,
  composition: ReturnType<typeof portfolioViewportComposition>,
) {
  const difference = index - frame.productFloat;
  const distance = Math.abs(difference);
  const focus = 1 - smoothstep(clamp01(distance));
  const orbitAngle = difference * 0.6;
  const focusPlane = -1.25 - frame.productFloat * CARD_DEPTH_STEP;
  const arcPosition: Vec3 = [
    composition.center[0] + Math.sin(orbitAngle) * composition.width * 1.65,
    composition.center[1] + Math.sin(orbitAngle * 0.72) * 0.24,
    focusPlane - (1 - Math.cos(orbitAngle)) * 1.45 - Math.min(distance, 3) * 0.04,
  ];
  const arcRotation: Vec3 = [
    Math.sin(orbitAngle * 0.5) * 0.025,
    composition.yaw - orbitAngle * 0.72,
    -Math.sin(orbitAngle) * 0.018,
  ];
  const proof = proofLayoutPose(index, mode);
  const morph = frame.world.proofMorph;

  return {
    position: lerpVec3(arcPosition, proof.position, morph),
    rotation: lerpVec3(arcRotation, proof.rotation, morph),
    scale: lerp(composition.scale * (0.5 + focus * 0.5), proof.scale, morph),
  };
}

export function PortfolioField({
  products,
  frame,
  mode,
  tier,
  onAssetsSettled,
}: PortfolioFieldProps) {
  const viewport = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const fieldGroup = useRef<Group>(null);
  const composition = portfolioViewportComposition(
    interpolateViewportCamera(frame.progress, viewport.width, mode),
    viewport.width,
    viewport.height,
    -1.25 - frame.productFloat * CARD_DEPTH_STEP,
  );
  const enter = smoothstep(segmentProgress(frame.progress, 0.065, 0.105));
  const leave = 1 - smoothstep(segmentProgress(frame.progress, 0.575, 0.615));
  // The final WORKS card yields to the proof ledger before the cards complete
  // their physical morph. Keeping the geometry faint preserves depth without
  // making the evidence typography compete with eight equally bright objects.
  const proofBackdropMix = smoothstep(segmentProgress(frame.progress, 0.49, 0.525));
  const proofBackdropOpacity = lerp(1, 0.24, proofBackdropMix);
  const fieldOpacity = enter * leave * proofBackdropOpacity;
  const [richMediaProducts, setRichMediaProducts] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const eligibleMediaProducts = useMemo(
    () => products.slice(0, SCENE_PRODUCT_COUNT).flatMap((product, index) =>
      (product.screenshots.length > 0 || Boolean(product.icon) || Boolean(product.developmentPreviews?.length)) && shouldLoadPortfolioMedia(
        fieldOpacity,
        Math.abs(index - frame.productFloat),
        frame.world.proofMorph,
      )
        ? [index]
        : [],
    ),
    [fieldOpacity, frame.productFloat, frame.world.proofMorph, products],
  );
  // W7 BT10/BT11/BT12: the cards load their pictures one by one, card 0 and 1 first (what the works entrance shows), then
  // the rest. Each step waits for an idle slot with more than 8 ms left, does at most one card, and backs off while the
  // visitor scrolls (a scroll or wheel in the last 150 ms), so the preload never lands in the same frames as the journey.
  // BT13: the first step comes 0.9 s after mount (the hero must not request portfolio images in its first second: e2e "hero defers portfolio screenshot requests") and the cards follow 100 ms apart (a card is one small image decode and upload
  // now, so all seven are in long before the works entrance and the proof stage, where every card becomes eligible at once).
  // The materials are compiled ONCE, asynchronously, after the last card is in (see below).
  const cardCount = Math.min(products.length, SCENE_PRODUCT_COUNT);
  const lastScrollAt = useRef(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mark = () => { lastScrollAt.current = performance.now(); };
    window.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    return () => {
      window.removeEventListener("scroll", mark);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || cardCount === 0) return undefined;
    const hasIdle = "requestIdleCallback" in window;
    let cancelled = false;
    let timer = 0;
    let idleHandle = 0;
    const schedule = (step: () => void, delay: number) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const run = (deadline?: IdleDeadline) => {
          if (cancelled) return;
          const scrolling = performance.now() - lastScrollAt.current < 150;
          const tight = deadline ? deadline.timeRemaining() < 8 && !deadline.didTimeout : false;
          if (scrolling || tight) { schedule(step, 200); return; }
          step();
        };
        if (hasIdle) idleHandle = window.requestIdleCallback(run, { timeout: 400 }); else run();
      }, delay);
    };
    const loadCard = (index: number) => {
      setRichMediaProducts((current) => (current.has(index) ? current : new Set([...current, index])));
      if (index + 1 < cardCount) schedule(() => loadCard(index + 1), 100);
    };
    schedule(() => loadCard(0), 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (hasIdle) window.cancelIdleCallback(idleHandle);
    };
  }, [cardCount]);
  const compiled = useRef(false);
  // W7 BT13: the programs are built ONCE, after every card's picture is in. While programs build, a card that swaps its
  // fallback for the picture releases materials, and three's compileAsync then throws inside its own timer ("isReady" of
  // undefined, uncatchable), so compiling must not overlap the swaps. The cards load 100 ms apart right after the field mounts
  // (a card is one small decode and upload now), which lets the compile run at ~2.5 s, while the opening card still covers the canvas.
  const allCardsLoaded = cardCount > 0 && richMediaProducts.size >= cardCount;
  useEffect(() => {
    if (compiled.current || !allCardsLoaded) return undefined;
    let timer = 0;
    let cancelled = false;
    const attempt = () => {
      const group = fieldGroup.current;
      if (cancelled || !group || compiled.current) return;
      if (performance.now() - lastScrollAt.current < 150) { timer = window.setTimeout(attempt, 250); return; }
      compiled.current = true;
      const wasVisible = group.visible;
      group.visible = true; // compile() only walks visible objects; the walk is synchronous, the program build is not
      try { gl.compileAsync(scene, camera).catch(() => undefined); } catch { /* the programs then build on first use */ } finally { group.visible = wasVisible; }
    };
    timer = window.setTimeout(attempt, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [allCardsLoaded, camera, gl, scene]);
  const requestedMediaProducts = useMemo(
    () => new Set([...richMediaProducts, ...eligibleMediaProducts]),
    [eligibleMediaProducts, richMediaProducts],
  );

  useEffect(() => {
    if (eligibleMediaProducts.length === 0) return;

    setRichMediaProducts((current) => {
      if (eligibleMediaProducts.every((index) => current.has(index))) return current;
      return new Set([...current, ...eligibleMediaProducts]);
    });
  }, [eligibleMediaProducts]);

  const assetPaths = useMemo(
    () => [
      ...new Set(
        products.slice(0, SCENE_PRODUCT_COUNT).flatMap((product, index) =>
          requestedMediaProducts.has(index)
            ? product.screenshots.length > 0
              ? product.screenshots.map((shot) => shot.path)
              : product.developmentPreviews?.length ? [product.developmentPreviews[0].path]
                : [product.icon].filter((path): path is string => Boolean(path))
            : [],
        ),
      ),
    ],
    [products, requestedMediaProducts],
  );
  const assetKey = assetPaths.join("\u0000");
  const settledAssets = useRef(new Set<string>());
  const notified = useRef(false);
  const onAssetsSettledRef = useRef(onAssetsSettled);

  useEffect(() => {
    onAssetsSettledRef.current = onAssetsSettled;
  }, [onAssetsSettled]);

  useEffect(() => {
    settledAssets.current.clear();
    notified.current = false;
    if (assetPaths.length === 0) {
      notified.current = true;
      onAssetsSettledRef.current?.();
    }
  }, [assetKey, assetPaths.length]);

  const handleAssetSettled = useCallback((path: string) => {
    if (!assetPaths.includes(path)) return;
    settledAssets.current.add(path);
    if (!notified.current && settledAssets.current.size >= assetPaths.length) {
      notified.current = true;
      onAssetsSettledRef.current?.();
    }
  }, [assetPaths]);

  return (
    <group ref={fieldGroup} visible={fieldOpacity > 0.001} userData={{ skipRefractCapture: true }}>
      {products.slice(0, SCENE_PRODUCT_COUNT).map((product, index) => {
        const mediaComposition = product.developmentPreviews?.length
          ? developmentViewportComposition(interpolateViewportCamera(frame.progress, viewport.width, mode), viewport.width, viewport.height, -1.25 - frame.productFloat * CARD_DEPTH_STEP)
          : composition;
        const pose = productPose(index, frame, mode, mediaComposition);
        const portfolioDistance = Math.abs(index - frame.productFloat);
        const portfolioFocus = 1 - smoothstep(clamp01(portfolioDistance));
        // Neighboring works remain quiet side planes around the single active
        // work, with the same existing lazy-media loading boundary.
        const neighborPresence = 1 - smoothstep(segmentProgress(portfolioDistance, 0.75, 2.25));
        const portfolioOpacity = Math.max(0.045, neighborPresence * 0.24 + portfolioFocus * 0.76);
        const proofDistance = Math.abs(index - frame.proofFloat);
        const proofFocus = 1 - smoothstep(clamp01(proofDistance));
        const proofOpacity = 0.22 + proofFocus * 0.78;
        const cardOpacity = lerp(portfolioOpacity, proofOpacity, frame.world.proofMorph);
        const loadRichMedia = requestedMediaProducts.has(index);
        return (
          <group
            key={product.slug}
            position={pose.position}
            rotation={pose.rotation}
            scale={pose.scale}
            userData={{ productSlug: product.slug, mediaClass: product.screenshots.length ? "publication" : product.developmentPreviews?.length ? "dated-development" : "identity" }}
          >
            <ProductCard
              opacity={fieldOpacity * cardOpacity}
              product={product}
              productIndex={index}
              tier={tier}
              loadRichMedia={loadRichMedia}
              onAssetSettled={handleAssetSettled}
            />
          </group>
        );
      })}
    </group>
  );
}
