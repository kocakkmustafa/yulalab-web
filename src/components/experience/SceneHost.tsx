"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { usePathname } from "@/i18n/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ExperienceCanvasProps } from "./ExperienceCanvas";
import { ExperienceErrorBoundary } from "./ExperienceErrorBoundary";
import type { WallTitles } from "./GridRoom";
import { scheduleAfterLoad } from "./loader";
import { detectExperienceCapabilities } from "./quality";
import {
  backdropLoadPolicy,
  interpolateSceneProgress,
  SCENE_BACKDROP_PROGRESS,
  SCENE_TRANSITION_MS,
  sceneToneForPath,
  type SceneTone,
} from "./scene-route";
import type { ExperienceMode, ExperienceProduct, QualityTier, Vec3 } from "./types";

// three.js stays out of every route's first-load bundle; it is fetched only
// when a journey or a content-page backdrop actually asks for the renderer.
const ExperienceCanvas = dynamic<ExperienceCanvasProps>(
  () =>
    import("./ExperienceCanvas").then(
      (module) => module.ExperienceCanvas as ComponentType<ExperienceCanvasProps>,
    ),
  { ssr: false, loading: () => null },
);

/**
 * What the home journey hands the persistent renderer. The journey keeps
 * ownership of its narrative (scroll, opening card, linear fallback); the
 * host only owns the WebGL context, so it survives every route change.
 */
export type SceneJourney = {
  /** Stable per journey mount; a new session is told when the scene is ready. */
  session: string;
  /** The journey's own load gate has passed and it wants the renderer. */
  requested: boolean;
  /** False while the journey shows its linear (2D) document. */
  visible: boolean;
  progress: number;
  glyphRotation: Vec3;
  products: ExperienceProduct[];
  wallTitles: WallTitles;
  mode: ExperienceMode;
  tier: QualityTier;
  onReady: () => void;
  onContextLost: () => void;
  onTierChange: (tier: QualityTier) => void;
};

type SceneHostApi = { setJourney: (journey: SceneJourney | null) => void };

const SceneHostContext = createContext<SceneHostApi | null>(null);

const TIER_RANK: Record<QualityTier, number> = { high: 0, medium: 1, low: 2 };
const MOBILE_QUERY = "(max-width: 767px)";
const FIRST_GESTURE_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"] as const;
const NO_PRODUCTS: ExperienceProduct[] = [];
const NO_ROTATION: Vec3 = [0, 0, 0];

/** False outside the locale layout (isolated renders): no renderer exists. */
export function useSceneHostAvailable(): boolean {
  return useContext(SceneHostContext) !== null;
}

