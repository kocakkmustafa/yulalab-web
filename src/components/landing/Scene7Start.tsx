import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import type { Locale } from "@/lib/types";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

type Cta = {
  key: string;
  href: string;
};

type Path = { key: "individual" | "business" | "engineer"; ctas: readonly Cta[] };

/**
 * Every href is an existing live route (checked against src/app/[locale]).
 * Scene 7 invents no destination: no data room, no studio application, no
 * sign-up. See docs/yula-execution/scene-7-evidence.md.
 */
const PATHS: readonly Path[] = [
  { key: "individual", ctas: [{ key: "products", href: "/projects" }] },
  { key: "business", ctas: [{ key: "consulting", href: "/consulting" }] },
  {
    key: "engineer",
    ctas: [
      { key: "notes", href: "/notes" },
      { key: "approach", href: "/operating-system" },
      { key: "contact", href: "/contact" },
    ],
  },
];

/**
 * Body of scene 7 (WEB-P0-03h): three paths (individual, business, engineer)
 * with equal weight. Every call to action is the same outlined pill: there
 * is no single filled primary. Link text says what the target page is. The
 * business path has one entry (collaboration); product discovery lives in the
 * individual path, so no product stage is shown here. Server rendered, no
 * script, no animation, no form, no e-mail collection.
 */
export function Scene7Start({ t, locale }: { t: Translate; locale: Locale }) {
  return (
    <div
      role="group"
      aria-label={t("scene7.groupsLabel")}
      data-scene7-paths="true"
      className="mt-12 grid gap-4 md:grid-cols-3"
    >
      {PATHS.map((path) => (
        <div
          key={path.key}
          role="group"
          aria-labelledby={`scene7-${path.key}-title`}
          data-scene7-path={path.key}
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <h3
            id={`scene7-${path.key}-title`}
            className="font-display text-xl font-semibold text-ink-50"
          >
            {t(`scene7.paths.${path.key}.title`)}
          </h3>
          <ul role="list" className="mt-5 grid gap-5">
            {path.ctas.map((cta) => (
              <li key={cta.key}>
                <a
                  href={localePath(locale, cta.href)}
                  data-scene7-cta={cta.key}
                  className="scene7-cta inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-ink-50/30 px-6 py-2 text-center text-sm font-semibold text-ink-50 transition-colors hover:border-ink-50/60"
                >
                  {t(`scene7.paths.${path.key}.${cta.key}.label`)}
                </a>
                <p className="mt-2 text-sm text-ink-300">
                  {t(`scene7.paths.${path.key}.${cta.key}.hint`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
