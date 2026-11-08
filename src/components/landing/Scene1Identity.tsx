import type { getTranslations } from "next-intl/server";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

const SIGNALS = ["s1", "s2", "s3"] as const;

/**
 * Body of scene 1 (WEB-P0-03b): two calls to action and three example
 * signals, intent -> result. Server-rendered, no script, no live demo, no
 * audio, no new dependency. The signals describe what a product is built to
 * do and say they are examples; they carry no measurement. The only motion is
 * one CSS pulse on the arrow, switched off under reduced motion.
 */
export function Scene1Identity({ t }: { t: Translate }) {
  return (
    <>
      <div
        role="group"
        aria-label={t("scene1.ctaLabel")}
        className="mt-8 flex flex-col gap-3 sm:flex-row"
      >
        <a
          href="#scene-3-products"
          data-scene1-cta="products"
          className="focusable inline-flex min-h-[48px] items-center justify-center rounded-full bg-ink-50 px-6 text-sm font-semibold text-[rgb(var(--yula-page-rgb))] transition-opacity hover:opacity-90"
        >
          {t("scene1.ctaProducts")}
        </a>
        <a
          href="#scene-4-engineering"
          data-scene1-cta="how"
          className="focusable inline-flex min-h-[48px] items-center justify-center rounded-full border border-ink-50/30 px-6 text-sm font-semibold text-ink-50 transition-colors hover:border-ink-50/60"
        >
          {t("scene1.ctaHow")}
        </a>
      </div>

      <div data-scene1-signals="true" className="mt-12">
        <h3 className="font-mono text-[11px] tracking-widest uppercase text-ink-300">
          {t("scene1.signalsLabel")}
        </h3>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {SIGNALS.map((key) => (
            <li
              key={key}
              data-scene1-signal={key}
              className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-semibold">
                  {t(`scene1.signals.${key}.product`)}
                </span>
                <span className="rounded-full border border-ink-50/20 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase text-ink-300">
                  {t("scene1.example")}
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-300">
                <span className="font-mono text-[10px] tracking-widest uppercase">
                  {t("scene1.intentLabel")}
                </span>
                <span className="mt-1 block text-base text-ink-50">
                  {t(`scene1.signals.${key}.intent`)}
                </span>
              </p>
              <span
                aria-hidden="true"
                className="my-3 flex items-center gap-2 text-ink-300"
              >
                <span className="h-px flex-1 bg-ink-50/25" />
                <span className="scene1-pulse h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              <p className="text-sm text-ink-300">
                <span className="font-mono text-[10px] tracking-widest uppercase">
                  {t("scene1.resultLabel")}
                </span>
                <span className="mt-1 block text-base text-ink-50">
                  {t(`scene1.signals.${key}.result`)}
                </span>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[62ch] text-xs text-ink-300">{t("scene1.signalsNote")}</p>
      </div>
    </>
  );
}
