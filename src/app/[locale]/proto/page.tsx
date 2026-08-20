import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ProtoExperience from "@/components/three/ProtoExperience";
import { buildPortfolioCards } from "@/lib/three/portfolio-cards";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";

/**
 * 3D redesign PROTOTYPE route (feat/3d-redesign branch).
 *
 * Exists so the founder can judge the real WebGL fidelity in a browser
 * before any of this touches the shipped pages. Deliberately noindex and
 * unlinked; all copy is the REAL landing/registry content — this route
 * previews a rendering, not new claims.
 */
export const metadata: Metadata = {
  title: "3D Prototip",
  robots: { index: false, follow: false },
};

export default async function ProtoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Server-side, from the same single source of truth the shipped pages
  // use — the scene cannot drift from the registry.
  const cards = buildPortfolioCards(publicRegistry, projects);

  return (
    <main data-proto-3d className="relative bg-ink-900 text-ink-50">
      {/* Prototype-only: the [locale] layout's global Header/Footer would
          double up with this scene's own chrome. Scoped via :has so no
          shared component changes leak out of this route. */}
      <style>{`html:has(main[data-proto-3d]) { scroll-snap-type: y proximity; } body:has(main[data-proto-3d]) > header, body:has(main[data-proto-3d]) > footer, body:has(main[data-proto-3d]) > div > header, body:has(main[data-proto-3d]) > div > footer { display: none; }`}</style>

      <h1 className="sr-only">YULA Lab — bağımsız AI ürün laboratuvarı</h1>

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12 md:py-7">
        <div className="flex items-baseline gap-2.5">
          <span className="font-grotesk text-xl font-bold tracking-tightest">YULA</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">LAB</span>
        </div>
        <nav className="hidden items-center gap-9 font-mono text-[11px] uppercase tracking-[0.14em] md:flex">
          <span className="text-ink-200">Ürünler</span>
          <span className="text-ink-200">Manifesto</span>
          <span className="text-ink-200">Şeffaflık</span>
          <span className="text-ink-200">Notlar</span>
        </nav>
        <span className="rounded-full border border-hairline-strong px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em]">
          İletişim ↗
        </span>
      </header>

      <ProtoExperience cards={cards} />
    </main>
  );
}
