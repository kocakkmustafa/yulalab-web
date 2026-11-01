"use client";

import Lenis from "lenis";
import { useEffect } from "react";

// Wheel inertia for the immersive journey only. Lenis drives the native
// window scroll, so useExperienceProgress keeps reading window.scrollY and
// the instant restorations/anchor jumps elsewhere still land on real pixels.
// Touch input keeps the platform's own momentum (syncTouch stays off), and
// the caller disables this for reduced motion, capture and the static view.
export const SMOOTH_SCROLL_LERP = 0.09;

export function useSmoothScroll(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      lerp: SMOOTH_SCROLL_LERP,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      anchors: true,
      autoRaf: true,
    });

    return () => lenis.destroy();
  }, [enabled]);
}
