import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell, PageHeader } from "@/components/common/PageShell";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { localized } from "@/lib/localized";
import { FallbackScope } from "@/components/prototype/FallbackScope";
import { LocalizedText } from "@/components/prototype/LocalizedText";
import { copyFor } from "@/components/prototype/copy";
import { assertPrototypeEnabled, PROTOTYPE_ROBOTS } from "@/components/prototype/gate";
import { buildUniverse, summarize } from "@/components/prototype/universe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact paths (prototype)", robots: PROTOTYPE_ROBOTS };

const BOX = "rounded-2xl border border-hairline bg-ink-850 p-6";
const LINK = "focusable flex min-h-[44px] items-center underline underline-offset-4 [overflow-wrap:anywhere]";

export default async function PrototypeContactPage({ params }: { params: Promise<{ locale: string }> }) {
  assertPrototypeEnabled();
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copyFor(locale);
  const p = c.contact;
  const summary = summarize(buildUniverse(publicRegistry, projects, locale));
  const g = company.contact;

  return (
    <PageShell>
      <FallbackScope locale={locale}>
      <PageHeader kicker={`${p.kicker} · ${c.protoNote}`} title={p.title} lede={p.lede} />
      <div id={p.anchor} className="grid scroll-mt-24 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="p-users" className={BOX}>
          <h2 id="p-users" className="font-display text-xl font-light">{p.users.title}</h2>
          <p className="mt-2 text-sm text-ink-300">{p.users.body}</p>
          <Link href="/prototype/projects" className={LINK}>{p.users.cta} →</Link>
          <a href={`mailto:${g.email}`} className={LINK}>{p.support}: {g.email}</a>
        </section>

        <section aria-labelledby="p-business" className={BOX}>
          <h2 id="p-business" className="font-display text-xl font-light">{p.business.title}</h2>
          <p className="mt-2 text-sm text-ink-300">{p.business.body}</p>
          <Link href="/consulting" className={LINK}>{p.business.cta} →</Link>
          <p className="text-sm text-ink-200">{p.consulting}:</p>
          <a href={`mailto:${g.consultingEmail}`} className={LINK}>{g.consultingEmail}</a>
        </section>

        <section aria-labelledby="p-partners" className={BOX}>
          <h2 id="p-partners" className="font-display text-xl font-light">{p.partners.title}</h2>
          <p className="mt-2 text-sm text-ink-300">{p.partners.body}</p>
          <p data-partner-sentence lang="tr" dir="ltr" className="mt-3 text-[15px] text-ink-100">{p.partnerSentence}</p>
          <p className="mt-3 text-sm text-ink-200">
            {p.partners.legal}: <LocalizedText locale={locale}>{localized(company.publisher.businessType, locale)}</LocalizedText> · {company.publisher.controller} · {company.publisher.country}
          </p>
          <p className="mt-1 text-sm text-ink-200">
            {p.partners.status}: {c.badge.live} {summary.live} · {c.badge.beta} {summary.beta} · {c.badge.soon} {summary.soon}
          </p>
          <Link href="/consulting#consulting-contact" className={LINK}>{p.partners.consulting} →</Link>
          <a href={`mailto:${g.email}`} className={LINK}>{p.partners.cta}: {g.email}</a>
        </section>

        <section aria-labelledby="p-investors" className={BOX}>
          <h2 id="p-investors" className="font-display text-xl font-light">{p.investors.title}</h2>
          <p className="mt-2 text-sm text-ink-300">{p.investors.body}</p>
          <p data-partner-sentence lang="tr" dir="ltr" className="mt-3 text-[15px] text-ink-100">{p.partnerSentence}</p>
          <Link href="/consulting#consulting-contact" className={LINK}>{p.partners.consulting} →</Link>
          <a href={`mailto:${g.email}`} className={LINK}>{p.investors.cta}: {g.email}</a>
        </section>

        <section aria-labelledby="p-builders" className={BOX}>
          <h2 id="p-builders" className="font-display text-xl font-light">{p.builders.title}</h2>
          <p className="mt-2 text-sm text-ink-300">{p.builders.body}</p>
          <Link href="/transparency" className={LINK}>{p.builders.cta} →</Link>
        </section>
      </div>
    </FallbackScope>
    </PageShell>
  );
}
