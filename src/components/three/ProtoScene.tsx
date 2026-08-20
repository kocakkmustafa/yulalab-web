"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Edges,
  Grid,
  MeshTransmissionMaterial,
  Environment,
  Lightformer,
  useTexture,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { CanvasTexture, Color, Vector2, Vector3 } from "three";
import type { Mesh, PerspectiveCamera, PointLight } from "three";
import type { PortfolioCard } from "@/lib/three/portfolio-cards";

const CA_OFFSET = new Vector2(0.0006, 0.0004);

/**
 * Card labels are BAKED into small CanvasTextures instead of per-card
 * troika <Text> instances. Measured: 24 simultaneous troika texts killed
 * the WebGL context outright (context lost -> white page) — bisected by
 * stripping band texts while keeping planes/Edges/light, which survived.
 * One 512px canvas per card is trivial GPU memory and still lives inside
 * the scene (lit, post-processed), while the REAL text stays in the DOM
 * info panel.
 */
/**
 * The page already loads Space Grotesk through next/font — reuse it for
 * every canvas bake by resolving the hashed family name from a probe
 * element. Falls back to system sans if the probe fails; the bake then
 * still renders, just less branded.
 */
let resolvedGroteskFamily: string | null = null;
function groteskFamily(): string {
  if (resolvedGroteskFamily) return resolvedGroteskFamily;
  try {
    const probe = document.createElement("span");
    probe.className = "font-grotesk";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    resolvedGroteskFamily = getComputedStyle(probe).fontFamily || "sans-serif";
    probe.remove();
  } catch {
    resolvedGroteskFamily = "sans-serif";
  }
  return resolvedGroteskFamily;
}

/**
 * The hero word as a high-res baked texture instead of troika text.
 *
 * History, so nobody "upgrades" this back: troika-per-card killed the GL
 * context (24 instances), and even a single troika Text loaded its font
 * through a worker whose blob fetch failed intermittently — the scene came
 * up wordless behind the loader. Refraction doesn't care whether the thing
 * behind the prism is glyph geometry or a textured plane; the prism bends
 * whatever the buffer holds. A 2048px bake is visually identical at this
 * camera distance, loads in one frame, and needs no worker, no extra font
 * file, no CSP carve-out.
 */
