import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell, PageHeader } from "@/components/common/PageShell";
import { copyFor } from "@/components/prototype/copy";
import { GATES } from "@/components/prototype/gates";
import { assertPrototypeEnabled, PROTOTYPE_ROBOTS } from "@/components/prototype/gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start (prototype)", robots: PROTOTYPE_ROBOTS };

export default async function PrototypeStartPage({ params }: { params: Promise<{ locale: string }> }) {
  assertPrototypeEnabled();
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copyFor(locale);

  return (
    <PageShell>
      <PageHeader kicker={`${c.start.kicker} · ${c.protoNote}`} title={c.start.title} lede={c.start.lede} />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GATES.map((g) => {
          const copy = c.start.gates[g.id];
          return (
            <li key={g.id} className="rounded-2xl border border-hairline bg-surface p-6">
              <h2 className="font-display text-2xl font-light tracking-tight">{copy.title}</h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-400">
                {c.start.forWho}: {copy.who}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">{copy.body}</p>
              <Link href={g.href} className="focusable mt-6 inline-flex min-h-[44px] items-center underline underline-offset-4">
                {copy.cta} →
              </Link>
              {g.extra.map((x) =>
                x.href.startsWith("mailto:") ? (
                  <a key={x.key} href={x.href} className="focusable mt-1 flex min-h-[44px] items-center text-sm underline underline-offset-4 [overflow-wrap:anywhere]">
                    {c.start[x.key]}
                  </a>
                ) : (
                  <Link key={x.key} href={x.href} className="focusable mt-1 flex min-h-[44px] items-center text-sm underline underline-offset-4">
                    {c.start[x.key]}
                  </Link>
                ),
              )}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
