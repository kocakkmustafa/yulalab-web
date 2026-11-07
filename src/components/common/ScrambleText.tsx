"use client";

import { useEffect, useRef, useState } from "react";
import { scrambleFrame } from "@/lib/scramble";

type Props = {
  text: string;
  className?: string;
  /** ms after the label enters the viewport. */
  delay?: number;
  /** ms from fully scrambled to resolved. */
  duration?: number;
};

const FRAME_MS = 42;

/**
 * A mono label that decodes itself the first time it is seen. The real text
 * is always in the accessibility tree (screen readers never hear the stand-in
 * glyphs), the server markup is the plain text, and reduced motion keeps it.
 */
export function ScrambleText({ text, className, delay = 120, duration = 760 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // null = at rest: the plain text is the only text node, so textContent and
  // the accessible name are exactly `text` outside the < 1 s decode.
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    setShown(null);
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let timer = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const progress = (now - start) / duration;
      if (progress >= 1) {
        setShown(null);
        return;
      }
      setShown(scrambleFrame(text, progress, Math.floor((now - start) / FRAME_MS)));
      frame = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        setShown(scrambleFrame(text, 0, 0));
        timer = window.setTimeout(() => {
          frame = requestAnimationFrame(step);
        }, delay);
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [text, delay, duration]);

  return (
    <span ref={ref} className={className} data-scramble={shown === null ? "rest" : "decoding"}>
      {shown === null ? (
        text
      ) : (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">{shown}</span>
        </>
      )}
    </span>
  );
}
