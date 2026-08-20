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
import { AdditiveBlending, CanvasTexture, Color, Vector2, Vector3 } from "three";
import type { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PointLight } from "three";
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
  return <HeroWordMesh texture={texture} />;
}

function HeroWordMesh({ texture }: { texture: CanvasTexture }) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    mesh.current?.scale.setScalar(layout.scale);
  });
  return (
    <mesh ref={mesh} position={[0, 0, -0.6]}>
      <planeGeometry args={[10.6, 10.6 * (640 / 2048)]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** The reference hero's signature: a wall of glowing blue mosaic tiles,
 *  randomly lit, behind the type. Baked once; bright tiles are pushed past
 *  1.0-ish luminance via pure saturated fills so Bloom picks them up. */
function bakeMosaic(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#04050C";
  ctx.fillRect(0, 0, 1024, 512);
  const cols = 44;
  const rows = 22;
  const tw = 1024 / cols;
  const th = 512 / rows;
  // deterministic pseudo-random so re-bakes look identical
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const palette = ["#060818", "#0A1030", "#101C4E", "#16266B", "#1E349A", "#2B4AD8", "#3A5EFF"];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const r = rnd();
      // mostly dark, a scatter of bright tiles like the reel
      const idx = r > 0.97 ? 6 : r > 0.92 ? 5 : r > 0.82 ? 4 : r > 0.66 ? 3 : r > 0.46 ? 2 : r > 0.24 ? 1 : 0;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x * tw + 1, y * th + 1, tw - 2, th - 2);
    }
  }
  // grid lines over the tiles
  ctx.strokeStyle = "rgba(90,120,255,0.28)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tw, 0);
    ctx.lineTo(x * tw, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * th);
    ctx.lineTo(1024, y * th);
    ctx.stroke();
  }
  // Edge falloff baked in — the reel's wall burns bright at center and
  // dies into black at the frame edges.
  const vg = ctx.createRadialGradient(512, 256, 120, 512, 256, 620);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 1024, 512);
  return c;
}

