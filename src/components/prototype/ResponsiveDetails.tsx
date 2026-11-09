"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Open on desktop and without JS; collapsed on first paint of narrow
 * viewports (04-design E4 mobile: items 4-7 are <details>).
 */
export function ResponsiveDetails({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches && ref.current) ref.current.open = false;
  }, []);
  return (
    <details ref={ref} id={id} open className="group scroll-mt-24 rounded-2xl border border-hairline bg-surface p-6">
      <summary className="focusable cursor-pointer list-none font-display text-xl font-light tracking-tight">
        <h2 className="inline">{title}</h2>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
