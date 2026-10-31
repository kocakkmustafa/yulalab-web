import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { TrackedLink } from "@/components/common/TrackedLink";
import { categoriseTarget } from "@/lib/analytics/client";
import { ProductCompany, ProductFaq, ProductFeatures, ProductPrice } from "@/components/projects/ProductShowcase";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import { TrackView } from "@/components/common/TrackView";
import { Reveal } from "@/components/common/Reveal";
import { GlassSheen } from "@/components/common/GlassSheen";
import { projects } from "@/data/projects";
import { company } from "@/data/company";
import { localized } from "@/lib/localized";
import type { Locale, ProjectConfig } from "@/lib/types";

/**
 * Per-product accent used by the site's own pages.
 *
 * Deliberately not `project.brand.primary`: those are each product's own
 * app-store identity (Burun Farkı's is a saturated gold, for instance), and
 * unrelated saturated hues side by side make the umbrella site look like a
 * directory. These are muted siblings tuned to sit together against black
 * while still telling the products apart.
 */
const ACCENT: Record<string, string> = {
  lifeos: "#8FB8E8",
  burunfarki: "#7FD8B0",
  braavolabs: "#D8B87F",
};

const STORE_NAME = { appstore: "App Store", playstore: "Google Play" } as const;
const NOTIFY_ME = { tr: "Çıkınca haber ver", en: "Notify me at launch" };

const KICKER = "font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400";
const ROW =
  "flex items-baseline justify-between gap-5 py-4 border-t border-white/10";
const ROW_KEY =
  "font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400";
const ROW_VAL = "font-grotesk text-[15.5px] text-end";

