"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The closing outline wordmark draws itself, stroke by stroke, the first time
 * the footer comes into view. Server and no-JS markup show it fully drawn;
 * reduced motion keeps it that way.
 */
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "ready" | "drawn">("static");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("ready");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        setState("drawn");
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-footer-wordmark={state}
      className="footer-wordmark overflow-hidden px-2 text-ink-50/[0.16] select-none"
      dir="ltr"
    >
      <svg viewBox="0 0 1000 190" className="block w-full h-auto translate-y-[18%]" preserveAspectRatio="xMidYMax meet">
        <text
          x="500"
          y="182"
          textAnchor="middle"
          textLength="980"
          lengthAdjust="spacingAndGlyphs"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
          className="font-display"
          style={{ fontSize: 236, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          YULA Lab
        </text>
      </svg>
    </div>
  );
}
