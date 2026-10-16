"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createAmbientAudio, type AmbientAudioController } from "./audio";
import { ExperienceErrorBoundary } from "./ExperienceErrorBoundary";
import { ExperienceLoader } from "./ExperienceLoader";
import { resolveVisibleFrameDelta } from "./loader";
import { ExperienceOverlay } from "./ExperienceOverlay";
import { detectExperienceCapabilities } from "./quality";
import { StaticExperience } from "./StaticExperience";
import { evaluateTimeline, STAGES } from "./timeline";
import type {
  ExperienceCopy,
  ExperienceMode,
  ExperienceProduct,
  QualityTier,
  Vec3,
} from "./types";
import { useExperienceProgress } from "./useExperienceProgress";
import styles from "./Experience.module.css";

type ExperienceCanvasProps = {
  products: ExperienceProduct[];
  glyphRotation?: Vec3;
  progress: number;
  mode: ExperienceMode;
  tier: QualityTier;
  onTierChange: (tier: QualityTier) => void;
  onReady: () => void;
  onContextLost: () => void;
};

const ExperienceCanvas = dynamic<ExperienceCanvasProps>(
  () =>
    import("./ExperienceCanvas").then(
      (module) => module.ExperienceCanvas as ComponentType<ExperienceCanvasProps>,
    ),
  { ssr: false, loading: () => null },
);

type YulaExperienceProps = {
  products: ExperienceProduct[];
  copy: ExperienceCopy;
};

type WebGLState = "checking" | "available" | "unavailable";

const LOADER_DRAW_DURATION_MS = 3_600;
const LOADER_EXIT_DURATION_MS = 900;
const LOADER_CANVAS_TIMEOUT_MS = LOADER_DRAW_DURATION_MS + 6_000;
const LOADER_HOLD_PROGRESS = 0.9;
const TIER_ORDER: Record<QualityTier, number> = { high: 0, medium: 1, low: 2 };

// Store only this journey's UI position on its own browser-history entry.
// Next's routing fields are preserved; fresh entries/reloads retain the opening.
const JOURNEY_HISTORY_KEY = "__yulaJourneyV1";
type JourneyHistory = { pathname: string; scrollY: number; documentStartedAt: number; entryId: string };
// Client-only UI snapshots; never populated during server rendering.
const latestJourneyPositions = new Map<string, number>();
let journeyEntrySequence = 0;

function readJourneyReturn(): JourneyHistory | null {
  const saved = window.history.state?.[JOURNEY_HISTORY_KEY] as JourneyHistory | undefined;
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!saved || saved.pathname !== window.location.pathname ||
      !Number.isFinite(saved.scrollY) || saved.scrollY < 0) return null;
  return saved.documentStartedAt === performance.timeOrigin || navigation?.type === "back_forward"
    ? { ...saved, scrollY: latestJourneyPositions.get(saved.entryId) ?? saved.scrollY }
    : null;
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

