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
      className="footer-wordmark overflow-hidden px-2 text-ink-50 select-none"
      dir="ltr"
    >
      <svg viewBox="0 0 1000 250" className="block w-full h-auto translate-y-[9%]" preserveAspectRatio="xMidYMax meet">
        {/* One word, one Y: the brand Y mark stands in for the first letter of YULA and shares the
            baseline and cap height of "ULA" (founder: the reference has a single initial logo). */}
        <path
          transform="translate(150 134.5) scale(128.3)"
          d="M-.95 -.9H-.43L0 -.27 .43 -.9H.95L.27 .08V.9H-.27V.08Z"
          fill="currentColor"
        />
        <text
          x="290"
          y="250"
          textAnchor="start"
          textLength="700"
          lengthAdjust="spacing"
          fill="currentColor"
          stroke="none"
          className="font-display"
          style={{ fontSize: 330, fontWeight: 700 }}
        >
          ULA
        </text>
      </svg>
    </div>
  );
}
