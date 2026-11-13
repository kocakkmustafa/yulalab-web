import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { braavolabs } from "@/data/projects/braavolabs";
import { lifeos } from "@/data/projects/lifeos";
import type { ProjectConfig } from "@/lib/types";

type Translate = Awaited<ReturnType<typeof getTranslations>>;
type Lang = "tr" | "en";

// Status labels reuse the existing `status.*` catalogue keys.
const STATUS_KEY = {
  live: "live",
  beta: "beta",
  "coming-soon": "comingSoon",
  "in-development": "inDevelopment",
} as const;

/** Finds a feature row by its English title so a reordered record cannot silently change what a row cites. */
function feature(record: ProjectConfig, enTitle: string) {
  const row = record.features.find((f) => f.title.en === enTitle);
  if (!row) throw new Error(`Scene 4: ${record.slug} has no feature "${enTitle}"`);
  return row;
}

/**
 * The four shared principles of scene 4. A principle with a `record` shows the
 * record's own sentence (verbatim, in the page language) as "current
 * capability" together with the record's own status; a principle without one
 * says so. Every principle also carries a "planned" statement that is a
 * direction, never a capability. Nothing here is a measurement and no row is
 * called "verified": the registry claims behind these products have lapsed, so
 * a row rests on the product record's own words and nothing stronger.
 * See docs/yula-execution/scene-4-evidence.md.
 */
const PRINCIPLES = [
  { key: "p1", source: { record: lifeos, feature: feature(lifeos, "Offline-first") } },
  { key: "p2", source: { record: braavolabs, feature: feature(braavolabs, "Spend approval") } },
  { key: "p3", source: { record: lifeos, feature: feature(lifeos, "Health data, read-only") } },
  { key: "p4", source: null },
] as const;

/**
 * Body of scene 4 (WEB-P0-03e): "Independent products. Shared engineering
 * principles." Four principles, each split into a "current" cell (tied to a
 * product record line) and a "planned" cell. There is no shared model or
 * shared database and the scene says so. Server rendered, no script, no
 * animation, no new dependency.
 */
export function Scene4Engineering({
  t,
  ts,
  lang,
  locale,
  studioOpen,
}: {
  t: Translate;
  ts: Translate;
  lang: Lang;
  locale: string;
  studioOpen: boolean;
}) {
  return (
    <div data-scene4-body="true" className="mt-12">
      <ul role="list" aria-label={t("scene4.listLabel")} className="grid gap-4 md:grid-cols-2">
        {PRINCIPLES.map((principle) => {
          const source = principle.source;
          return (
            <li
              key={principle.key}
              data-scene4-principle={principle.key}
              className="overflow-hidden rounded-2xl border border-ink-50/15"
            >
              <h3 className="p-5 pb-0 font-display text-xl font-semibold md:p-6 md:pb-0">
                {t(`scene4.principles.${principle.key}.name`)}
              </h3>
              <div
                data-scene4-cell="current"
                data-scene4-tag={source ? "capability" : "none"}
                className="m-5 mb-0 rounded-xl bg-ink-50/[0.04] p-4 md:m-6 md:mb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-ink-300">
                    {t("scene4.currentLabel")}
                  </p>
                  <span
                    data-scene4-badge={source ? "capability" : "none"}
                    className={
                      "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase " +
                      (source ? "border-ink-50/40 text-ink-50" : "border-dashed border-ink-50/30 text-ink-300")
                    }
                  >
                    {t(source ? "scene4.tagCapability" : "scene4.tagNone")}
                  </span>
                </div>
                {source ? (
                  <>
                    <p className="mt-3 text-base text-ink-50">{source.feature.description[lang]}</p>
                    <p
                      data-scene4-source={`projects/${source.record.slug}`}
                      className="mt-3 font-mono text-[10px] tracking-widest uppercase text-ink-300"
                    >
                      {t("scene4.sourceLabel", {
                        product: source.record.name,
                        feature: source.feature.title[lang],
                        status: ts(STATUS_KEY[source.record.status as keyof typeof STATUS_KEY]),
                      })}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-base text-ink-300">{t("scene4.noRecord")}</p>
                )}
              </div>
              <div
                data-scene4-cell="planned"
                className="m-5 rounded-xl border border-dashed border-ink-50/25 p-4 md:m-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-ink-300">
                    {t("scene4.plannedLabel")}
                  </p>
                  <span
                    data-scene4-badge="planned"
                    className="rounded-full border border-dashed border-ink-50/30 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase text-ink-300"
                  >
                    {t("scene4.tagPlanned")}
                  </span>
                </div>
                <p className="mt-3 text-base text-ink-200">
                  {t(`scene4.principles.${principle.key}.planned`)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 max-w-[62ch] text-xs text-ink-300">{t("scene4.note")}</p>
      {/* A list, not a <nav>: the scene rail owns the page's only <nav> in this block. */}
      <div className="mt-6">
        <ul role="list" aria-label={t("scene4.linksLabel")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>
            <a
              href={localePath(locale, "/operating-system")}
              data-scene4-link="operating-system"
              className="focusable inline-flex min-h-[44px] items-center text-ink-50 underline underline-offset-4"
            >
              {t("scene4.linkOperatingSystem")}
            </a>
          </li>
          <li>
            {studioOpen ? (
              <a
                href={localePath(locale, "/studio")}
                data-scene4-link="studio"
                className="focusable inline-flex min-h-[44px] items-center text-ink-50 underline underline-offset-4"
              >
                {t("scene4.linkStudio")}
              </a>
            ) : (
              <a
                href={localePath(locale, "/transparency")}
                data-scene4-link="transparency"
                className="focusable inline-flex min-h-[44px] items-center text-ink-50 underline underline-offset-4"
              >
                {t("scene4.linkTransparency")}
              </a>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
