"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createAmbientAudio, type AmbientAudioController } from "./audio";
import { ExperienceErrorBoundary } from "./ExperienceErrorBoundary";
import { ExperienceLoader } from "./ExperienceLoader";
import { ExperienceOverlay } from "./ExperienceOverlay";
import { detectInitialTier, supportsWebGL } from "./quality";
import { StaticExperience } from "./StaticExperience";
import { evaluateTimeline } from "./timeline";
import type {
  ExperienceCopy,
  ExperienceMode,
  ExperienceProduct,
  QualityTier,
} from "./types";
import { useExperienceProgress } from "./useExperienceProgress";
import styles from "./Experience.module.css";

type ExperienceCanvasProps = {
  products: ExperienceProduct[];
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

const LOADER_SESSION_KEY = "yula-experience-loader-v1";
const LOADER_DURATION_MS = 4_000;
const TIER_ORDER: Record<QualityTier, number> = { high: 0, medium: 1, low: 2 };

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

export function YulaExperience({ products, copy }: YulaExperienceProps) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 767px)");
  const compactViewport = useMediaQuery("(max-height: 600px)");
  const { progress, capture } = useExperienceProgress(reducedMotion);
  const [webgl, setWebgl] = useState<WebGLState>("checking");
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [tier, setTier] = useState<QualityTier>("low");
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [forceStatic, setForceStatic] = useState(false);
  const audio = useRef<AmbientAudioController | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const available = supportsWebGL();
    setWebgl(available ? "available" : "unavailable");
    setTier(capture.tier ?? detectInitialTier());
  }, [capture.tier]);

  useEffect(() => {
    return () => {
      const controller = audio.current;
      audio.current = null;
      if (controller) void controller.dispose();
    };
  }, []);

  useEffect(() => {
    if (
      !mounted ||
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

    if (capture.enabled) {
      setLoaderVisible(capture.loader);
      setLoaderProgress(capture.loader ? capture.loaderProgress : 1);
      return;
    }

    try {
      if (window.sessionStorage.getItem(LOADER_SESSION_KEY) === "1") {
        setLoaderVisible(false);
        setLoaderProgress(1);
        return;
      }
    } catch {
      // Storage denial only means this visit may see the loader again.
    }

    let animationFrame = 0;
    const startedAt = performance.now();
    setLoaderVisible(true);
    setLoaderProgress(0);

    const tick = (now: number) => {
      const next = Math.min(1, Math.max(0, (now - startedAt) / LOADER_DURATION_MS));
      setLoaderProgress(next);
      if (next < 1) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      try {
        window.sessionStorage.setItem(LOADER_SESSION_KEY, "1");
      } catch {
        // The loader remains non-blocking when storage is unavailable.
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
      data-experience-ready={experienceReady ? "true" : "false"}
      data-stage={frame.stage}
      data-active-product={activeProduct?.slug ?? "none"}
      data-white-mix={frame.world.whiteMix.toFixed(3)}
      data-tier={tier}
      data-loader-visible={loaderVisible ? "true" : "false"}
      data-experience-fallback={fallbackActive ? "true" : undefined}
      suppressHydrationWarning
    >
      {useStatic ? (
        <StaticExperience
          copy={copy}
          products={products}
          soundEnabled={soundEnabled}
          onSoundToggle={() => void toggleSound()}
        />
      ) : (
        <>
          <span id="experience-hero" className={styles.scrollAnchor} style={{ top: 0 }} />
          <span id="experience-portfolio" className={styles.scrollAnchor} style={{ top: "8.5%" }} />
          <span id="experience-proof" className={styles.scrollAnchor} style={{ top: "50.5%" }} />
          <span id="experience-manifesto" className={styles.scrollAnchor} style={{ top: "69%" }} />

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
          </div>

          {loaderVisible ? (
            <ExperienceLoader lines={copy.loader} progress={loaderProgress} />
          ) : null}
        </>
      )}
    </div>
  );
}

export default YulaExperience;
