import { localized } from "@/lib/localized";
import { Reveal } from "@/components/common/Reveal";
import { productShowcase, SHOWCASE_LABELS } from "@/data/product-showcase";
import type { Locale } from "@/lib/types";

const KICKER = "font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400";

/**
 * The finished product, feature by feature. A capability that the shipped
 * app does not have yet keeps its "On the roadmap" label in every locale, so
 * the page can describe where the product is going without passing a plan
 * off as a release. Pure and hook-free so it can be rendered in a test.
 */
export function ProductFeatures({ slug, locale }: { slug: string; locale: Locale }) {
  const showcase = productShowcase[slug];
  if (!showcase?.features.length) return null;

  return (
    <section className="pb-24" aria-labelledby="product-features-heading">
      <Reveal>
        <h2 id="product-features-heading" className={`${KICKER} mb-10`}>
          {localized(SHOWCASE_LABELS.features, locale)}
        </h2>
      </Reveal>
      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
        {showcase.features.map((feature, index) => (
          <li key={feature.title.en} data-roadmap={feature.roadmap ? "true" : "false"}>
            <Reveal delay={(index % 3) * 70} className="glass h-full p-7">
              {feature.roadmap ? (
                <p className="mb-4 inline-flex rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300">
                  {localized(SHOWCASE_LABELS.roadmap, locale)}
                </p>
              ) : null}
              <h3 className="font-display font-light text-[clamp(20px,1.8vw,26px)] leading-[1.2] tracking-tight mb-3 text-pretty">
                {localized(feature.title, locale)}
              </h3>
              <p className="text-[14.5px] leading-[1.7] text-ink-300 text-pretty">
                {localized(feature.body, locale)}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProductFaq({ slug, locale }: { slug: string; locale: Locale }) {
  const showcase = productShowcase[slug];
  if (!showcase?.faq.length) return null;

  return (
    <section className="pb-24" aria-labelledby="product-faq-heading">
      <Reveal>
        <h2 id="product-faq-heading" className={`${KICKER} mb-10`}>
          {localized(SHOWCASE_LABELS.faq, locale)}
        </h2>
      </Reveal>
      <div className="glass p-7 lg:p-11">
        {showcase.faq.map((item, index) => (
          <details
            key={item.question.en}
            className={"group py-5 border-t border-white/10" + (index === showcase.faq.length - 1 ? " border-b" : "")}
          >
            <summary className="cursor-pointer list-none flex items-baseline justify-between gap-5 font-grotesk text-[16px] text-ink-50 focusable">
              {localized(item.question, locale)}
              <span aria-hidden className="font-mono text-ink-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-[66ch] text-[14.5px] leading-[1.7] text-ink-300">
              {localized(item.answer, locale)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
