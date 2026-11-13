import type { getTranslations } from "next-intl/server";
import { lifeos } from "@/data/projects/lifeos";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

// Status labels reuse the existing `status.*` catalogue keys.
const STATUS_KEY = {
  live: "live",
  beta: "beta",
  "coming-soon": "comingSoon",
  "in-development": "inDevelopment",
} as const;

/**
 * The three pairs of scene 2. `capability` rows must name the product record
 * that backs them (`record`); every other row is a `vision`. Nothing here is
 * a measurement, and no row is called "verified": the registry claims behind
 * these products have lapsed, so the section says what a row rests on (the
 * product record's own words) and nothing stronger.
 * See docs/yula-execution/scene-2-evidence.md.
 */
const PAIRS = [
  { key: "p1", kind: "capability", record: lifeos },
  { key: "p2", kind: "vision" },
  { key: "p3", kind: "vision" },
] as const;

/**
 * Body of scene 2 (WEB-P0-03c): a two-column comparison, three pairs. Left is
 * the common pattern, right is our approach, each right-hand cell tagged
 * "current capability" (tied to a product record) or "our vision". Server
 * rendered, no script, no animation, no new dependency. Stacks on narrow
 * screens; each cell carries its own label so nothing depends on columns.
 */
export function Scene2Difference({ t, ts }: { t: Translate; ts: Translate }) {
  return (
    <div data-scene2-compare="true" className="mt-12">
      <ul aria-label={t("scene2.listLabel")} className="grid gap-4">
        {PAIRS.map((pair) => {
          const record = pair.kind === "capability" ? pair.record : null;
          return (
            <li
              key={pair.key}
              data-scene2-pair={pair.key}
              className="grid overflow-hidden rounded-2xl border border-ink-50/15 md:grid-cols-2"
            >
              <div
                data-scene2-side="pattern"
                className="p-5 md:p-6"
              >
                <p className="font-mono text-[10px] tracking-widest uppercase text-ink-300">
                  {t("scene2.patternLabel")}
                </p>
                <p className="mt-3 text-base text-ink-200 md:text-lg">
                  {t(`scene2.pairs.${pair.key}.pattern`)}
                </p>
              </div>
              <div
                data-scene2-side="approach"
                data-scene2-tag={pair.kind}
                className="border-t border-ink-50/15 bg-ink-50/[0.04] p-5 md:border-l md:border-t-0 md:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-ink-300">
                    {t("scene2.approachLabel")}
                  </p>
                  <span
                    data-scene2-badge={pair.kind}
                    className={
                      "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase " +
                      (pair.kind === "capability"
                        ? "border-ink-50/40 text-ink-50"
                        : "border-dashed border-ink-50/30 text-ink-300")
                    }
                  >
                    {t(pair.kind === "capability" ? "scene2.tagCapability" : "scene2.tagVision")}
                  </span>
                </div>
                <p className="mt-3 text-base text-ink-50 md:text-lg">
                  {t(`scene2.pairs.${pair.key}.approach`)}
                </p>
                <p className="mt-2 text-sm text-ink-300">
                  {t(`scene2.pairs.${pair.key}.detail`)}
                </p>
                {record ? (
                  <p
                    data-scene2-source={`projects/${record.slug}`}
                    className="mt-3 font-mono text-[10px] tracking-widest uppercase text-ink-300"
                  >
                    {t("scene2.sourceLabel", {
                      product: record.name,
                      status: ts(STATUS_KEY[record.status as keyof typeof STATUS_KEY]),
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 max-w-[62ch] text-xs text-ink-300">{t("scene2.note")}</p>
    </div>
  );
}
