"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { DURATION, EASE_IN } from "@/lib/motion";

/**
 * Route-level scene change. Entry is handled by the `.page-enter` CSS keyframe
 * on each page's root element (it resolves out of blur); this adds what CSS
 * can't: the LEAVING page fades away, and a thin ruler line sweeps a
 * glass veil across the viewport between the two. The veil only plays after a
 * client navigation, so the first server render and the no-JS document never
 * include it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const lastPath = useRef(pathname);
  // Each path change bumps the counter, which keys (and so restarts) the veil.
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    // Marks the document as client-navigated: CSS plays the title wipe only
    // then, never on a first paint (it would hold back the LCP).
    document.documentElement.dataset.clientNav = "true";
    setSweep((count) => count + 1);
  }, [pathname]);

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          exit={
            reduceMotion
              ? { opacity: 1 }
              : {
                  opacity: 0,
                  // Opacity only: no `y`/`filter` here. When Back/Forward
                  // returns while an exit is still running, framer-motion
                  // re-enters the same wrapper and leaves `filter: blur(0px)`
                  // and `transform: translateY(~0px)` inline. Any non-none
                  // filter/transform makes the wrapper the containing block of
                  // `position: fixed` descendants, so the journey stage scrolled
                  // away with the document (blank screen, restored scroll lost).
                  transition: { duration: DURATION.pageExit, ease: EASE_IN },
                }
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {sweep > 0 && !reduceMotion ? (
        <div key={sweep} className="route-veil" aria-hidden="true">
          <i />
        </div>
      ) : null}
    </>
  );
}
