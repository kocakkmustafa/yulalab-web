import Lenis from "lenis";

/** Referans olcumu: tek tekerlek 300 px ~ 1 sn atalet (lerp ~0.1). */
export const SITE_SMOOTH_LERP = 0.1;

const EXPERIENCE = '[data-yula-experience="true"]';

/**
 * Smooth wheel scrolling only where it is welcome: no reduced-motion request,
 * a fine hover pointer (touch keeps the platform's native momentum), and not on
 * the immersive home journey, which runs its own Lenis (useSmoothScroll).
 */
export function smoothScrollAllowed(win: Window): boolean {
  const mq = (query: string) => Boolean(win.matchMedia?.(query).matches);
  if (mq("(prefers-reduced-motion: reduce)")) return false;
  if (!mq("(hover: hover) and (pointer: fine)")) return false;
  if (win.document.querySelector(EXPERIENCE)) return false;
  return true;
}

/**
 * Keeps at most one site-level Lenis alive and yields to the experience when
 * its root appears. `anchors` stays off: #hash links and the skip link use the
 * browser's own jump, which honours scroll-margin, focus and the fixed header.
 */
export function startSiteSmoothScroll(win: Window = window): () => void {
  let lenis: Lenis | null = null;

  const sync = () => {
    const allowed = smoothScrollAllowed(win);
    if (allowed && !lenis) {
      lenis = new Lenis({ lerp: SITE_SMOOTH_LERP, smoothWheel: true, anchors: false, autoRaf: true });
    } else if (!allowed && lenis) {
      lenis.destroy();
      lenis = null;
    }
  };

  sync();
  let frame = 0;
  const mo = new MutationObserver(() => {
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      sync();
    });
  });
  mo.observe(win.document.body, { childList: true, subtree: true });
  const queries = ["(prefers-reduced-motion: reduce)", "(hover: hover) and (pointer: fine)"].map((q) => win.matchMedia?.(q));
  for (const q of queries) q?.addEventListener?.("change", sync);

  return () => {
    mo.disconnect();
    if (frame) win.cancelAnimationFrame(frame);
    for (const q of queries) q?.removeEventListener?.("change", sync);
    lenis?.destroy();
    lenis = null;
  };
}
