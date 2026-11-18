"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { DURATION, EASE_UI } from "@/lib/motion";

/**
 * Route change as a plain fade (W1 BK3, reference parity). The LEAVING page
 * fades out over ~1.0s here and the entering page fades in over ~1.1s through
 * the `.page-enter` CSS keyframe on each page root. The exit begins on the click
 * of an internal link (first paint after input), not when the route resolves.
 * Reduced motion: no exit, no entry animation.
 * After a client navigation focus moves to <main> (tabIndex -1) so keyboard and
 * screen-reader users start at the new page, not on the link they activated.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const lastPath = useRef(pathname);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setLeaving(false);
  }, [pathname]);

  useEffect(() => {
    if (reduceMotion) return;
    let reset: number | undefined;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page or #hash jump
      setLeaving(true);
      window.clearTimeout(reset);
      // a navigation that never lands must not leave the page faded out
      reset = window.setTimeout(() => setLeaving(false), 5000);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(reset);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (window.location.hash) return; // a #hash target decides focus and scroll
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: DURATION.pageExit, ease: EASE_UI }}
        exit={
          reduceMotion
            ? { opacity: 1, transition: { duration: 0 } }
            : {
                opacity: 0,
                // Opacity only: no `y`/`filter`. A leftover non-none filter or
                // transform would make this wrapper the containing block of
                // `position: fixed` descendants (journey stage), breaking the
                // restored scroll on Back/Forward during a running exit.
                transition: { duration: DURATION.pageExit, ease: EASE_UI },
              }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
