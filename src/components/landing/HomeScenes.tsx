import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/types";
import { HOME_SCENES } from "./home-scenes";
import { Scene1Identity } from "./Scene1Identity";
import { Scene2Difference } from "./Scene2Difference";

/**
 * The seven-scene skeleton of the home page (WEB-P0-03a).
 *
 * Placement: a plain server-rendered block that follows the existing
 * journey (`YulaExperience`, 3D or its StaticExperience twin). It does not
 * touch the journey, the persistent scene host, `html[data-scene="live"]`,
 * Lenis or PageTransition. It paints an opaque page ground at z-index 1, so
 * the journey's fixed overlay and the WebGL layer sit behind it once the
 * visitor scrolls past the journey. Because it is server HTML, the same
 * seven headings exist with no JavaScript, no WebGL and reduced motion.
 *
 * Each scene states one message; the bodies are filled by WEB-P0-03b..03h.
 */
export async function HomeScenes({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  const ts = await getTranslations({ locale, namespace: "status" });

  // tr and en are written in full. The other twelve catalogues carry the
  // English copy until translated, so the block says so (WCAG 3.1.2).
  const fallbackEnglish = locale !== "tr" && locale !== "en";
  // Words injected into that block (status labels) must be English too, or a
  // right-to-left word lands inside an `lang="en" dir="ltr"` sentence.
  const ts = await getTranslations({ locale: fallbackEnglish ? "en" : locale, namespace: "status" });

  return (
    <div
      data-home-scenes="true"
      lang={fallbackEnglish ? "en" : undefined}
      dir={fallbackEnglish ? "ltr" : undefined}
      className="relative z-[1] bg-[rgb(var(--yula-page-rgb))] text-ink-50 border-t border-white/10"
    >
      <nav
        aria-label={t("navLabel")}
        className="max-w-7xl mx-auto px-6 lg:px-10 pt-10"
      >
        <ol className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px] tracking-widest uppercase text-ink-300">
          {HOME_SCENES.map((scene) => (
            <li key={scene.id}>
              <a
                href={`#${scene.id}`}
                data-home-scene-link={scene.n}
                className="focusable inline-flex min-h-[44px] items-center gap-2 px-2 hover:text-ink-50 transition-colors"
              >
                <span aria-hidden="true">{String(scene.n).padStart(2, "0")}</span>
                {t(`${scene.key}.label`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {HOME_SCENES.map((scene) => {
        const headingId = `${scene.id}-title`;
        return (
          <section
            key={scene.id}
            id={scene.id}
            data-home-scene={scene.n}
            aria-labelledby={headingId}
            className="scroll-mt-24 max-w-7xl mx-auto px-6 lg:px-10 py-20 md:py-28 border-b border-white/[0.06] last:border-b-0"
          >
            <p
              aria-hidden="true"
              className="font-mono text-[11px] tracking-widest uppercase text-ink-300"
            >
              {String(scene.n).padStart(2, "0")} / {String(HOME_SCENES.length).padStart(2, "0")}
            </p>
            <h2
              id={headingId}
              className="mt-4 max-w-[26ch] font-display text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight"
            >
              {t(`${scene.key}.title`)}
            </h2>
            <p className="mt-6 max-w-[62ch] text-base md:text-lg leading-relaxed text-ink-200">
              {t(`${scene.key}.message`)}
            </p>
            {scene.n === 1 ? <Scene1Identity t={t} ts={ts} /> : null}
            {scene.n === 2 ? <Scene2Difference t={t} ts={ts} /> : null}
          </section>
        );
      })}
    </div>
  );
}
