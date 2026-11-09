"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { StatusPill } from "@/components/common/StatusPill";
import { TrackedLink } from "@/components/common/TrackedLink";
import { categoriseTarget } from "@/lib/analytics/client";
import {
  UNIVERSE_FILTERS,
  matchesFilter,
  parseLayer,
  summariseStatus,
  withLayer,
  type UniverseFilter,
} from "@/lib/product-universe";
import type { ProjectStatus } from "@/lib/types";

/** One product, fully resolved on the server (no catalogue data crosses as code). */
export type UniverseItem = {
  slug: string;
  name: string;
  status: ProjectStatus;
  group: "featured" | "portfolio";
  category: string;
  tagline: string;
  access: {
    primary?: { href: string; label: string };
    stores: { kind: "appstore" | "playstore"; href: string; label: string }[];
    notify?: { href: string; label: string };
    contact: { href: string; label: string };
  };
  privacyUrl?: string;
  screenshot?: { src: string; alt: string };
};

export type UniverseStrings = {
  privacy: string;
  support: string;
  supportUrl?: string;
  statusLink: string;
  screenEmpty: string;
};

const WIDE = "(min-width: 1024px)";
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";
function subscribe(onChange: () => void) {
  if (!canMatch()) return () => {};
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const KICKER = "font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400";

/**
 * The product universe (WEB-UX-05b, 04-design §E3): grouped list, a status
 * filter, and — on desktop only — a side panel for the selected product.
 *
 * Rules the markup keeps:
 *  - the server HTML is the plain grouped list of links, so the page works
 *    without JavaScript and on mobile (no panel there, the row is a link);
 *  - the panel is not a dialog: no focus trap, nothing is inert, focus stays
 *    on the row that opened it; Esc closes it and returns focus there;
 *  - the selection lives in the URL (`?katman=<slug>`), replaced in place,
 *    so a copied link reopens the same panel;
 *  - no motion is added: state changes are instant.
 */
export function ProductUniverse({
  items,
  strings,
}: {
  items: UniverseItem[];
  strings: UniverseStrings;
}) {
  const t = useTranslations("projectsIndex");
  const tStatus = useTranslations("status");
  const wide = useSyncExternalStore(
    subscribe,
    () => (canMatch() ? window.matchMedia(WIDE).matches : false),
    () => false,
  );
  const [filter, setFilter] = useState<UniverseFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const slugs = items.map((i) => i.slug);

  // Deep link in, and back/forward: the URL is the source of the selection.
  useEffect(() => {
    const read = () => setSelected(parseLayer(window.location.search, slugs));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
    // slugs is derived from the stable server props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback((slug: string | null) => {
    setSelected(slug);
    const { pathname, search, hash } = window.location;
    window.history.replaceState(window.history.state, "", pathname + withLayer(search, slug) + hash);
  }, []);

  const visible = items.filter((i) => matchesFilter(i.status, filter));
  const featured = visible.filter((i) => i.group === "featured");
  const portfolio = visible.filter((i) => i.group === "portfolio");
  const summary = summariseStatus(items);
  const current = wide ? items.find((i) => i.slug === selected && matchesFilter(i.status, filter)) : undefined;

  const closePanel = useCallback(() => {
    if (!selected) return;
    const trigger = triggers.current.get(selected);
    select(null);
    trigger?.focus();
  }, [selected, select]);

  const filterLabel = (f: UniverseFilter) =>
    f === "all" ? t("filterAll") : tStatus(f === "soon" ? "comingSoon" : f);

  function renderGroup(heading: string, group: UniverseItem[]) {
    if (!group.length) return null;
    return (
      <section aria-label={heading} data-testid={`universe-group-${group[0].group}`}>
        <h2 className={`${KICKER} mb-4`}>{heading}</h2>
        <ul role="list" className="list-none p-0 m-0 flex flex-col gap-3">
          {group.map((item) => {
            const open = current?.slug === item.slug;
            return (
              <li
                key={item.slug}
                data-testid="universe-row"
                data-slug={item.slug}
                className={
                  "rounded-xl border px-5 py-4 transition-colors " +
                  (open ? "border-white/40 bg-white/[0.04]" : "border-white/10 hover:border-white/25")
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  {/* the name is always the link to the full page; on desktop a
                      separate button previews the product in the side panel */}
                  <h3 className="font-display font-light text-[clamp(22px,2.2vw,30px)] leading-[1.15] tracking-tight">
                    <Link href={`/projects/${item.slug}`} className="focusable">
                      {item.name}
                    </Link>
                  </h3>
                  <div className="flex items-center gap-3">
                    <StatusPill status={item.status} slug={item.slug} />
                    {wide ? (
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) triggers.current.set(item.slug, el);
                          else triggers.current.delete(item.slug);
                        }}
                        aria-expanded={open}
                        aria-controls="universe-panel"
                        aria-label={t("previewLabel", { name: item.name })}
                        onClick={() => select(open ? null : item.slug)}
                        className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-300 hover:border-white/30 focusable"
                      >
                        {t("preview")}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-300 text-pretty">
                  <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400 me-2">
                    {item.category}
                  </span>
                  {item.tagline}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div
      data-testid="product-universe"
      onKeyDown={(e) => {
        if (e.key === "Escape" && current) {
          e.stopPropagation();
          closePanel();
        }
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 mb-10">
        <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-2" data-testid="universe-filter">
          {UNIVERSE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              data-filter={f}
              onClick={() => {
                setFilter(f);
                const sel = items.find((i) => i.slug === selected);
                if (sel && !matchesFilter(sel.status, f)) select(null);
              }}
              className={
                "rounded-full border px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase focusable transition-colors " +
                (filter === f ? "border-white/50 text-ink-50 bg-white/[0.06]" : "border-white/15 text-ink-300 hover:border-white/30")
              }
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
        {/* A heading-level fact, not a control: counts are derived from the
            same catalogue the list renders. */}
        <p data-testid="status-summary" className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-400">
          {t("summary", { live: summary.live, beta: summary.beta, soon: summary.soon })}
        </p>
      </div>
      <p role="status" className="sr-only" data-testid="universe-count">
        {t("showing", { count: visible.length })}
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12">
        <div className="flex flex-col gap-12">
          {renderGroup(t("featuredHeading"), featured)}
          {renderGroup(t("portfolioHeading"), portfolio)}
          {visible.length === 0 ? (
            <p data-testid="universe-empty" className="text-[15px] text-ink-300">
              {t("noMatch")}
            </p>
          ) : null}
        </div>

        {wide ? (
          <aside
            id="universe-panel"
            aria-label={t("panelHeading")}
            data-testid="universe-panel"
            className="self-start"
          >
            {current ? (
              <div className="glass p-7" data-testid="universe-panel-open">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="font-display font-light text-[clamp(26px,2.4vw,34px)] leading-[1.1] tracking-tight">
                    {current.name}
                  </h2>
                  <StatusPill status={current.status} slug={current.slug} />
                </div>
                <p className="text-[14.5px] leading-[1.7] text-ink-300 mb-6 text-pretty">{current.tagline}</p>

                <p className={`${KICKER} mb-3`}>{t("accessHeading")}</p>
                <div className="flex flex-col gap-2.5 mb-6">
                  {current.access.primary ? (
                    <TrackedLink
                      href={current.access.primary.href}
                      event={categoriseTarget(current.access.primary.href) === "store" ? "store_outbound" : "product_primary_cta"}
                      product={current.slug}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-2.5 px-5 py-3 text-sm rounded-[10px] border border-white/25 focusable"
                    >
                      {current.access.primary.label}
                      <ArrowUpRight size={13} strokeWidth={2} />
                    </TrackedLink>
                  ) : null}
                  {current.access.stores.map((s) => (
                    <TrackedLink
                      key={s.kind}
                      href={s.href}
                      event="store_outbound"
                      product={current.slug}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-2.5 px-5 py-3 text-sm rounded-[10px] border border-white/15 focusable"
                    >
                      {s.label}
                      <ArrowUpRight size={13} strokeWidth={2} />
                    </TrackedLink>
                  ))}
                  {current.access.notify ? (
                    <a href={current.access.notify.href} className="inline-flex items-center px-5 py-3 text-sm rounded-[10px] border border-white/15 focusable">
                      {current.access.notify.label}
                    </a>
                  ) : null}
                  <a href={current.access.contact.href} className="inline-flex items-center px-5 py-3 text-sm rounded-[10px] border border-white/10 text-ink-300 focusable">
                    {current.access.contact.label}
                  </a>
                </div>

                <p className="mb-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400">
                  {current.privacyUrl ? (
                    <Link href={current.privacyUrl} className="hover:text-ink-50 focusable" data-testid="panel-privacy">
                      {strings.privacy}
                    </Link>
                  ) : null}
                  {strings.supportUrl ? (
                    <Link href={strings.supportUrl} className="hover:text-ink-50 focusable">
                      {strings.support}
                    </Link>
                  ) : null}
                  <Link href="/transparency" className="hover:text-ink-50 focusable" data-testid="panel-status">
                    {strings.statusLink}
                  </Link>
                </p>

                {current.screenshot ? (
                  <div className="relative aspect-[16/10] overflow-clip rounded-xl border border-white/10 mb-6">
                    <Image src={current.screenshot.src} alt={current.screenshot.alt} fill sizes="380px" className="object-cover object-top" />
                  </div>
                ) : (
                  <p data-testid="panel-screen-empty" className="mb-6 text-[13.5px] leading-[1.6] text-ink-400">
                    {strings.screenEmpty}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/projects/${current.slug}`}
                    className="inline-flex items-center gap-2 text-[15px] underline underline-offset-4 focusable"
                    data-testid="panel-open-full"
                  >
                    {t("openFull")} <span aria-hidden>→</span>
                  </Link>
                  <button type="button" onClick={closePanel} className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400 hover:text-ink-50 focusable">
                    {t("closePanel")}
                  </button>
                </div>
              </div>
            ) : (
              <p data-testid="universe-panel-hint" className="rounded-xl border border-dashed border-white/15 p-6 text-[14px] leading-[1.6] text-ink-400">
                {t("panelHint")}
              </p>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
