"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { copyFor } from "./copy";
import { LocalizedText } from "./LocalizedText";
import { PrototypeStatusBadge } from "./PrototypeStatusBadge";
import {
  filterUniverse,
  groupUniverse,
  STATUS_FILTERS,
  summarize,
  type StatusFilter,
  type UniverseEntry,
} from "./universe-core";

const DESKTOP = "(min-width: 1024px)";

/**
 * Product universe list (E3). The list is the primary DOM form and works
 * without JS; the detail panel is a desktop-only enhancement (>= 1024px) and
 * is not rendered at all below that. The panel is not modal: no focus trap,
 * no aria-live; the preview button uses aria-pressed / aria-controls.
 */
export function UniverseExplorer({
  entries,
  locale,
  initialFilter,
  initialSlug,
}: {
  entries: UniverseEntry[];
  locale: string;
  initialFilter: StatusFilter;
  initialSlug?: string;
}) {
  const c = copyFor(locale);
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [selected, setSelected] = useState<string | undefined>(initialSlug);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const visible = filterUniverse(entries, filter);
  const groups = groupUniverse(visible);
  const summary = summarize(entries);
  const current = desktop ? visible.find((e) => e.slug === selected) : undefined;

  function select(slug: string) {
    setSelected(slug);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("katman", slug);
      window.history.replaceState(null, "", url);
    } catch {
      /* URL sync is a convenience only */
    }
  }

  function choose(next: StatusFilter) {
    setFilter(next);
    try {
      const url = new URL(window.location.href);
      if (next === "all") url.searchParams.delete("durum");
      else url.searchParams.set("durum", next);
      window.history.replaceState(null, "", url);
    } catch {
      /* convenience only */
    }
  }

  const renderGroup = (id: string, title: string, list: UniverseEntry[]) =>
    list.length === 0 ? null : (
      <section aria-labelledby={id} className="mb-10">
        <h2 id={id} className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400 mb-4">
          {title} <span className="text-ink-500">· {c.universe.count(list.length)}</span>
        </h2>
        <ul className="grid gap-3">
          {list.map((e) => (
            <li key={e.slug} className="rounded-2xl border border-hairline bg-ink-850 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/prototype/projects/${e.slug}`}
                  className="focusable font-display text-xl font-light tracking-tight underline-offset-4 hover:underline"
                >
                  {e.name}
                </Link>
                <PrototypeStatusBadge kind={e.badge} copy={c} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-300"><LocalizedText locale={locale}>{e.tagline}</LocalizedText></p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                {e.access.kind === "links" ? (
                  e.access.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">
                      {l.label} ↗
                    </a>
                  ))
                ) : (
                  <a href={e.access.href} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">
                    {c.detail.notify}
                  </a>
                )}
                {desktop ? (
                  <button
                    type="button"
                    aria-pressed={selected === e.slug}
                    aria-controls="universe-panel"
                    onClick={() => select(e.slug)}
                    className="focusable min-h-[44px] rounded-full border border-hairline-strong bg-ink-850 px-4 text-ink-100"
                  >
                    {c.universe.preview}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div>
      <div role="group" aria-label={c.universe.filterLabel} className="mb-8 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => choose(f)}
            className={
              "focusable min-h-[44px] rounded-full border px-4 text-sm " +
              (filter === f ? "border-ink-50 bg-ink-700 font-medium text-ink-50" : "border-hairline-strong bg-ink-850 text-ink-300")
            }
          >
            {f === "all" ? c.universe.all : c.badge[f]}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div>
          {visible.length === 0 ? <p className="text-ink-300">{c.universe.empty}</p> : null}
          {renderGroup("grp-main", c.universe.main, groups.main)}
          {renderGroup("grp-portfolio", c.universe.portfolio, groups.portfolio)}
          <section aria-labelledby="grp-summary" className="rounded-2xl border border-hairline p-5">
            <h2 id="grp-summary" className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400 mb-3">
              {c.universe.summary}
            </h2>
            <p className="text-sm text-ink-200">
              {c.badge.live}: {summary.live} · {c.badge.beta}: {summary.beta} · {c.badge.soon}: {summary.soon} · {c.universe.count(summary.total)}
            </p>
          </section>
        </div>

        {desktop ? (
          <aside id="universe-panel" aria-label={c.universe.panelTitle} className="sticky top-28 self-start">
            {/* the single glass focus surface (G1) */}
            <div className="glass p-8">
              {current ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-light tracking-tight">{current.name}</h2>
                    <PrototypeStatusBadge kind={current.badge} copy={c} />
                  </div>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-400"><LocalizedText locale={locale}>{current.category}</LocalizedText></p>
                  <p className="mt-4 text-sm leading-relaxed text-ink-200"><LocalizedText locale={locale}>{current.tagline}</LocalizedText></p>
                  {current.badge === "soon" ? <p className="mt-3 text-sm text-ink-300">{c.researchNote}</p> : null}
                  <dl className="mt-5 grid gap-2 text-sm">
                    <dt className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{c.universe.access}</dt>
                    <dd>
                      {current.access.kind === "links" ? (
                        current.access.links.map((l) => (
                          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="focusable mr-4 underline underline-offset-4">
                            {l.label} ↗
                          </a>
                        ))
                      ) : (
                        <a href={current.access.href} className="focusable underline underline-offset-4">{c.detail.notify}</a>
                      )}
                    </dd>
                    <dt className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{c.universe.privacy}</dt>
                    <dd><Link href={current.privacyUrl} className="focusable underline underline-offset-4">{c.detail.s5privacy}</Link></dd>
                    <dt className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{c.universe.support}</dt>
                    <dd><Link href={current.supportUrl} className="focusable underline underline-offset-4">{c.detail.s5support}</Link></dd>
                  </dl>
                  <Link href={`/prototype/projects/${current.slug}`} className="focusable mt-6 inline-flex min-h-[44px] items-center underline underline-offset-4">
                    {c.universe.openFull} →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-ink-300">{c.universe.panelEmpty}</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