function HeroWord({ onReady }: { onReady?: () => void }) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    const family = groteskFamily();
    // Ensure the face is actually loaded before baking — otherwise the
    // canvas silently renders the fallback font.
    document.fonts.load(`700 200px ${family}`).finally(() => {
      if (!alive) return;
      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 640;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 2048, 640);
      ctx.fillStyle = "#F4F4F5";
      ctx.font = `700 430px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // letter-spacing via canvas API where supported
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-26px";
      ctx.fillText("YULA", 1024, 340);
      const t = new CanvasTexture(canvas);
      t.anisotropy = 8;
      setTexture(t);
      onReady?.();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bake once
  }, []);
  if (!texture) return null;
  return (
    <mesh position={[0, 0, -0.6]}>
      <planeGeometry args={[9.2, 9.2 * (640 / 2048)]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function bakeCardLabel(card: PortfolioCard, kind: "typographic" | "strip"): HTMLCanvasElement {
  const w = 512;
  const h = kind === "typographic" ? 340 : 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const mono = "500 17px 'JetBrains Mono', ui-monospace, monospace";
  const grotesk = "700 34px 'Space Grotesk', Inter, sans-serif";

  if (kind === "typographic") {
    ctx.fillStyle = "#131316";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = card.brandPrimary;
    ctx.font = "700 170px 'Space Grotesk', Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(card.name.charAt(0), w / 2, h / 2 - 24);
    ctx.font = mono;
    ctx.fillStyle = "#6B6B75";
    ctx.fillText(
      card.lifecycle === "research" ? "ARAŞTIRMA — GERÇEK EKRAN YOK" : "KAYITLI EKRAN GÖRÜNTÜSÜ YOK",
      w / 2,
      h - 34,
    );
  } else {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = "middle";
    ctx.font = grotesk;
    ctx.fillStyle = "#F4F4F5";
    ctx.textAlign = "left";
    ctx.fillText(card.name, 4, h / 2);
    ctx.font = mono;
    ctx.fillStyle = card.lifecycle === "research" ? "#9A9AA3" : card.brandPrimary;
    ctx.textAlign = "right";
    ctx.fillText(card.statusTr.toUpperCase(), w - 4, h / 2);
  }
  return canvas;
}

/** Scroll progress the DOM writes and the scene reads every frame — a ref,
 *  not state, so scrolling never re-renders React. */
export type SceneProgress = { fly: number; band: number };

const TUNE = {
  prismFollowX: 2.4,
  prismFollowY: 1.3,
  prismLerp: 2.2,
  cameraLerp: 2.6,
  prismSwing: 0.25,
  cameraDrift: 0.55,
  /** World-units between card centers on the band. */
  cardSpacing: 4.4,
  /** Band depth — sits just in front of the back wall (z=-7). */
  bandZ: -6,
  /** Camera's resting distance from the band. */
  bandCamZ: -0.9,
};

function PrismRig({ progress }: { progress: React.RefObject<SceneProgress> }) {
  const mesh = useRef<Mesh>(null);
  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const k = Math.min(1, delta * TUNE.prismLerp);
    m.position.x += (state.pointer.x * TUNE.prismFollowX - m.position.x) * k;
    m.position.y += (state.pointer.y * TUNE.prismFollowY - m.position.y) * k;
    m.rotation.z = Math.PI + Math.sin(state.clock.elapsedTime * TUNE.prismSwing) * 0.35;
    // The camera flies PAST the prism into the room — once it's behind the
    // lens its transmission pass is wasted work; park it.
    m.visible = (progress.current?.fly ?? 0) < 0.85;
  });
  return (
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
      <Edges threshold={20} color="#8A8A96" />
    </mesh>
  );
}

function CameraRig({
  progress,
  cardCount,
}: {
  progress: React.RefObject<SceneProgress>;
  cardCount: number;
}) {
  const look = useRef(new Vector3(0, 0, 0));
  useFrame((state, delta) => {
    const cam = state.camera as PerspectiveCamera;
    const { fly, band } = progress.current ?? { fly: 0, band: 0 };
    const k = Math.min(1, delta * TUNE.cameraLerp);

    // Segment 1 — hero hold with pointer drift; Segment 2 — dolly through
    // the room, rising slightly so the lens clears the type; Segment 3 —
    // lateral track along the band.
    const bandX = band * TUNE.cardSpacing * Math.max(0, cardCount - 1);
    const tx = fly < 1 ? state.pointer.x * TUNE.cameraDrift : bandX + state.pointer.x * 0.35;
    const ty =
      fly < 1
        ? state.pointer.y * TUNE.cameraDrift * 0.6 + fly * 1.1
        : 0.25 + state.pointer.y * 0.2;
    const tz = 9 + fly * (TUNE.bandCamZ - 9);

    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (ty - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;

    // Look target eases from the hero's origin to the tracked band point.
    const lookTarget =
      fly < 1
        ? new Vector3(0, 0, fly * TUNE.bandZ)
        : new Vector3(bandX, 0, TUNE.bandZ);
    look.current.lerp(lookTarget, k);
    cam.lookAt(look.current);
  });
  return null;
}

/** The single stage light that takes on the focused product's brand color. */
function StageLight({
  progress,
  cards,
}: {
  progress: React.RefObject<SceneProgress>;
  cards: PortfolioCard[];
}) {
  const light = useRef<PointLight>(null);
  const target = useMemo(() => new Color("#9A9AA3"), []);
  useFrame((_, delta) => {
    const l = light.current;
    if (!l || cards.length === 0) return;
    const { fly, band } = progress.current ?? { fly: 0, band: 0 };
    const idx = Math.min(cards.length - 1, Math.floor(band * cards.length));
    target.set(cards[idx].brandPrimary);
    const k = Math.min(1, delta * 2.5);
    l.color.lerp(target, k);
    const x = idx * TUNE.cardSpacing;
    l.position.x += (x - l.position.x) * k;
    // Only burns once the band is on stage.
    l.intensity += ((fly >= 1 ? 26 : 0) - l.intensity) * k;
  });
  return <pointLight ref={light} position={[0, 1.4, TUNE.bandZ + 1.6]} distance={9} decay={2} />;
}

/** A live/beta product card carrying its REAL, provenance-stamped capture. */
function ScreenshotCard({ card }: { card: PortfolioCard }) {
  const texture = useTexture(card.screenshot!);
  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 16 / 10;
  const w = 2.9;
  const h = Math.min(2.2, w / aspect);
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
      <Edges color={card.brandPrimary} threshold={80} />
    </mesh>
  );
}

/** A product with no recorded capture: typographic, never a fake screen. */
function TypographicCard({ card }: { card: PortfolioCard }) {
  const texture = useMemo(() => {
    const t = new CanvasTexture(bakeCardLabel(card, "typographic"));
    t.anisotropy = 4;
    return t;
  }, [card]);
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2.9, 1.93]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
      <Edges color={card.brandPrimary} threshold={80} />
    </mesh>
  );
}

function LabelStrip({ card }: { card: PortfolioCard }) {
  const texture = useMemo(() => {
    const t = new CanvasTexture(bakeCardLabel(card, "strip"));
    t.anisotropy = 4;
    return t;
  }, [card]);
  // 512x64 canvas at 2.9 world-units wide keeps the strip's aspect.
  return (
    <mesh position={[0, 1.12, 0]} frustumCulled={false}>
      <planeGeometry args={[2.9, 2.9 * (64 / 512)]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

function BandCard({
  card,
  index,
  progress,
  cardCount,
}: {
  card: PortfolioCard;
  index: number;
  progress: React.RefObject<SceneProgress>;
  cardCount: number;
}) {
  const group = useRef<Mesh>(null);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const { band } = progress.current ?? { fly: 0, band: 0 };
    const camX = band * TUNE.cardSpacing * Math.max(0, cardCount - 1);
    const dist = Math.abs(camX - index * TUNE.cardSpacing) / TUNE.cardSpacing;
    // Focused card leans out of the wall and brightens; neighbours recede.
    const focus = Math.max(0, 1 - dist);
    const k = Math.min(1, delta * 3);
    const targetScale = 0.9 + focus * 0.22;
    g.scale.x += (targetScale - g.scale.x) * k;
    g.scale.y += (targetScale - g.scale.y) * k;
    // Below the stage during the hero, rising as the fly-through completes.
    // Never `visible=false`: toggling visibility at scroll time meant eight
    // uncompiled materials hitting the GPU in one frame (context lost,
    // measured) — parked meshes with frustumCulled off still compile and
    // draw from frame one, they just sit under the floor.
    const fly = progress.current?.fly ?? 0;
    const targetY = fly > 0.6 ? 0 : -9;
    g.position.y += (targetY - g.position.y) * Math.min(1, delta * 2.2);
    g.position.z += (TUNE.bandZ + focus * 0.7 - g.position.z) * k;
    g.rotation.y += ((index * TUNE.cardSpacing - camX) * -0.06 - g.rotation.y) * k;
  });
  return (
    <mesh ref={group} position={[index * TUNE.cardSpacing, -9, TUNE.bandZ]} frustumCulled={false}>
      <Suspense
        fallback={
          <mesh>
            <planeGeometry args={[2.9, 1.9]} />
            <meshStandardMaterial color="#0E0E10" roughness={0.9} />
          </mesh>
        }
      >
        {card.screenshot ? <ScreenshotCard card={card} /> : <TypographicCard card={card} />}
      </Suspense>
      <LabelStrip card={card} />
    </mesh>
  );
}

export default function ProtoScene({
  cards,
  progress,
  onTextReady,
}: {
  cards: PortfolioCard[];
  progress: React.RefObject<SceneProgress>;
  onTextReady?: () => void;
}) {
  return (
    <Canvas
      aria-hidden
      camera={{ position: [0, 0, 9], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0A0A0B"]} />
      <fog attach="fog" args={["#08080A", 11, 34]} />

      <HeroWord onReady={onTextReady} />

      <PrismRig progress={progress} />
      <CameraRig progress={progress} cardCount={cards.length} />
      <StageLight progress={progress} cards={cards} />

      <group>
        {cards.map((card, i) => (
          <BandCard
            key={card.slug}
            card={card}
            index={i}
            progress={progress}
            cardCount={cards.length}
          />
        ))}
      </group>

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
