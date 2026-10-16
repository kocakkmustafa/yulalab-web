"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
  rootMargin?: string;
};

/**
 * IntersectionObserver-driven reveal hook.
 * Returns a ref + class string. Apply the class to the element you want to reveal,
 * pair with the .reveal CSS in globals.css.
 */
export function useReveal({
  threshold = 0.1,
  rootMargin = "0px 0px -10% 0px",
}: Options = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    // Server content remains visible until this optional enhancement exists.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            io.unobserve(node);
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return { ref, ready, seen, className: `reveal${ready ? " is-ready" : ""}${seen ? " is-in" : ""}` } as const;
}