export function ProductPage({ project }: { project: ProjectConfig }) {
  const t = useTranslations("product");
  const tStatus = useTranslations("status");
  const locale = useLocale() as Locale;
  const p = t.raw(project.slug) as Record<string, string>;
  const accent = ACCENT[project.slug] ?? "#7FD8DC";

  const others = projects.filter((o) => o.slug !== project.slug);

  // Founder decision 2026-10-31: the product page introduces the finished
  // product. Publication status, dated claims and their freshness live on
  // /transparency, not here.
  const ctaKind = project.primaryCtaKind ?? "web";
  const web = project.links.find((l) => l.kind === ctaKind)?.href;
  const comingSoon = project.status === "coming-soon" || project.status === "in-development";
  const storeLinks = project.links.filter(
    (link): link is { kind: "appstore" | "playstore"; href: string } =>
      (link.kind === "appstore" || link.kind === "playstore") && Boolean(link.href) && link.kind !== ctaKind,
  );
  // The same click must carry the same event name on both surfaces. The hub
  // already reports a store destination as `store_outbound`; this page
  // hardcoded `product_primary_cta`, so "how many people did we send to the
  // App Store" needed a union query split by surface to answer.
  //
  // Derived from the destination HOST rather than from the declared link
  // kind — the server derives target_category the same way, and deciding
  // the two from different sources is how a `web` link pointing at a store
  // would produce `product_primary_cta` alongside `target_category:store`.
  // That is the hand-maintained-label drift this task already fixed once.
  const ctaEvent = web && categoriseTarget(web) === "store" ? "store_outbound" : "product_primary_cta";

  return (
    <div
      className="page-enter relative min-h-screen"
      style={{ ["--accent" as string]: accent }}
    >
      {/* Funnel step 1 of 2: the view this page's outbound CTA is
          measured against. Without it "product view → outbound" has no
          denominator. */}
      <TrackView event="product_view" product={project.slug} />
      <GlassSheen />
      <div className="ambient" aria-hidden />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10">
        {/* breadcrumb — pt clears the site's fixed 65px header */}
        <div className="flex items-center justify-between gap-5 pt-24">
          <Link
            href="/projects"
            className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400 hover:text-ink-50 transition-colors focusable"
          >
            ← {t("back")}
          </Link>
          <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase">
            {project.name}
          </span>
        </div>

        {/* hero */}
        <header className="pt-16 pb-16">
          {project.visuals.icon ? <div className="mb-8"><ProjectMonogram project={project} size={96} radius={20} /></div> : null}
          <Reveal className="flex items-center gap-3 mb-8">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 10px ${accent}b3` }}
            />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300">
              {p.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-display font-light text-[clamp(40px,6.6vw,100px)] leading-[0.98] tracking-tightest mb-6">
              {project.name}
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="max-w-[52ch] text-[clamp(16px,1.3vw,19px)] leading-[1.68] text-ink-300 text-pretty">
              {p.lede}
            </p>
          </Reveal>
        </header>

        <ProductFeatures slug={project.slug} locale={locale} />

        <ProductCompany slug={project.slug} locale={locale} />



        {/* 01 — what it does */}
        <section className="pb-24">
          <Reveal>
            <p className={`${KICKER} mb-10`}>{p.s1Kicker}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
            {(["a1", "a2"] as const).map((k, i) => (
              <Reveal key={k} delay={i * 90}>
                <h2 className="font-display font-light text-[clamp(24px,2.8vw,40px)] leading-[1.16] tracking-tight max-w-[22ch] mb-4 text-pretty">
                  {p[`${k}Title`]}
                </h2>
                <p className="max-w-[46ch] text-[15.5px] leading-[1.75] text-ink-300 text-pretty">
                  {p[`${k}Body`]}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 02 — spec table */}
        <section className="pb-24">
          <Reveal>
            <p className={`${KICKER} mb-10`}>{p.s2Kicker}</p>
          </Reveal>
          <Reveal>
            <div className="glass p-7 lg:p-11">
              {([1, 2, 3, 4] as const).map((n, i) => (
                <div
                  key={n}
                  className={ROW + (i === 3 ? " border-b border-white/10" : "")}
                >
                  <span className={ROW_KEY}>{p[`r${n}k`]}</span>
                  <span className={ROW_VAL}>{p[`r${n}v`]}</span>
                </div>
              ))}
              {p.note ? (
                <p className="mt-5 max-w-[66ch] text-[13px] leading-[1.7] text-ink-400">
                  {p.note}
                </p>
              ) : null}
            </div>
          </Reveal>
        </section>



        <ProductPrice
          slug={project.slug}
          locale={locale}
          comingSoon={comingSoon ? tStatus("comingSoon") : undefined}
        />

        <ProductFaq slug={project.slug} locale={locale} />

        {/* CTA */}
        <Reveal>
          <section className="pb-24">
            <div className="glass p-8 lg:p-16 text-center">
              <h2 className="font-display font-light text-[clamp(24px,3vw,40px)] tracking-tight mb-4">
                {p.ctaTitle}
              </h2>
              <p className="mx-auto max-w-[46ch] text-[15px] leading-[1.72] text-ink-300 mb-8">
                {p.ctaBody}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {/* the primary action only renders when there is a real
                    destination — a dead CTA is worse than none */}
                {web ? (
                  <TrackedLink
                    href={web}
                    event={ctaEvent}
                    product={project.slug}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-4 text-sm rounded-[10px] focusable transition-colors"
                    style={{
                      border: `1px solid ${accent}5c`,
                      background: `linear-gradient(150deg, ${accent}29, ${accent}0d)`,
                    }}
                  >
                    {p.ctaPrimary}
                    <ArrowUpRight size={13} strokeWidth={2} className="arrow-nudge" />
                  </TrackedLink>
                ) : null}
                {/* Store buttons for every listed store not already used as the
                    primary action. Brand names stay untranslated. */}
                {storeLinks.map((link) => (
                  <TrackedLink
                    key={link.kind}
                    href={link.href}
                    event="store_outbound"
                    product={project.slug}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-4 text-sm rounded-[10px] border border-white/15 text-ink-100 hover:border-white/30 transition-colors focusable"
                  >
                    {STORE_NAME[link.kind]}
                    <ArrowUpRight size={13} strokeWidth={2} className="arrow-nudge" />
                  </TrackedLink>
                ))}
                {comingSoon ? (
                  <a
                    href={`mailto:${project.contactEmail ?? company.contact.email}?subject=${encodeURIComponent(`${project.name} — ${localized(NOTIFY_ME, locale)}`)}`}
                    className="inline-flex items-center px-6 py-4 text-sm rounded-[10px] border border-white/15 text-ink-100 hover:border-white/30 transition-colors focusable"
                  >
                    {localized(NOTIFY_ME, locale)}
                  </a>
                ) : null}
                <a
                  href={`mailto:${project.contactEmail ?? company.contact.email}`}
                  className="inline-flex items-center px-6 py-4 text-sm rounded-[10px] border border-white/10 text-ink-300 hover:text-ink-50 hover:border-white/20 transition-colors focusable"
                >
                  {p.ctaSecondary}
                </a>
              </div>
              {p.disclaimer ? (
                <p className="mx-auto mt-8 max-w-[60ch] text-[12.5px] leading-[1.7] text-ink-400">
                  {p.disclaimer}
                </p>
              ) : null}
            </div>
          </section>
        </Reveal>

        {/* cross-navigation */}
        <nav
          aria-label={t("back")}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 pb-20"
        >
          {others.map((o, i) => (
            <Link
              key={o.slug}
              href={`/projects/${o.slug}`}
              className="glass p-6 lg:p-8 focusable"
            >
              <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-ink-400 mb-3">
                {i === 0 ? t("otherNext") : t("otherAlso")}
              </span>
              <span className="font-display font-light text-[clamp(20px,2vw,28px)] tracking-tight">
                {o.name} →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
