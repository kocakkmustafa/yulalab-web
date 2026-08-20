"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useProgress } from "@react-three/drei";
import { canRunScene } from "@/lib/three/capability";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/**
 * Loader overlay — the reel's "breathing orb" opening. Driven by the real
 * asset progress (useProgress), not a fake timer, and skipped entirely on
 * the static branch.
 */
function LoaderOverlay({ textReady }: { textReady: boolean }) {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);

  // Two independent readiness signals, both required:
  // - useProgress `active` covers THREE's loading manager;
  // - `textReady` covers troika, which typesets OFF the manager (measured:
  //   the SDF pass takes multiple seconds on the main thread, and the
  //   first cut dismissed the loader onto seconds of black scene).
  useEffect(() => {
    if (active || !textReady) return;
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [active, textReady]);

  if (gone) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        background: "#050506",
        opacity: active || !textReady ? 1 : 0,
        transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 44% 40%, rgba(244,244,245,0.95) 0%, rgba(170,150,255,0.7) 26%, rgba(90,110,235,0.5) 48%, rgba(0,0,0,0) 74%)",
          filter: "blur(1px)",
          animation: "yl-breathe 2.2s ease-in-out infinite",
        }}
      />
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
        {active ? `%${Math.round(progress)} — ` : ""}sahne yükleniyor
      </div>
      <style>{`@keyframes yl-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }`}</style>
    </div>
  );
}

/**
 * Capability-gated mount. `ready === null` means "still deciding on the
 * client" — during SSR and that first client tick we render the static
 * backdrop, so no-JS, reduced-motion and weak devices all get the same
 * complete, non-animated version (the branch the a11y suite tests).
 */
export default function Hero3D() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [textReady, setTextReady] = useState(false);

  useEffect(() => {
    setReady(canRunScene());
  }, []);

  if (!ready) {
    return (
      <div aria-hidden className="absolute inset-0 bg-ink-900">
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(to right, rgba(255,255,255,0.045) 0 1px, transparent 1px 96px), repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0 1px, transparent 1px 96px)",
            maskImage: "radial-gradient(75% 70% at 50% 46%, #000 38%, transparent 84%)",
            WebkitMaskImage: "radial-gradient(75% 70% at 50% 46%, #000 38%, transparent 84%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="select-none font-grotesk text-[19vw] font-bold leading-none tracking-tightest text-ink-50">
            YULA
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <HeroScene onTextReady={() => setTextReady(true)} />
      <LoaderOverlay textReady={textReady} />
    </div>
  );
}
