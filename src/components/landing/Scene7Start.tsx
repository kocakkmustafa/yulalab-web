import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import type { Locale } from "@/lib/types";
import { HOME_DOORS } from "./home-doors";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Body of scene 7 (WEB-UX-05d): the four doors, "What brings you here?".
 * Same server-rendered block as before, outside the 3D journey and after it.
 * Each door names its audience and links only to a real route; there is no
 * filled primary, no form, no script, no animation and no stored choice.
 * Plain anchors (not the next-intl Link) keep the scene prefetch-free.
 */
export function Scene7Start({ t, locale }: { t: Translate; locale: Locale }) {
  return (
    <div className="mt-12" data-home-doors="true">
      <h3 className="font-display text-xl font-semibold text-ink-50">{t("doors.label")}</h3>
      <ul role="list" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {HOME_DOORS.map((door) => (
          <li
            key={door.key}
            data-home-door={door.key}
            className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
          >
            <h4 className="font-display text-lg font-semibold text-ink-50">
              {t(`doors.${door.key}.title`)}
            </h4>
            <p className="mt-2 text-sm text-ink-300">{t(`doors.${door.key}.audience`)}</p>
            <ul role="list" className="mt-5 grid gap-3">
              {door.links.map((link) => (
                <li key={link.key}>
                  <a
                    href={localePath(locale, link.href)}
                    data-home-door-link={link.key}
                    className="scene7-cta focusable inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-ink-50/30 px-6 py-2 text-center text-sm font-semibold text-ink-50 transition-colors hover:border-ink-50/60"
                  >
                    {t(`doors.${door.key}.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
