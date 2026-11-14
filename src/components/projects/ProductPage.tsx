import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { TrackedLink } from "@/components/common/TrackedLink";
import { categoriseTarget } from "@/lib/analytics/client";
import { ProductCompany, ProductFaq, ProductFeatures, ProductPrice } from "@/components/projects/ProductShowcase";
import { BraavolabsPlanDemo } from "@/components/projects/BraavolabsPlanDemo";
import { ResponsiveDetails } from "@/components/projects/ResponsiveDetails";
import { StatusPill } from "@/components/common/StatusPill";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import { TrackView } from "@/components/common/TrackView";
import { ScrollMarquee } from "@/components/common/ScrollMarquee";
import { Reveal } from "@/components/common/Reveal";
import { GlassSheen } from "@/components/common/GlassSheen";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { productShowcase, SHOWCASE_LABELS } from "@/data/product-showcase";
import { company } from "@/data/company";
import { localized } from "@/lib/localized";
import { brandInk } from "@/lib/brand-ink";
import { firstPublicLink, isComingSoon, storeLinksOf } from "@/lib/store-slots";
import type { Locale, ProjectConfig } from "@/lib/types";

/**
 * Per-product accent used by the site's own pages.
 *
 * Products that carry a `brand.primaryOnDark` (Ostinato, LifeOS) follow their
 * app brand colour (founder decision "Uygulama renkleri esas", 2026-11-08):
 * `primary` on the light theme, `primaryOnDark` on the dark theme, resolved by
 * CSS (`--brand-fg`). The others keep muted siblings tuned to sit together
 * against black while still telling the products apart.
 */