/** Registers the home journey with the layout's renderer for its lifetime. */
export function useSceneJourney(journey: SceneJourney): void {
  const host = useContext(SceneHostContext);
  useLayoutEffect(() => {
    host?.setJourney(journey);
  }, [host, journey]);
  useLayoutEffect(() => () => host?.setJourney(null), [host]);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

type Capabilities = { usable: boolean; tier: QualityTier };
type Tween = { from: number; startedAt: number };

/**
 * Persistent scene root (alche reference §2.1 + §2.8). Lives in the locale
 * layout, outside the route transition, so the WebGL world is created once and
 * kept while pages change around it. Content pages see it as a still, veiled
 * backdrop; legal and account routes see it almost fully veiled, and a visit
 * that starts there never loads it. Reduced motion and devices without
 * hardware WebGL keep the existing CSS ground instead.
 */
export function SceneHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [journey, setJourneyState] = useState<SceneJourney | null>(null);
  const [retained, setRetained] = useState<{ products: ExperienceProduct[]; wallTitles?: WallTitles }>({
    products: NO_PRODUCTS,
  });
  const [ownTier, setOwnTier] = useState<QualityTier>("low");
  const [backdropRequested, setBackdropRequested] = useState(false);
  const [canvasRequested, setCanvasRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tween, setTween] = useState<Tween | null>(null);
  const [now, setNow] = useState(0);
  const journeyRef = useRef<SceneJourney | null>(null);
  const readyRef = useRef(false);
  const notifiedSession = useRef<string | null>(null);
  const shownProgress = useRef(SCENE_BACKDROP_PROGRESS);

  const setJourney = useCallback((next: SceneJourney | null) => {
    journeyRef.current = next;
    setJourneyState(next);
    if (next) {
      setRetained((previous) =>
        previous.products === next.products && previous.wallTitles === next.wallTitles
          ? previous
          : { products: next.products, wallTitles: next.wallTitles },
      );
    }
  }, []);
  const [api] = useState<SceneHostApi>(() => ({ setJourney }));

  useEffect(() => {
    const detected = detectExperienceCapabilities();
    setCapabilities({ usable: detected.available && !detected.software, tier: detected.tier });
    setOwnTier(detected.tier);
  }, []);

  const tone: SceneTone = journey ? "journey" : sceneToneForPath(pathname);

  // A content page asks for the renderer once the page itself has loaded and
  // the main thread is idle. The home route never does: its journey decides.
  // Phones and constrained hardware wait for the visitor's first gesture
  // (see backdropLoadPolicy).
  useEffect(() => {
    if (
      backdropRequested ||
      journey ||
      pathname === "/" ||
      tone !== "page" ||
      !capabilities?.usable ||
      reducedMotion ||
      failed
    ) {
      return;
    }
    const request = () => setBackdropRequested(true);
    const policy = backdropLoadPolicy({
      tier: capabilities.tier,
      mobile: window.matchMedia(MOBILE_QUERY).matches,
    });
    if (policy === "after-load") return scheduleAfterLoad(request);

    let cancelScheduled: (() => void) | null = null;
    const stopListening = () => {
      for (const type of FIRST_GESTURE_EVENTS) window.removeEventListener(type, onGesture);
    };
    function onGesture() {
      stopListening();
      cancelScheduled ??= scheduleAfterLoad(request);
    }
    for (const type of FIRST_GESTURE_EVENTS) {
      window.addEventListener(type, onGesture, { passive: true });
    }
    return () => {
      stopListening();
      cancelScheduled?.();
    };
  }, [backdropRequested, capabilities, failed, journey, pathname, reducedMotion, tone]);

  // Once created, the renderer is kept for the rest of the visit.
  useEffect(() => {
    if (canvasRequested || failed) return;
    if (journey?.requested || backdropRequested) setCanvasRequested(true);
  }, [backdropRequested, canvasRequested, failed, journey?.requested]);

  // A journey that mounts after the scene is already live (client navigation
  // or history return) is told immediately, once per journey session.
  useEffect(() => {
    if (!journey || !ready || notifiedSession.current === journey.session) return;
    notifiedSession.current = journey.session;
    journey.onReady();
  }, [journey, ready]);

  // A renderer that already failed in this visit is not retried; a journey
  // that arrives afterwards switches to its linear document at once instead
  // of waiting out the opening card's GPU timeout.
  useEffect(() => {
    if (journey && failed) journey.onContextLost();
  }, [failed, journey]);

  const handleReady = useCallback(() => {
    readyRef.current = true;
    setReady(true);
    const current = journeyRef.current;
    if (current && notifiedSession.current !== current.session) {
      notifiedSession.current = current.session;
      current.onReady();
    }
  }, []);

  const handleFailure = useCallback(() => {
    setFailed(true);
    journeyRef.current?.onContextLost();
  }, []);

  const handleTierChange = useCallback((nextTier: QualityTier) => {
    setOwnTier((current) => (TIER_RANK[nextTier] >= TIER_RANK[current] ? nextTier : current));
    journeyRef.current?.onTierChange(nextTier);
  }, []);

  // Camera travel between the journey and the backdrop pose. While a journey
  // is visible the scene follows its scroll; on any change of owner it eases
  // from wherever it was shown, so a page change never cuts the world.
  const journeyVisible = Boolean(journey?.visible);
  const target = journeyVisible && journey ? journey.progress : SCENE_BACKDROP_PROGRESS;
  const owner = journeyVisible ? "journey" : "backdrop";
  const lastOwner = useRef(owner);

  useLayoutEffect(() => {
    if (lastOwner.current === owner) return;
    lastOwner.current = owner;
    if (!readyRef.current || reducedMotion) {
      setTween(null);
      return;
    }
    const startedAt = performance.now();
    setNow(startedAt);
    setTween({ from: shownProgress.current, startedAt });
  }, [owner, reducedMotion]);

  useEffect(() => {
    if (!tween) return;
    let frame = 0;
    const tick = (time: number) => {
      setNow(time);
      if (time - tween.startedAt >= SCENE_TRANSITION_MS) {
        setTween(null);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tween]);

  const progress = tween
    ? interpolateSceneProgress(tween.from, target, Math.max(0, now - tween.startedAt))
    : target;
  useLayoutEffect(() => {
    shownProgress.current = progress;
  }, [progress]);

  // The linear (2D) journey and reduced motion release the renderer and its
  // GPU memory entirely; the next scene request builds a fresh one.
  const hidden = reducedMotion || (journey !== null && !journey.visible);
  const rendered = canvasRequested && !failed && !hidden && theme.ready;
  const live = rendered && ready;

  useEffect(() => {
    if (rendered) return;
    readyRef.current = false;
    notifiedSession.current = null;
    setReady(false);
  }, [rendered]);

  // Page surfaces drop their own opaque ground only while the scene is
  // actually painted behind them (globals.css `html[data-scene="live"]`).
  useEffect(() => {
    const root = document.documentElement;
    if (live) root.dataset.scene = "live";
    else delete root.dataset.scene;
  }, [live]);
  useEffect(() => () => {
    delete document.documentElement.dataset.scene;
  }, []);

  const mode: ExperienceMode = journey?.mode ?? (mobile ? "mobile" : "desktop");
  const tier = journey?.tier ?? ownTier;

  return (
    <SceneHostContext.Provider value={api}>
      {rendered ? (
        <div
          className="scene-host"
          data-scene-host="true"
          data-scene-tone={tone}
          data-scene-ready={ready ? "true" : "false"}
          data-scene-progress={progress.toFixed(3)}
          aria-hidden="true"
        >
          <div className="scene-host-canvas">
            <ExperienceErrorBoundary fallback={null} onError={handleFailure}>
              <ExperienceCanvas
                ambient={tone === "journey" && !hidden}
                displayTheme={theme.resolved}
                glyphRotation={journeyVisible && journey ? journey.glyphRotation : NO_ROTATION}
                products={journey?.products ?? retained.products}
                wallTitles={journey?.wallTitles ?? retained.wallTitles}
                progress={progress}
                mode={mode}
                tier={tier}
                onTierChange={handleTierChange}
                onReady={handleReady}
                onContextLost={handleFailure}
              />
            </ExperienceErrorBoundary>
          </div>
          <div className="scene-host-veil" />
        </div>
      ) : null}
      {children}
    </SceneHostContext.Provider>
  );
}
