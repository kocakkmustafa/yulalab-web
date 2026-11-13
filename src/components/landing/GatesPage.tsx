import { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import type { Locale } from "@/lib/types";
import { HOME_DOORS } from "./home-doors";

/**
 * `/start` (WEB-UX-05g, design 04 §E2): the four doors on a page of their own.
 * Server-rendered, no script, no stored choice. Door copy and targets come
 * from the same source as the home strip (`HOME_DOORS`, `home.doors.*`).
 * Desktop: four cards and one glass note. Mobile: four flat rows, no glass.
 * Plain anchors keep the page prefetch-free.
 */
export async function GatesPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  const ts = await getTranslations({ locale, namespace: "start" });
  return (
    <div className="page-enter max-w-6xl mx-auto px-6 lg:px-10 pt-32 pb-16" data-gates-page="true">
      <section aria-labelledby="gates-title" className="max-w-3xl">
        <h1 id="gates-title" className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
          {t("doors.label")}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-200">{ts("lede")}</p>
      </section>
      <ul role="list" className="mt-12 grid md:grid-cols-2 xl:grid-cols-4 md:gap-4">
        {HOME_DOORS.map((door) => (
          <li
            key={door.key}
            data-gate={door.key}
            className="border-t border-ink-50/15 py-6 last:border-b md:rounded-2xl md:border md:bg-ink-50/[0.04] md:p-6 md:last:border-b"
          >
            <h2 className="font-display text-xl font-semibold text-ink-50">{t(`doors.${door.key}.title`)}</h2>
            <p className="mt-2 text-sm text-ink-300">
              <span className="font-mono text-xs tracking-widest">{ts("forLabel")}</span>
              <span aria-hidden="true"> · </span>
              {t(`doors.${door.key}.audience`)}
            </p>
            <ul role="list" className="mt-4 grid gap-3 md:mt-5">
              {door.links.map((link) => (
                <li key={link.key}>
                  <a
                    href={localePath(locale, link.href)}
                    data-gate-link={link.key}
                    className="focusable inline-flex min-h-[48px] items-center gap-2 rounded-full border border-ink-50/30 px-6 py-2 text-sm font-semibold text-ink-50 transition-colors hover:border-ink-50/60"
                  >
                    {t(`doors.${door.key}.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <aside data-gates-note="true" className="glass mt-8 hidden p-6 md:block">
        <p className="text-sm leading-relaxed text-ink-200">{ts("note")}</p>
      </aside>
      <p className="mt-6 text-sm text-ink-300 md:hidden">{ts("note")}</p>
    </div>
  );
}
