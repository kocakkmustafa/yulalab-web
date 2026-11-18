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
      className="footer-wordmark overflow-hidden px-2 text-white select-none"
      dir="ltr"
    >
      <svg viewBox="0 0 1000 250" className="block w-full h-auto translate-y-[9%]" preserveAspectRatio="xMidYMax meet">
        {/* big Y mark: the same two-stroke Y as the header mark, solid white */}
        <path d="M28 40L130 160L232 40M130 160V250" fill="none" stroke="currentColor" strokeWidth="62" strokeLinecap="butt" strokeLinejoin="miter" />
        <text
          x="640"
          y="244"
          textAnchor="middle"
          textLength="690"
          lengthAdjust="spacingAndGlyphs"
          fill="currentColor"
          stroke="none"
          className="font-display"
          style={{ fontSize: 330, fontWeight: 700 }}
        >
          YULA
        </text>
      </svg>
    </div>
  );
}