/** Hero backdrop wall; fades out as the camera flies into the works room. */
function MosaicWall({ progress }: { progress: React.RefObject<SceneProgress> }) {
  const texture = useMemo(() => {
    const t = new CanvasTexture(bakeMosaic());
    t.anisotropy = 4;
    return t;
  }, []);
  const mat = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    const fly = progress.current?.fly ?? 0;
    if (mat.current) mat.current.opacity = Math.max(0, 1 - fly * 1.6);
  });
  return (
    <mesh position={[0, 0.4, -7.3]}>
      <planeGeometry args={[34, 17]} />
      <meshBasicMaterial ref={mat} map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** Soft radial brand glow, baked once per color. The band's card materials
 *  are unlit (baked/basic), so a point light alone reads as nothing — this
 *  additive plane IS the visible "stage takes the product's color" beat,
 *  with the point light kept for any lit material that joins later. */
const glowCache = new Map<string, HTMLCanvasElement>();
function bakeGlow(color: string): HTMLCanvasElement {
  const hit = glowCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  glowCache.set(color, c);
  return c;
}

function FocusGlow({ card }: { card: PortfolioCard }) {
  const texture = useMemo(() => new CanvasTexture(bakeGlow(card.brandPrimary)), [card]);
  return (
    <mesh position={[0, -0.1, -0.9]} frustumCulled={false}>
      <planeGeometry args={[7.5, 5.2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.27}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function bakeCardLabel(card: PortfolioCard): HTMLCanvasElement {
  const w = 512;
  const h = 340;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const mono = "500 17px 'JetBrains Mono', ui-monospace, monospace";

  {
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
  }
  return canvas;
}

/** Scroll progress the DOM writes and the scene reads every frame — a ref,
 *  not state, so scrolling never re-renders React. */
export type SceneProgress = { fly: number; band: number };

/** Aspect-driven world scale so the fixed-size band/word survive portrait
 *  viewports (a 2.9-unit card in a 1.5-unit-wide mobile frustum was pure
 *  crop). Written once per resize by ResponsiveRig, read per frame. */
const layout = { scale: 1 };

function ResponsiveRig() {
  useFrame((state) => {
    const aspect = state.size.width / state.size.height;
    // 16:9 → 1.0, narrow portrait → ~0.5; clamped so desktop never shrinks.
    layout.scale = Math.min(1, Math.max(0.42, 0.32 + 0.62 * (aspect / 1.78)));
  });
  return null;
}

const TUNE = {
  prismFollowX: 2.4,
  prismFollowY: 1.3,
  prismLerp: 2.2,
  cameraLerp: 2.6,
  prismSwing: 0.25,
  cameraDrift: 0.95,
  /** World-units between card centers on the band. */
  cardSpacing: 4.4,
  /** Band depth — sits just in front of the back wall (z=-7). */
  bandZ: -6,
  /** Camera's resting distance from the band. */
  bandCamZ: -0.9,
};

/** Shared glass recipe — hero shard and the works' floating fragments. */
function GlassMaterial() {
  return (
    <MeshTransmissionMaterial
      transmission={1}
      thickness={1.2}
      roughness={0.05}
      ior={1.5}
      chromaticAberration={0.4}
      anisotropicBlur={0.3}
      distortion={0.3}
      distortionScale={0.5}
      temporalDistortion={0.12}
      backside
    />
  );
}

function PrismRig({ progress }: { progress: React.RefObject<SceneProgress> }) {
  const mesh = useRef<Group>(null);
  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const k = Math.min(1, delta * TUNE.prismLerp);
    m.position.x += (state.pointer.x * TUNE.prismFollowX - 0.6 - m.position.x) * k;
    m.position.y += (state.pointer.y * TUNE.prismFollowY - m.position.y) * k;
    // Continuous tumble like the reel's fragment — not a pendulum.
    m.rotation.y = t * 0.5;
    m.rotation.z = 0.35 + Math.sin(t * 0.3) * 0.25;
    m.rotation.x = Math.sin(t * 0.22) * 0.2;
    // Intro: the shard grows into the scene over the first beats.
    const intro = Math.min(1, t / 1.4);
    const ease = 1 - Math.pow(1 - intro, 3);
    m.scale.setScalar(layout.scale * ease);
    m.visible = (progress.current?.fly ?? 0) < 0.85;
  });
  return (
    // Elongated octahedron = tall angular glass shard (the reel's fragment
    // silhouette), replacing the earlier equilateral prism.
    <group ref={mesh} position={[-0.6, 0, 2.2]} scale={0.001}>
      <mesh scale={[0.62, 2.7, 0.4]}>
        <octahedronGeometry args={[1, 0]} />
        <GlassMaterial />
        <Edges threshold={20} color="#9AA6C8" />
      </mesh>
    </group>
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
    const bandX = band * TUNE.cardSpacing * layout.scale * Math.max(0, cardCount - 1);
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
    const x = idx * TUNE.cardSpacing * layout.scale;
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
    const t = new CanvasTexture(bakeCardLabel(card));
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

/** Two small tumbling glass fragments that ride with the focused card —
 *  the reel frames every project with refracting shards. */
function WorksShards({
  progress,
  cardCount,
}: {
  progress: React.RefObject<SceneProgress>;
  cardCount: number;
}) {
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  useFrame((state, delta) => {
    const { fly, band } = progress.current ?? { fly: 0, band: 0 };
    const t = state.clock.elapsedTime;
    const sc = layout.scale;
    const camX = band * TUNE.cardSpacing * sc * Math.max(0, cardCount - 1);
    const k = Math.min(1, delta * 2.2);
    const on = fly >= 1;
    const pair: [typeof a, number, number, number][] = [
      [a, -1.7, 0.5, 0.9],
      [b, 1.75, -0.75, 1.15],
    ];
    for (const [ref, ox, oy, oz] of pair) {
      const g = ref.current;
      if (!g) continue;
      g.visible = on;
      g.position.x += (camX + ox * sc + state.pointer.x * 0.4 - g.position.x) * k;
      g.position.y += (oy * sc + state.pointer.y * 0.3 - g.position.y) * k;
      g.position.z = TUNE.bandZ + oz;
      g.rotation.y = t * (ox < 0 ? 0.55 : -0.45);
      g.rotation.z = Math.sin(t * 0.4 + ox) * 0.5;
      g.scale.setScalar(sc * 0.55);
    }
  });
  return (
    <>
      <group ref={a} visible={false}>
        <mesh scale={[0.5, 1.9, 0.32]}>
          <octahedronGeometry args={[1, 0]} />
          <GlassMaterial />
          <Edges threshold={20} color="#9AA6C8" />
        </mesh>
      </group>
      <group ref={b} visible={false}>
        <mesh scale={[0.4, 1.4, 0.28]}>
          <octahedronGeometry args={[1, 0]} />
          <GlassMaterial />
          <Edges threshold={20} color="#9AA6C8" />
        </mesh>
      </group>
    </>
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
    const sc = layout.scale;
    const camX = band * TUNE.cardSpacing * sc * Math.max(0, cardCount - 1);
    const dist = Math.abs(camX - index * TUNE.cardSpacing * sc) / (TUNE.cardSpacing * sc);
    // Focused card leans out of the wall and brightens; neighbours recede.
    const focus = Math.max(0, 1 - dist);
    const k = Math.min(1, delta * 3);
    const targetScale = (0.86 + focus * 0.42) * sc;
    g.scale.x += (targetScale - g.scale.x) * k;
    g.scale.y += (targetScale - g.scale.y) * k;
    g.position.x += (index * TUNE.cardSpacing * sc - g.position.x) * k;
    // Below the stage during the hero, rising as the fly-through completes.
    // Never `visible=false`: toggling visibility at scroll time meant eight
    // uncompiled materials hitting the GPU in one frame (context lost,
    // measured) — parked meshes with frustumCulled off still compile and
    // draw from frame one, they just sit under the floor.
    const fly = progress.current?.fly ?? 0;
    const targetY = fly > 0.6 ? 0 : -9;
    g.position.y += (targetY - g.position.y) * Math.min(1, delta * 2.2);
    g.position.z += (TUNE.bandZ - 0.9 + focus * 1.7 - g.position.z) * k;
    g.rotation.y += ((index * TUNE.cardSpacing * layout.scale - camX) * -0.06 - g.rotation.y) * k;
  });
  return (
    <mesh ref={group} position={[index * TUNE.cardSpacing, -9, TUNE.bandZ]} frustumCulled={false}>
      <FocusGlow card={card} />
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
      <color attach="background" args={["#05060C"]} />
      <fog attach="fog" args={["#070A16", 11, 34]} />

      <MosaicWall progress={progress} />
      <HeroWord onReady={onTextReady} />

      <ResponsiveRig />
      <PrismRig progress={progress} />
      <WorksShards progress={progress} cardCount={cards.length} />
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
        cellColor="#1C2238"
        sectionSize={4.5}
        sectionThickness={1}
        sectionColor="#2C3A66"
        fadeDistance={28}
        fadeStrength={2.5}
        infiniteGrid
      />
      <Grid
        position={[0, 0, -7]}
        rotation={[Math.PI / 2, 0, 0]}
        cellSize={0.9}
        cellThickness={0.6}
        cellColor="#161B30"
        sectionSize={4.5}
        sectionThickness={1}
        sectionColor="#25305A"
        fadeDistance={30}
        fadeStrength={2.2}
        infiniteGrid
      />

      <Environment resolution={128}>
        <Lightformer intensity={3.6} position={[5, 4, 6]} scale={[7, 0.6, 1]} rotation-y={-0.6} />
        <Lightformer intensity={2.4} position={[-6, 2, 4]} scale={[6, 0.5, 1]} rotation-y={0.7} />
        <Lightformer intensity={1.6} position={[0, -4, 5]} scale={[8, 0.4, 1]} rotation-x={0.8} color="#B8C4FF" />
        <Lightformer intensity={2.2} position={[3, -2, 7]} scale={[2.4, 0.5, 1]} rotation-y={-0.4} color="#FFB37A" />
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
