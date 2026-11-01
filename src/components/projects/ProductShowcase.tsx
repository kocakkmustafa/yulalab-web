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

function RoleNode({ name, lead = false }: { name: string; lead?: boolean }) {
  return (
    <div
      className={
        "glass px-4 py-3 text-center font-grotesk text-[14.5px] leading-[1.35] text-ink-50 " +
        (lead ? "border border-white/25" : "")
      }
    >
      {name}
    </div>
  );
}

/**
 * Braavolabs' "Company": the founder's first agent org, drawn as a small org
 * chart. It is not in the shipped product yet, so the whole section carries
 * the roadmap label. Plain lists keep the hierarchy readable without CSS.
 */
export function ProductCompany({ slug, locale }: { slug: string; locale: Locale }) {
  const company = productShowcase[slug]?.company;
  if (!company) return null;
  const { head } = company;

  return (
    <section className="pb-24" aria-labelledby="product-company-heading">
      <Reveal>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 id="product-company-heading" className="font-display font-light text-[clamp(28px,3.2vw,44px)] tracking-tight">
            {localized(company.title, locale)}
          </h2>
          {company.roadmap ? (
            <p className="inline-flex rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300">
              {localized(SHOWCASE_LABELS.roadmap, locale)}
            </p>
          ) : null}
        </div>
        <p className="mb-10 max-w-[62ch] text-[15.5px] leading-[1.75] text-ink-300 text-pretty">
          {localized(company.body, locale)}
        </p>
      </Reveal>
      <Reveal>
        <div className="mx-auto max-w-[280px]">
          <RoleNode name={localized(head.name, locale)} lead />
        </div>
        <div aria-hidden className="mx-auto h-6 w-px bg-white/20" />
        <ul
          role="list"
          aria-label={localized(head.name, locale)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0 border-t border-white/15 pt-6"
        >
          {(head.reports ?? []).map((role) => (
            <li key={role.name.en} className="flex flex-col items-stretch gap-3">
              <RoleNode name={localized(role.name, locale)} />
              {role.reports?.length ? (
                <ul role="list" className="list-none p-0 m-0 flex flex-col gap-3 ps-4 border-s border-white/15">
                  {role.reports.map((sub) => (
                    <li key={sub.name.en}>
                      <RoleNode name={localized(sub.name, locale)} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function formatPrice(amount: { TRY?: number; USD: number }, locale: Locale): string {
  const currency = locale === "tr" && amount.TRY !== undefined ? "TRY" : "USD";
  const value = currency === "TRY" ? amount.TRY! : amount.USD;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

/**
 * Founder decision K6 (2026-10-31): the product page shows the price. An app
 * that is not in a store yet keeps its "Coming soon" label beside it.
 */
export function ProductPrice({
  slug,
  locale,
  comingSoon,
}: {
  slug: string;
  locale: Locale;
  /** Localized "Coming soon" when the app is not in a store yet. */
  comingSoon?: string;
}) {
  const price = productShowcase[slug]?.price;
  if (!price) return null;

  return (
    <section className="pb-24" aria-labelledby="product-price-heading">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h2 id="product-price-heading" className={KICKER}>
            {localized(SHOWCASE_LABELS.pricing, locale)}
          </h2>
          {comingSoon ? (
            <p className="inline-flex rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300">
              {comingSoon}
            </p>
          ) : null}
        </div>
        <div className="glass p-7 lg:p-11 flex flex-wrap items-baseline gap-x-12 gap-y-6">
          {price.plan ? (
            <p className="w-full font-mono text-[11px] tracking-[0.16em] uppercase text-ink-300">{price.plan}</p>
          ) : null}
          {([
            [price.monthly, SHOWCASE_LABELS.perMonth],
            ...(price.yearly ? [[price.yearly, SHOWCASE_LABELS.perYear] as const] : []),
          ] as const).map(([amount, period]) => (
            <p key={period.en} className="flex items-baseline gap-3">
              <span className="font-display font-light text-[clamp(32px,4vw,56px)] tracking-tight text-ink-50" dir="ltr">
                {formatPrice(amount, locale)}
              </span>
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-300">
                {localized(period, locale)}
              </span>
            </p>
          ))}
          {price.store ? (
            <p className="w-full max-w-[66ch] text-[13px] leading-[1.7] text-ink-400">
              {localized(SHOWCASE_LABELS.storePriceNote, locale)}
            </p>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
