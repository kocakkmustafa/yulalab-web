"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { DURATION, EASE_UI } from "@/lib/motion";

/**
 * Route change as a plain fade (W1 BK3). The LEAVING page fades out over 0.45s
 * here; the entering page fades in over 0.55s through the `.page-enter` CSS
 * keyframe on each page root. Reduced motion: no exit, no entry animation.
 * After a client navigation focus moves to <main> (tabIndex -1) so keyboard and
 * screen-reader users start at the new page, not on the link they activated.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const lastPath = useRef(pathname);

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