const ACCENT: Record<string, string> = {
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
/** A pitch has two to four parts; the catalogue decides how many. */
const PITCH_PARTS = [1, 2, 3, 4] as const;

export function ProductPage({ project }: { project: ProjectConfig }) {
  const t = useTranslations("product");
  const tStatus = useTranslations("status");
  const tFooter = useTranslations("footer");
  const locale = useLocale() as Locale;
  const p = t.raw(project.slug) as Record<string, string>;
  const themed = Boolean(project.brand.primaryOnDark);
  const accent = themed ? "var(--brand-fg)" : (ACCENT[project.slug] ?? "#7FD8DC");
  const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`;

  // Registry record: the only source for the privacy/support targets, so a
  // link cannot point somewhere the registry does not name.
  const record = publicRegistry.find((r) => r.slug === project.slug);
  const productShots = project.visuals.screenshots.filter(
    (a): a is Extract<typeof a, { kind: "product" }> => a.kind === "product",
  );
  const hasVision = Boolean(productShowcase[project.slug]?.company);

  const others = projects.filter((o) => o.slug !== project.slug);

  // Founder decision 2026-10-31: the product page introduces the finished
  // product. Publication status, dated claims and their freshness live on
  // /transparency, not here.
  const ctaKind = project.primaryCtaKind ?? "web";
  const web = firstPublicLink(project, ctaKind);
  const comingSoon = isComingSoon(project);
  const storeLinks = storeLinksOf(project, ctaKind);
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
      {...(themed ? { "data-brand-var": "true" } : {})}
      style={{ ...(themed ? brandInk(project.brand) : {}), ["--accent" as string]: accent }}
    >
      {/* Funnel step 1 of 2: the view this page's outbound CTA is
          measured against. Without it "product view → outbound" has no
          denominator. */}
      <TrackView event="product_view" product={project.slug} />
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <ScrollMarquee text={project.name} className="product-marquee" />

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
              style={{ background: accent, boxShadow: `0 0 10px ${tint(70)}` }}
            />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300">
              {p.eyebrow}
            </span>
            <StatusPill status={project.status} slug={project.slug} />
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

        {/* WEB-UX-05c — the eight items of 04-design §E4, in decision order:
            (1) value, (8) access (right column on desktop, directly under
            the value on mobile), (2) real use, (3) capabilities, then
            (4)–(7) as disclosures on mobile. Nothing here is new content:
            existing sections are re-ordered; gaps are written out. */}
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-14" data-testid="product-detail">
          {/* (1) value proposition — founder direction 2026-11-02: a short
              promotional read of the finished product, every sentence backed
              by what the product's main branch ships today */}
          {p.pitchTitle ? (
            <section className="pb-24 lg:col-start-1" aria-labelledby="product-pitch-heading" data-testid="product-pitch" data-item="1">
              <Reveal>
                <h2
                  id="product-pitch-heading"
                  className="font-display font-light text-[clamp(28px,3.6vw,52px)] leading-[1.08] tracking-tight max-w-[24ch] mb-12 text-pretty"
                >
                  {p.pitchTitle}
                </h2>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {PITCH_PARTS.filter((n) => p[`pitch${n}Body`]).map((n, i) => (
                  <Reveal key={n} delay={i * 90} className="border-t border-white/10 pt-6">
                    <h3 className="font-grotesk text-[17px] leading-[1.4] text-ink-50 mb-3 text-pretty">
                      {p[`pitch${n}Title`]}
                    </h3>
                    <p className="text-[15.5px] leading-[1.75] text-ink-300 text-pretty">
                      {p[`pitch${n}Body`]}
                    </p>
                  </Reveal>
                ))}
              </div>
            </section>
          ) : null}

          {/* (8) access card — only real destinations are drawn; a product
              with none keeps the "notify me" mail and the contact mail.
              Not sticky (it would cover content, QA A11Y-13). */}
          <aside
            aria-labelledby="product-access-heading"
            data-testid="product-access"
            data-item="8"
            className="pb-12 lg:col-start-2 lg:row-start-1 lg:row-span-6 lg:self-start lg:pb-24"
          >
            <Reveal>
              <div className="glass p-7 lg:p-8">
                <p className={`${KICKER} mb-5`}>{t("accessHeading")}</p>
                <h2
                  id="product-access-heading"
                  className="font-display font-light text-[clamp(22px,2.2vw,30px)] leading-[1.15] tracking-tight mb-3 text-pretty"
                >
                  {p.ctaTitle}
                </h2>
                <p className="text-[14.5px] leading-[1.7] text-ink-300 mb-6 text-pretty">{p.ctaBody}</p>
                <div className="flex flex-col gap-3">
                  {/* the primary action only renders when there is a real
                      destination — a dead CTA is worse than none */}
                  {web ? (
                    <TrackedLink
                      href={web}
                      event={ctaEvent}
                      product={project.slug}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm rounded-[10px] focusable transition-colors"
                      style={{
                        border: `1px solid ${tint(36)}`,
                        background: `linear-gradient(150deg, ${tint(16)}, ${tint(5)})`,
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
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-4 text-sm rounded-[10px] border border-white/15 text-ink-100 hover:border-white/30 transition-colors focusable"
                    >
                      {STORE_NAME[link.kind]}
                      <ArrowUpRight size={13} strokeWidth={2} className="arrow-nudge" />
                    </TrackedLink>
                  ))}
                  {comingSoon ? (
                    <a
                      href={`mailto:${project.contactEmail ?? company.contact.email}?subject=${encodeURIComponent(`${project.name} — ${localized(NOTIFY_ME, locale)}`)}`}
                      className="inline-flex items-center justify-center px-6 py-4 text-sm rounded-[10px] border border-white/15 text-ink-100 hover:border-white/30 transition-colors focusable"
                    >
                      {localized(NOTIFY_ME, locale)}
                    </a>
                  ) : null}
                  <a
                    href={`mailto:${project.contactEmail ?? company.contact.email}`}
                    className="inline-flex items-center justify-center px-6 py-4 text-sm rounded-[10px] border border-white/10 text-ink-300 hover:text-ink-50 hover:border-white/20 transition-colors focusable"
                  >
                    {p.ctaSecondary}
                  </a>
                </div>
                {record?.supportUrl || record?.privacyUrl ? (
                  <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400">
                    {record.supportUrl ? (
                      <Link href={record.supportUrl} prefetch={false} className="hover:text-ink-50 transition-colors focusable" data-testid="access-support">
                        {tFooter("navSupport")}
                      </Link>
                    ) : null}
                    {record.privacyUrl ? (
                      <Link href={record.privacyUrl} prefetch={false} className="hover:text-ink-50 transition-colors focusable" data-testid="access-privacy">
                        {tFooter("navPrivacy")}
                      </Link>
                    ) : null}
                  </p>
                ) : null}
                {p.disclaimer ? (
                  <p className="mt-6 text-[12.5px] leading-[1.7] text-ink-400">{p.disclaimer}</p>
                ) : null}
              </div>
            </Reveal>
          </aside>

          {/* (2) real use — what it does, then the spec table. The
              catalogue holds no step-by-step flow (02 §2 C2); this is what
              exists, not an invented walkthrough. */}
          <div className="lg:col-start-1" data-testid="product-usage" data-item="2">
            {/* 01 — what it does */}
            <section className="pb-24">
              <Reveal>
                <p className={`${KICKER} mb-10`}>{p.s1Kicker}</p>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
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
          </div>

          {/* (3) capabilities — "On the roadmap" labels stay */}
          <div className="lg:col-start-1" data-testid="product-capabilities" data-item="3">
            <ProductFeatures slug={project.slug} locale={locale} />
            <ProductPrice
              slug={project.slug}
              locale={locale}
              comingSoon={comingSoon ? tStatus("comingSoon") : undefined}
            />
          </div>

          {/* (4) real screen / demo — the demo is only ever an example
              simulation; with neither, the empty state says so */}
          <ResponsiveDetails id="ekran" title={t("screenHeading")} className="pb-12 lg:col-start-1 lg:pb-24">
            <div data-item="4">
              {productShots.length ? (
                <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0 m-0 mb-12">
                  {productShots.map((shot) => (
                    <li key={shot.src} className="relative aspect-[16/10] overflow-clip rounded-xl border border-white/10">
                      <Image src={shot.src} alt={shot.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover object-top" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p data-testid="screen-empty" className="mb-12 max-w-[60ch] text-[15px] leading-[1.7] text-ink-300">
                  {t("screenEmpty")}
                </p>
              )}
              {project.slug === "braavolabs" ? (
                <div id="dene" data-testid="demo-area">
                  <p
                    data-testid="demo-label"
                    className="mb-6 inline-flex rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-300"
                  >
                    {t("demoLabel")}
                  </p>
                  <BraavolabsPlanDemo />
                </div>
              ) : null}
            </div>
          </ResponsiveDetails>

          {/* (5) privacy and trust: the product's own policy, then the FAQ */}
          <ResponsiveDetails id="gizlilik" title={t("trustHeading")} className="pb-12 lg:col-start-1 lg:pb-24">
            <div data-item="5">
              {record?.privacyUrl ? (
                <p className="mb-10 text-[15px]">
                  <Link href={record.privacyUrl} prefetch={false} className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-ink-50 focusable" data-testid="trust-privacy">
                    {t("trustPrivacy")}
                  </Link>
                </p>
              ) : null}
              <ProductFaq slug={project.slug} locale={locale} />
            </div>
          </ResponsiveDetails>

          {/* (6) release status: the registry-backed pill and the deep link
              to that product's record on /transparency (#<slug>) */}
          <ResponsiveDetails id="durum" title={t("statusHeading")} className="pb-12 lg:col-start-1 lg:pb-24">
            <div data-item="6" className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-12 lg:pb-0">
              <StatusPill status={project.status} slug={project.slug} />
              <Link href={`/transparency#${project.slug}`} prefetch={false} className="text-[15px] underline underline-offset-4 hover:text-ink-50 focusable" data-testid="status-link">
                {t("statusLink")}
              </Link>
            </div>
          </ResponsiveDetails>

          {/* (7) future vision — only registered roadmap material; hidden
              when the product has none */}
          {hasVision ? (
            <ResponsiveDetails id="vizyon" title={localized(SHOWCASE_LABELS.roadmap, locale)} className="lg:col-start-1">
              <div data-item="7">
                <ProductCompany slug={project.slug} locale={locale} />
              </div>
            </ResponsiveDetails>
          ) : null}
        </div>

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
