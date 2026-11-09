import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PageShell, PageHeader } from "@/components/common/PageShell";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { FallbackScope } from "@/components/prototype/FallbackScope";
import { copyFor } from "@/components/prototype/copy";
import { assertPrototypeEnabled, PROTOTYPE_ROBOTS } from "@/components/prototype/gate";
import { UniverseExplorer } from "@/components/prototype/UniverseExplorer";
import { buildUniverse, parseFilter } from "@/components/prototype/universe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products (prototype)", robots: PROTOTYPE_ROBOTS };

export default async function PrototypeProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ katman?: string; durum?: string }>;
}) {
  assertPrototypeEnabled();
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const c = copyFor(locale);
  const entries = buildUniverse(publicRegistry, projects, locale);

  return (
    <PageShell>
      <FallbackScope locale={locale}>
      <PageHeader kicker={`${c.universe.kicker} · ${c.protoNote}`} title={c.universe.title} lede={c.universe.lede} />
      <UniverseExplorer
        entries={entries}
        locale={locale}
        initialFilter={parseFilter(sp.durum)}
        initialSlug={entries.some((e) => e.slug === sp.katman) ? sp.katman : undefined}
      />
    </FallbackScope>
    </PageShell>
  );
}
