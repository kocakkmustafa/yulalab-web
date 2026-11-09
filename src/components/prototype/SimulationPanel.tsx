"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { copyFor } from "./copy";
import type { Access, BadgeKind } from "./universe-core";

const TABS = ["status", "access", "data"] as const;
type Tab = (typeof TABS)[number];

/**
 * E5: conceptual simulation. Asks for nothing, stores nothing, makes no
 * network call; it only restates the product's recorded status and access
 * path in tabs. The "not a real capability" label is always visible.
 */
export function SimulationPanel({
  locale,
  name,
  badge,
  access,
}: {
  locale: string;
  name: string;
  badge: BadgeKind;
  access: Access;
}) {
  const c = copyFor(locale);
  const [tab, setTab] = useState<Tab>("status");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ status: null, access: null, data: null });

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i + TABS.length - 1) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next]);
    refs.current[TABS[next]]?.focus();
  }

  const body: Record<Tab, string> = {
    status: c.sim.status(name, c.badge[badge]),
    access:
      access.kind === "links"
        ? c.sim.accessLink(access.links.map((l) => l.label).join(" / "))
        : c.sim.accessNone,
    data: c.sim.data,
  };

  return (
    <section id={c.sim.id} aria-labelledby="sim-title" className="scroll-mt-24 rounded-2xl border border-dashed border-white/25 bg-surface p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="sim-title" className="font-display text-2xl font-light tracking-tight">{c.sim.title}</h2>
        <span className="rounded-full border border-white/30 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-100">
          {c.sim.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">{c.sim.notReal}</p>
      <div role="tablist" aria-label={c.sim.label} className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              refs.current[t] = el;
            }}
            role="tab"
            id={`sim-tab-${t}`}
            type="button"
            aria-selected={tab === t}
            aria-controls="sim-body"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(e) => onKey(e, i)}
            className={"focusable min-h-[44px] rounded-full border px-4 text-sm " + (tab === t ? "border-white/40 bg-white/10" : "border-white/15 text-ink-300")}
          >
            {c.sim.tabs[t]}
          </button>
        ))}
      </div>
      <div id="sim-body" role="tabpanel" aria-labelledby={`sim-tab-${tab}`} className="mt-4 text-[15px] leading-relaxed text-ink-100">
        {body[tab]}
      </div>
    </section>
  );
}
