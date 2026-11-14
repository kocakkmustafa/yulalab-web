import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { localized } from "@/lib/localized";
import { FLAGSHIP_SLUGS, demoSlotOf, proofBadgeOf } from "./scene3-products";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Body of scene 3 (WEB-P0-03d): the three flagship products. Each cell has one
 * human-outcome sentence (the product record's own tagline, in the page
 * language), a demo slot labelled by what it really is, an evidence badge read
 * through `presentClaims` (so a lapsed or withheld claim never says "verified"),
 * and a link to the product page. The other five products stay reachable
 * through the product index link. Server rendered, no script, no animation.
 */
export function Scene3Products({
  t,
  locale,
  now = new Date(),
}: {
  t: Translate;
  locale: string;
  now?: Date;
}) {
  const lang = locale === "tr" ? "tr" : "en";
  return (
    <div data-scene3-body="true" className="mt-12">
      <ul role="list" aria-label={t("scene3.listLabel")} className="grid min-w-0 gap-3 md:grid-cols-3 md:gap-4">
        {FLAGSHIP_SLUGS.map((slug) => {
          const project = projects.find((p) => p.slug === slug);
          if (!project) throw new Error(`Scene 3: missing product ${slug}`);
          const slot = demoSlotOf(slug, project);
          const badge = proofBadgeOf(publicRegistry.find((r) => r.slug === slug), now);
          return (
            <li
              key={slug}
              data-scene3-cell={slug}
              className="flex min-w-0 flex-col rounded-2xl border border-ink-50/15 p-4 md:p-6"
            >
              <h3 className="font-display text-xl font-semibold">{project.name}</h3>
              <p className="mt-3 text-base text-ink-100">
                {localized(project.tagline, lang)}
              </p>
              <div
                data-scene3-demo={slot}
                className="mt-3 rounded-xl border border-dashed border-ink-50/25 bg-ink-50/[0.04] p-3 md:mt-5 md:p-4"
              >
                <p className="font-mono text-[10px] tracking-widest uppercase text-ink-300">
                  {t("scene3.demoHeading")}
                </p>
                <p className="mt-1 text-sm text-ink-50 md:mt-2">{t(`scene3.demo.${slot}`)}</p>
              </div>
              <p className="mt-3 font-mono text-[10px] tracking-widest uppercase text-ink-300 md:mt-4">
                {t("scene3.proofHeading")}
              </p>
              <p
                data-scene3-proof={badge.state}
                className={
                  "mt-1 text-sm " + (badge.state === "verified" ? "text-ink-50" : "text-ink-300")
                }
              >
                {badge.state === "verified"
                  ? t("scene3.proof.verified", { count: badge.count })
                  : badge.state === "lapsed"
                    ? t("scene3.proof.lapsed", { date: badge.expiredOn })
                    : t("scene3.proof.none")}
              </p>
              <a
                href={localePath(locale, `/projects/${slug}`)}
                data-scene3-go={slug}
                className="focusable mt-auto inline-flex min-h-[44px] pt-2 items-center underline underline-offset-4 hover:text-ink-50"
              >
                {t("scene3.go", { name: project.name })}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-8">
        <a
          href={localePath(locale, "/projects")}
          data-scene3-all="true"
          className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-ink-50"
        >
          {t("scene3.allProducts")}
        </a>
      </p>
    </div>
  );
}
