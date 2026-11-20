"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const WIDE = "(min-width: 1024px)";

// Without matchMedia (very old engines, jsdom) the page keeps the server
// answer: everything open.
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribe(onChange: () => void) {
  if (!canMatch()) return () => {};
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Product-page items (4)–(7) (04-design §E4): always open and not
 * collapsible on desktop, a `<details>` disclosure on mobile.
 *
 * The server snapshot is "wide", so the server HTML carries every section
 * open — crawlers and no-JS readers get the whole page. On a narrow screen
 * the sections fold after hydration; they sit below the fold, so the fold
 * moves nothing the reader is looking at. A `#hash` that points inside a
 * folded section (e.g. `#dene`) opens it.
 */
export function ResponsiveDetails({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const wide = useSyncExternalStore(
    subscribe,
    () => (canMatch() ? window.matchMedia(WIDE).matches : true),
    () => true,
  );
  const [pickedOpen, setPickedOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const reveal = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const target = document.getElementById(hash);
      if (target && ref.current?.contains(target)) {
        setPickedOpen(true);
        requestAnimationFrame(() => target.scrollIntoView());
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <details
      ref={ref}
      id={id}
      data-testid={`pd-${id}`}
      open={wide || pickedOpen}
      onToggle={(e) => {
        if (!wide) setPickedOpen(e.currentTarget.open);
      }}
      className={`group ${className}`}
    >
      <summary
        onClick={(e) => {
          if (wide) e.preventDefault();
        }}
        className="flex cursor-pointer list-none items-baseline justify-between gap-5 pb-6 focusable lg:cursor-default"
      >
        <h2 className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400">{title}</h2>
        <span aria-hidden className="font-mono text-ink-400 transition-transform group-open:rotate-45 lg:hidden">
          +
        </span>
      </summary>
      {children}
    </details>
  );
}
