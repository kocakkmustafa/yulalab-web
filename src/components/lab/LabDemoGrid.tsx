"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LAB_DEMOS, type LabDemo } from "@/data/lab-demos";
import { LAB_DEMO_LOADERS } from "@/components/lab/lab-demo-loaders";

/**
 * WEB-P2-01a: card grid of the open Lab demos. The server passes the ids of
 * the demos whose flag is open; this component never reads a flag. A demo's
 * code is fetched only when its "Open" button is pressed (see `lab-demo-loaders.ts`). Without JavaScript the buttons stay hidden and each card keeps a
 * plain link to the product page, where the same demo lives.
 */
/** Ids, not records: the server passes plain data only. */
type Props = { ids: readonly string[] };
type State = { id: string; status: "loading" | "ready" | "error"; Comp?: ComponentType };

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--yula-focus)]";
const BTN = `inline-flex min-h-11 items-center rounded-full border border-[color:var(--yula-hairline-strong)] px-5 text-[14px] text-ink-50 ${FOCUS}`;

export function LabDemoGrid({ ids }: Props) {
  const demos = LAB_DEMOS.filter((d) => ids.includes(d.id));
  const t = useTranslations("labDemos");
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<State | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const lastOpener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (open?.status === "ready") panel.current?.focus();
    // A failed load leaves the focus on something that can fix it.
    if (open?.status === "error") retryButton.current?.focus();
  }, [open?.status, open?.id]);

  if (demos.length === 0) return null;

  const openDemo = (demo: LabDemo, button: HTMLButtonElement | null) => {
    if (button) lastOpener.current = button;
    setOpen({ id: demo.id, status: "loading" });
    LAB_DEMO_LOADERS[demo.id]()
      .then((Comp) => setOpen((cur) => (cur?.id === demo.id ? { id: demo.id, status: "ready", Comp } : cur)))
      .catch(() => setOpen((cur) => (cur?.id === demo.id ? { id: demo.id, status: "error" } : cur)));
  };
  const close = () => {
    setOpen(null);
    lastOpener.current?.focus();
  };
  const current = demos.find((d) => d.id === open?.id);
  // One live region, rendered before anything changes in it, so screen
  // readers announce the loading and error messages that are filled in later.
  const liveMessage = open?.status === "loading" ? t("loading") : open?.status === "error" ? t("error") : "";

  return (
    <section
      className="max-w-7xl mx-auto px-6 lg:px-10 pb-16"
      aria-labelledby="lab-demos-h"
      data-testid="lab-demos"
    >
      <h2 id="lab-demos-h" className="font-display text-[28px] font-semibold tracking-tight text-ink-50">
        {t("heading")}
      </h2>
      <p className="mt-3 max-w-[60ch] text-[15.5px] leading-[1.65] text-ink-300">{t("intro")}</p>
      <noscript>
        <p className="mt-3 max-w-[60ch] text-[14px] text-ink-300">{t("noscript")}</p>
      </noscript>
      <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label={t("listLabel")}>
        {demos.map((d) => {
          const isOpen = open?.id === d.id;
          return (
            <li key={d.id} className="glass flex flex-col p-6" data-testid={`lab-demo-card-${d.id}`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-300">{t("badge")}</p>
              <h3 id={`lab-demo-${d.id}-h`} className="mt-3 font-display text-xl font-semibold tracking-tight text-ink-50">
                {d.product}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{t(d.descriptionKey)}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {hydrated ? (
                  <button
                    type="button"
                    className={BTN}
                    aria-expanded={isOpen}
                    aria-controls="lab-demo-panel"
                    aria-label={t("openNamed", { product: d.product })}
                    data-testid={`lab-demo-open-${d.id}`}
                    onClick={(e) => (isOpen ? close() : openDemo(d, e.currentTarget))}
                  >
                    {t("open")}
                  </button>
                ) : null}
                {/* prefetch off: a prefetched product page would pull the demo chunk on first load */}
                <Link href={`/projects/${d.slug}#dene`} prefetch={false} className={`text-[13.5px] text-ink-100 link-wipe focusable`}>
                  {t("productLink")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="lab-demo-live">
        {liveMessage}
      </p>
      <div
        id="lab-demo-panel"
        ref={panel}
        tabIndex={-1}
        role="region"
        aria-label={current ? t("panelLabel", { product: current.product }) : undefined}
        hidden={!open}
        className="mt-8 outline-none"
        data-testid="lab-demo-panel"
      >
        {open && current ? (
          <>
            <div className="mb-4 flex justify-end">
              <button type="button" className={BTN} aria-label={t("closeNamed", { product: current.product })} onClick={close}>
                {t("close")}
              </button>
            </div>
            {open.status === "loading" ? (
              <p aria-hidden="true" className="text-[14px] text-ink-300">
                {t("loading")}
              </p>
            ) : null}
            {open.status === "error" ? (
              <div className="flex flex-wrap items-center gap-4" data-testid="lab-demo-error">
                <p className="text-[15px] text-ink-50">{t("error")}</p>
                <button
                  type="button"
                  ref={retryButton}
                  className={BTN}
                  data-testid="lab-demo-retry"
                  onClick={() => openDemo(current, null)}
                >
                  {t("retry")}
                </button>
              </div>
            ) : null}
            {open.status === "ready" && open.Comp ? <open.Comp /> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
