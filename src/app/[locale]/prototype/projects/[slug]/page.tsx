import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { PageShell } from "@/components/common/PageShell";
import { IMAGE_DIMENSIONS } from "@/data/image-dimensions";
import { getProjectBySlug } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { localized } from "@/lib/localized";
import { FallbackScope } from "@/components/prototype/FallbackScope";
import { LocalizedText } from "@/components/prototype/LocalizedText";
import { copyFor } from "@/components/prototype/copy";
import { assertPrototypeEnabled, PROTOTYPE_ROBOTS } from "@/components/prototype/gate";
import { PrototypeStatusBadge } from "@/components/prototype/PrototypeStatusBadge";
import { ResponsiveDetails } from "@/components/prototype/ResponsiveDetails";
import { SimulationPanel } from "@/components/prototype/SimulationPanel";
import { accessFor, badgeKindFor, staleClaimCount } from "@/components/prototype/universe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Product (prototype)", robots: PROTOTYPE_ROBOTS };

const H2 = "font-display text-xl font-light tracking-tight";
const BOX = "rounded-2xl border border-hairline bg-ink-850 p-6";

export default async function PrototypeProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  assertPrototypeEnabled();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = getProjectBySlug(slug);
  const record = publicRegistry.find((r) => r.slug === slug);
  if (!project || !record) notFound();

  const c = copyFor(locale);
  const d = c.detail;
  const badge = badgeKindFor(record.lifecycle);
  const shipped = badge === "live" || badge === "beta";
  const access = accessFor(record, project);
  const today = new Date().toISOString().slice(0, 10);
  const stale = staleClaimCount(record, today);
  const screenshots = record.screenshots;
  const vision = localized(project.vision, locale);
  // Only GitHub / documentation links that the project record really carries.
  const docLinks = project.links.filter(
    (l): l is { kind: "github" | "documentation"; href: string } => (l.kind === "github" || l.kind === "documentation") && Boolean(l.href),
  );

  return (
    <PageShell>
      <FallbackScope locale={locale}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        <Link href="/prototype/projects" className="focusable underline underline-offset-4">← {d.back}</Link> · {c.protoNote}
      </p>

      <header className="pb-10 pt-8">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display font-light text-[clamp(36px,6vw,88px)] leading-[1.02] tracking-tightest">{project.name}</h1>
          <PrototypeStatusBadge kind={badge} copy={c} />
        </div>
      </header>

      <p className="mb-6 lg:hidden">
        <a href="#s8" className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.jump}</a>
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <div className="grid gap-6">
          <section aria-labelledby="s1" className={BOX}>
            <h2 id="s1" className={H2}>{d.s1}</h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-400"><LocalizedText locale={locale}>{localized(project.category, locale)}</LocalizedText></p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-200"><LocalizedText locale={locale}>{localized(project.tagline, locale)}</LocalizedText></p>
            {!shipped ? <p className="mt-3 text-sm text-ink-300">{c.researchNote}</p> : null}
          </section>

          <section aria-labelledby="s2" className={BOX}>
            <h2 id="s2" className={H2}>{d.s2}</h2>
            {shipped ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-200"><LocalizedText locale={locale}>{localized(project.short, locale)}</LocalizedText></p>
                <p className="mt-3 text-sm text-ink-400">{d.s2empty}</p>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-300">{d.s2research}</p>
            )}
          </section>

          <section aria-labelledby="s3" className={BOX}>
            <h2 id="s3" className={H2}>{d.s3}</h2>
            {shipped ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {project.features.map((f) => (
                  <li key={f.title.en}>
                    <h3 className="text-[15px] font-medium text-ink-50"><LocalizedText locale={locale}>{localized(f.title, locale)}</LocalizedText></h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-300"><LocalizedText locale={locale}>{localized(f.description, locale)}</LocalizedText></p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-300">{d.s3none}</p>
            )}
          </section>

          <ResponsiveDetails id="s4" title={d.s4}>
            {screenshots.length === 0 ? (
              <p className="text-sm text-ink-300">{d.s4empty}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {screenshots.map((s) => (
                  <li key={s.path}>
                    <Image
                      src={s.path}
                      alt={localized({ tr: s.altTr, en: s.altEn }, locale)}
                      width={IMAGE_DIMENSIONS[s.path]?.width ?? 1200}
                      height={IMAGE_DIMENSIONS[s.path]?.height ?? 800}
                      sizes="(min-width: 1024px) 480px, 90vw"
                      className="h-auto w-full rounded-xl border border-hairline"
                    />
                    <p className="mt-2 text-xs text-ink-400">{d.s4captured}: {s.capturedAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </ResponsiveDetails>

          <ResponsiveDetails id="s5" title={d.s5}>
            <div className="flex flex-col gap-1 text-sm">
              <Link href={record.privacyUrl} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.s5privacy}</Link>
              <Link href={record.supportUrl} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.s5support}</Link>
            </div>
          </ResponsiveDetails>

          <ResponsiveDetails id="s6" title={d.s6}>
            <p className="flex flex-wrap items-center gap-3 text-sm text-ink-200">
              <PrototypeStatusBadge kind={badge} copy={c} />
              <span>{d.s6claims(record.claims.length, stale)}</span>
            </p>
            <p className="mt-2 text-xs text-ink-400">{d.s6updated}: {record.updatedAt}</p>
            <Link href="/transparency" className="focusable mt-2 inline-flex min-h-[44px] items-center text-sm underline underline-offset-4">{d.s6link} →</Link>
          </ResponsiveDetails>

          {vision ? (
            <ResponsiveDetails id="s7" title={d.s7}>
              <p className="text-[15px] leading-relaxed text-ink-200"><LocalizedText locale={locale}>{vision}</LocalizedText></p>
            </ResponsiveDetails>
          ) : null}

          <SimulationPanel locale={locale} name={project.name} badge={badge} access={access} />
        </div>
        {/* (8) access card: DOM order = visual order (last on mobile, right column on desktop; mobile has a jump link at the top) */}
        <aside id="s8" aria-labelledby="s8-title" className="scroll-mt-24 rounded-2xl border border-hairline-strong bg-ink-850 p-6 lg:sticky lg:top-28">
          <h2 id="s8-title" className={H2}>{d.s8}</h2>
          <div className="mt-4 flex flex-col gap-1 text-sm">
            {access.kind === "links" ? (
              access.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">
                  {d.openIn}: {l.label} ↗
                </a>
              ))
            ) : (
              <>
                <p className="text-ink-300">{d.s8none}</p>
                <a href={access.href} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.notify}</a>
              </>
            )}
            {docLinks.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">
                {d.links}: {l.kind} ↗
              </a>
            ))}
            <Link href={record.privacyUrl} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.s5privacy}</Link>
            <Link href={record.supportUrl} className="focusable inline-flex min-h-[44px] items-center underline underline-offset-4">{d.s5support}</Link>
          </div>
        </aside>

      </div>
    </FallbackScope>
    </PageShell>
  );
}