function GlyphControl({ locale, rotation, onChange }: {
  locale: "tr" | "en";
  rotation: Vec3;
  onChange: (rotation: Vec3) => void;
}) {
  const drag = useRef<{ x: number; y: number; rotation: Vec3 } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
  const label = locale === "tr" ? "Amblemi döndür" : "Rotate the emblem";
  const help = locale === "tr"
    ? "Sürükleyin veya ok tuşlarını kullanın. Home veya Escape ile sıfırlayın."
    : "Drag or use the arrow keys. Press Home or Escape to reset.";
  const stop = () => { drag.current = null; setDragging(false); };

  return (
    <button
      type="button"
      className={styles.glyphControl}
      data-yula-glyph-control="true"
      data-glyph-pitch={rotation[0].toFixed(3)}
      data-glyph-yaw={rotation[1].toFixed(3)}
      data-dragging={dragging ? "true" : "false"}
      aria-label={label}
      aria-describedby="yula-glyph-help"
      title={help}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        moved.current = false;
        drag.current = { x: event.clientX, y: event.clientY, rotation };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        // Vertical touch gestures belong to document scrolling, even when
        // they start over the emblem. Horizontal gestures can turn the Y.
        if (event.pointerType === "touch" && Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (event.pointerType === "touch" && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
          event.currentTarget.releasePointerCapture(event.pointerId);
          stop();
          return;
        }
        if (Math.abs(dx) + Math.abs(dy) < 3) return;
        moved.current = true;
        onChange([clamp(start.rotation[0] + dy * 0.004, 0.35), clamp(start.rotation[1] + dx * 0.005, 0.65), 0]);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onClick={(event) => {
        if (event.detail === 0 || !moved.current) onChange([rotation[0], clamp(rotation[1] + 0.12, 0.65), 0]);
      }}
      onKeyDown={(event) => {
        const steps: Record<string, Vec3> = {
          ArrowLeft: [0, -0.12, 0], ArrowRight: [0, 0.12, 0],
          ArrowUp: [-0.08, 0, 0], ArrowDown: [0.08, 0, 0],
        };
        if (event.key === "Home" || event.key === "Escape") {
          event.preventDefault();
          moved.current = false;
          onChange([0, 0, 0]);
        } else if (steps[event.key]) {
          event.preventDefault();
          const step = steps[event.key];
          onChange([clamp(rotation[0] + step[0], 0.35), clamp(rotation[1] + step[1], 0.65), 0]);
        }
      }}
    >
      <span className={styles.glyphHint}>{label}</span>
      <span id="yula-glyph-help" className={styles.srOnly}>{help}</span>
    </button>
  );
}

export function YulaExperience({ products, copy }: YulaExperienceProps) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 767px)");
  const compactViewport = useMediaQuery("(max-width: 767px) and (max-height: 600px)");
  const [webgl, setWebgl] = useState<WebGLState>("checking");
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [tier, setTier] = useState<QualityTier>("low");
  // The opening card is part of the server response so the first paint and
  // hydrated experience begin on the same visual frame.
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [glyphRotation, setGlyphRotation] = useState<Vec3>([0, 0, 0]);
  const [forceStatic, setForceStatic] = useState(false);
  const audio = useRef<AmbientAudioController | null>(null);
  const canvasReadyRef = useRef(false);
  const journeyReturn = useRef<JourneyHistory | null>(null);
  const returnRestored = useRef(false);
  const timelineEnabled =
    mounted &&
    !forceStatic &&
    !reducedMotion &&
    !compactViewport &&
    webgl === "available" &&
    !canvasFailed;
  const { progress, capture, scrollRange } = useExperienceProgress(timelineEnabled, journeyReturn.current !== null);
  // Native anchors use document pixels; the timeline uses the scrollable range.
  // Land at the first card's center, after both entry fades have completed.
  const firstProductCenter = STAGES.portfolio[0] +
    (STAGES.portfolio[1] - STAGES.portfolio[0]) / (2 * Math.max(1, products.length));

  // Start with the first proof card fully exposed, rather than skipping
  // cards by measuring a percentage of the taller journey element.
  const proofCount = Math.max(1, products.filter((product) => product.claims.length > 0).length);
  const firstProofCenter = STAGES.proof[0] +
    (STAGES.proof[1] - STAGES.proof[0]) / (2 * proofCount);
  const missionCenter = (STAGES.mission[0] + STAGES.mission[1]) / 2;

  useLayoutEffect(() => {
    journeyReturn.current = capture.enabled ? null : readJourneyReturn();
    if (journeyReturn.current) {
      setLoaderVisible(false);
      setLoaderProgress(1);
    }
    setMounted(true);
  }, [capture.enabled]);

  useEffect(() => {
    canvasReadyRef.current = canvasReady;
  }, [canvasReady]);

  useEffect(() => {
    const capabilities = detectExperienceCapabilities();
    const allowSoftwareCapture = capture.enabled && capabilities.available;
    setWebgl(
      capabilities.available && (!capabilities.software || allowSoftwareCapture)
        ? "available"
        : "unavailable",
    );
    setTier(capture.tier ?? capabilities.tier);
  }, [capture.enabled, capture.tier]);

  useEffect(() => {
    return () => {
      const controller = audio.current;
      audio.current = null;
      if (controller) void controller.dispose();
    };
  }, []);

  useEffect(() => {
    if (!mounted || capture.enabled || !loaderVisible || journeyReturn.current) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousOverscroll = root.style.overscrollBehavior;
    const previousRestoration = window.history.scrollRestoration;
    const resetOpeningScroll = () => window.scrollTo(0, 0);

    window.history.scrollRestoration = "manual";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    resetOpeningScroll();
    window.addEventListener("pageshow", resetOpeningScroll);

    return () => {
      window.removeEventListener("pageshow", resetOpeningScroll);
      root.style.overflow = previousOverflow;
      root.style.overscrollBehavior = previousOverscroll;
      window.history.scrollRestoration = previousRestoration;
    };
  }, [capture.enabled, loaderVisible, mounted]);

  useEffect(() => {
    if (!mounted) return;

    if (
      reducedMotion ||
      compactViewport ||
      forceStatic ||
      webgl !== "available" ||
      canvasFailed
    ) {
      setLoaderVisible(false);
      setLoaderProgress(1);
      return;
    }

    if (!capture.enabled && journeyReturn.current) {
      setLoaderVisible(false);
      setLoaderProgress(1);
      return;
    }

    if (capture.enabled) {
      setLoaderVisible(capture.loader);
      setLoaderProgress(capture.loader ? capture.loaderProgress : 1);
      return;
    }

    let animationFrame = 0;
    let previousTimestamp: number | null = null;
    let visibleElapsed = 0;
    let exitStartedAt: number | null = null;
    setLoaderVisible(true);
    setLoaderProgress(0);

    const tick = (now: number) => {
      visibleElapsed += resolveVisibleFrameDelta(
        now,
        previousTimestamp,
        document.visibilityState,
      );
      previousTimestamp = now;
      const elapsed = visibleElapsed;
      const drawProgress = Math.min(
        1,
        elapsed / LOADER_DRAW_DURATION_MS,
      );
      let next = drawProgress * LOADER_HOLD_PROGRESS;

      if (
        drawProgress >= 1 &&
        !canvasReadyRef.current &&
        elapsed >= LOADER_CANVAS_TIMEOUT_MS
      ) {
        // A broken or exceptionally slow GPU must never turn the opening into
        // an interaction gate. Fall back to the complete linear document.
        setLoaderProgress(1);
        setLoaderVisible(false);
        setCanvasFailed(true);
        return;
      }

      if (drawProgress >= 1 && canvasReadyRef.current) {
        exitStartedAt ??= elapsed;
        const exitProgress = Math.min(
          1,
          Math.max(0, (elapsed - exitStartedAt) / LOADER_EXIT_DURATION_MS),
        );
        next = LOADER_HOLD_PROGRESS + exitProgress * (1 - LOADER_HOLD_PROGRESS);
      }

      setLoaderProgress(next);
      if (next < 1) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      setLoaderVisible(false);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [
    canvasFailed,
    compactViewport,
    capture.enabled,
    capture.loader,
    capture.loaderProgress,
    forceStatic,
    mounted,
    reducedMotion,
    webgl,
  ]);

  useLayoutEffect(() => {
    if (!timelineEnabled || !journeyReturn.current || returnRestored.current) return;
    returnRestored.current = true;
    // The immersive document must have its final height before restoration.
    const savedY = journeyReturn.current.scrollY;
    window.scrollTo({ top: savedY, behavior: "instant" });
    const frame = requestAnimationFrame(() => window.scrollTo({ top: savedY, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, [timelineEnabled]);

  useEffect(() => {
    if (!timelineEnabled || capture.enabled || loaderVisible) return;
    const pathname = window.location.pathname;
    let pending = 0;
    let activeEntryId: string | null = null;
    const remember = (persist = true) => {
      if (window.location.pathname !== pathname) return;
      const previous = window.history.state?.[JOURNEY_HISTORY_KEY] as JourneyHistory | undefined;
      const hasEntry = previous?.pathname === pathname && typeof previous.entryId === "string";
      const entryId = hasEntry ? previous.entryId : `${performance.timeOrigin}:${++journeyEntrySequence}`;
      const saved: JourneyHistory = {
        pathname,
        scrollY: window.scrollY,
        documentStartedAt: performance.timeOrigin,
        entryId,
      };
      activeEntryId = entryId;
      latestJourneyPositions.set(entryId, saved.scrollY);
      if (latestJourneyPositions.size > 64) {
        latestJourneyPositions.delete(latestJourneyPositions.keys().next().value!);
      }
      if (persist || !hasEntry) {
        window.history.replaceState({ ...window.history.state, [JOURNEY_HISTORY_KEY]: saved }, "");
      }
    };
    const onScroll = () => {
      remember(false);
      clearTimeout(pending);
      pending = window.setTimeout(() => remember(), 120);
    };
    const onLeave = () => remember();
    const onBeforeNavigate = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType !== "traverse" ||
          window.location.pathname !== pathname) return;
      // The Navigation API fires before traversal changes persisted scroll.
      // popstate can be too late to read the outgoing document position.
      // Snapshot only; never mutate or intercept the browser's navigation.
      if (activeEntryId) latestJourneyPositions.set(activeEntryId, window.scrollY);
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    remember();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Capture before a Link pushes the destination's history entry.
    document.addEventListener("click", onLeave, true);
    window.addEventListener("pagehide", onLeave);
    navigation?.addEventListener("navigate", onBeforeNavigate);
    return () => {
      clearTimeout(pending);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onLeave, true);
      window.removeEventListener("pagehide", onLeave);
      navigation?.removeEventListener("navigate", onBeforeNavigate);
    };
  }, [capture.enabled, loaderVisible, timelineEnabled]);

  const toggleSound = useCallback(async () => {
    const controller = audio.current ?? createAmbientAudio();
    audio.current = controller;

    if (controller.isEnabled()) {
      await controller.setEnabled(false);
    } else {
      // enable() is deliberately invoked from this gesture handler; it is
      // the only operation allowed to construct an AudioContext.
      await controller.enable();
    }
    setSoundEnabled(controller.isEnabled());
  }, []);

  const handleTierChange = useCallback(
    (nextTier: QualityTier) => {
      if (capture.enabled && capture.tier) return;
      setTier((currentTier) =>
        TIER_ORDER[nextTier] >= TIER_ORDER[currentTier] ? nextTier : currentTier,
      );
    },
    [capture.enabled, capture.tier],
  );

  // Keep the server and first hydration frame identical. Capture parameters
  // take effect immediately after mount, avoiding a mismatched active panel.
  const renderedProgress = mounted ? progress : 0;
  const mode: ExperienceMode = mobile ? "mobile" : "desktop";
  const frame = useMemo(
    () => evaluateTimeline(renderedProgress, mode),
    [mode, renderedProgress],
  );
  const activeProduct = products[frame.productIndex] ?? products[0];
  // Server markup is the complete linear document. Hydration may promote it
  // to WebGL, but no-JS users and the first accessibility tree keep every
  // product, proof item and trust link discoverable.
  const useStatic =
    !mounted ||
    forceStatic ||
    reducedMotion ||
    compactViewport ||
    webgl === "unavailable" ||
    canvasFailed;
  const fallbackActive = !reducedMotion && (webgl === "unavailable" || canvasFailed);
  const experienceReady =
    mounted && (useStatic || canvasReady || (capture.enabled && capture.loader));

  return (
    <div
      className={`${styles.journey} ${useStatic ? styles.staticJourney : ""}`}
      data-yula-experience="true"
      data-experience-mounted={mounted ? "true" : "false"}
      data-experience-ready={experienceReady ? "true" : "false"}
      data-stage={frame.stage}
      data-active-product={activeProduct?.slug ?? "none"}
      data-white-mix={frame.world.whiteMix.toFixed(3)}
      data-tier={tier}
      data-loader-visible={loaderVisible ? "true" : "false"}
      data-experience-fallback={fallbackActive ? "true" : undefined}
      suppressHydrationWarning
    >
      <noscript>
        <style>{
          `[data-yula-loader="true"]{display:none!important}` +
          `[data-yula-static="true"]{display:block!important}` +
          `[data-sound-control="true"]{display:none!important}`
        }</style>
      </noscript>
      {useStatic ? (
        <div
          data-yula-static="true"
          aria-hidden={mounted && loaderVisible ? "true" : undefined}
          inert={mounted && loaderVisible}
          style={loaderVisible ? { display: "none" } : undefined}
        >
          <StaticExperience
            copy={copy}
            products={products}
            soundEnabled={soundEnabled}
            onSoundToggle={() => void toggleSound()}
          />
        </div>
      ) : (
        <>
          <span id="experience-hero" className={styles.scrollAnchor} style={{ top: 0 }} />
          <span id="experience-portfolio" className={styles.scrollAnchor} style={{ top: capture.enabled ? "8.5%" : scrollRange * firstProductCenter }} />
          <span id="experience-proof" className={styles.scrollAnchor} style={{ top: scrollRange * firstProofCenter }} />
          <span id="experience-manifesto" className={styles.scrollAnchor} style={{ top: scrollRange * missionCenter }} />

          <div
            className={styles.viewport}
            aria-hidden={loaderVisible || undefined}
            inert={loaderVisible}
          >
            {webgl === "available" ? (
              <div className={styles.canvasLayer} aria-hidden="true">
                <ExperienceErrorBoundary
                  fallback={null}
                  onError={() => setCanvasFailed(true)}
                >
                  <ExperienceCanvas
                    glyphRotation={glyphRotation}
                    products={products}
                    progress={renderedProgress}
                    mode={mode}
                    tier={tier}
                    onTierChange={handleTierChange}
                    onReady={() => setCanvasReady(true)}
                    onContextLost={() => setCanvasFailed(true)}
                  />
                </ExperienceErrorBoundary>
              </div>
            ) : null}

            <ExperienceOverlay
              copy={copy}
              products={products}
              frame={frame}
              tier={tier}
              soundEnabled={soundEnabled}
              onSoundToggle={() => void toggleSound()}
              onLinearView={() => setForceStatic(true)}
            />
            {frame.stage === "hero" && frame.overlay.hero > 0.6 ? (
              <GlyphControl locale={copy.locale} rotation={glyphRotation} onChange={setGlyphRotation} />
            ) : null}
          </div>

        </>
      )}
      {loaderVisible ? (
        <ExperienceLoader lines={copy.loader} progress={loaderProgress} />
      ) : null}
    </div>
  );
}

export default YulaExperience;
