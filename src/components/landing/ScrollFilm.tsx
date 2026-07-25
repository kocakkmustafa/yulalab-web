"use client";

import { useEffect, useRef, useState } from "react";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * The emblem film, played by the scroll wheel.
 *
 * The clip is already the page's narrative — it opens on empty black, the
 * filaments rain in and gather, and the emblem ignites on the last frame —
 * so scroll position maps straight onto `currentTime`. Scrolling the page
 * *is* scrubbing the film.
 *
 * Two things make this cheap enough to do on every frame:
 *
 *  1. The file is encoded with every frame as a keyframe (`-g 1`). A normal
 *     inter-frame encode would force the decoder to walk from the previous
 *     keyframe on each seek, which is precisely what makes scrubbed video
 *     stutter.
 *  2. Seeks are coalesced into one rAF and skipped when the delta is below
 *     a frame, so a fast flick doesn't queue dozens of decodes.
 *
 * When the film is running, `data-film="on"` goes on <html> so the closing
 * scene can drop its static emblem — the background is already showing it.
 */
export function ScrollFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  // React renders the opacity, so React has to own it — an imperative
  // write here is undone by the next render.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    const frugal = net?.saveData === true || /^(slow-)?2g$/.test(net?.effectiveType ?? "");
    // A scrubbed background is decoration. On a metered connection, a slow
    // link, or for someone who asked for less motion, it simply doesn't run
    // and the ambient gradient carries the page.
    if (reduced || frugal) return;

    const root = document.documentElement;
    let raf = 0;
    let target = 0;
    let ready = false;
    const FRAME = 1 / 12; // the clip is encoded at 12fps

    const apply = () => {
      raf = 0;
      if (!ready || !v.duration) return;
      const t = target * v.duration;
      // below one frame of difference there is nothing new to show
      if (Math.abs(v.currentTime - t) < FRAME) return;
      v.currentTime = t;
    };

    const onScroll = () => {
      const max = (document.documentElement.scrollHeight || 1) - window.innerHeight;
      target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onReady = () => {
      ready = true;
      root.dataset.film = "on";
      setVisible(true);
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Already decoded? Then `loadeddata` has been and gone and will not fire
    // again — StrictMode's double-invoke and any remount land here.
    if (v.readyState >= 2) {
      onReady();
    } else {
      v.addEventListener("loadeddata", onReady, { once: true });
      v.load();
    }

    return () => {
      v.removeEventListener("loadeddata", onReady);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.film;
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
      <video
        ref={ref}
        className="w-full h-full object-cover transition-opacity duration-700 ease-soft"
        // transparent until a frame is decoded, so the page never flashes
        // an empty video box
        style={{ opacity: visible ? 1 : 0 }}
        preload="auto"
        muted
        playsInline
      >
        <source src="/media/yula-emblem.mp4" type="video/mp4" />
      </video>
      {/* Scrim. The clip peaks bright and dense in its middle third, which
          is exactly where the manifesto copy sits. This holds text contrast
          without flattening the filaments into grey. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,11,0.62) 0%, rgba(10,10,11,0.74) 42%, rgba(10,10,11,0.58) 100%)",
        }}
      />
    </div>
  );
}
