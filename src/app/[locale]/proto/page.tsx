import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Hero3D from "@/components/three/Hero3D";

/**
 * 3D redesign PROTOTYPE route (feat/3d-redesign branch).
 *
 * Exists so the founder can judge the real WebGL fidelity in a browser
 * before any of this touches the shipped pages. Deliberately noindex and
 * unlinked; the copy below is the REAL landing copy (messages/tr.json
 * landing.*), not new marketing text — this route previews a rendering,
 * not new claims.
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

  return (
    <main data-proto-3d className="relative h-screen w-full overflow-hidden bg-ink-900 text-ink-50">
      {/* Prototype-only: the [locale] layout's global Header/Footer would
          double up with this scene's own chrome. Scoped via :has so no
          shared component changes leak out of this route. */}
      <style>{`body:has(main[data-proto-3d]) > header, body:has(main[data-proto-3d]) > footer, body:has(main[data-proto-3d]) > div > header, body:has(main[data-proto-3d]) > div > footer { display: none; }`}</style>
      {/* Scenery layer (canvas or static fallback). */}
      <Hero3D />

      {/* Real content layer — DOM, selectable, indexable-if-ever-shipped. */}
      <h1 className="sr-only">YULA Lab — bağımsız AI ürün laboratuvarı</h1>

      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-12 py-7">
        <div className="flex items-baseline gap-2.5">
          <span className="font-grotesk text-xl font-bold tracking-tightest">YULA</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">LAB</span>
        </div>
        <nav className="flex items-center gap-9 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className="text-ink-200">Ürünler</span>
          <span className="text-ink-200">Manifesto</span>
          <span className="text-ink-200">Şeffaflık</span>
          <span className="text-ink-200">Notlar</span>
        </nav>
        <span className="rounded-full border border-hairline-strong px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em]">
          İletişim ↗
        </span>
      </header>

      <div className="absolute bottom-11 left-12 z-40 flex max-w-sm flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
          Ürün Laboratuvarı · Türkiye
        </div>
        <p className="font-display text-[17px] font-light leading-normal text-ink-200">
          Yapay zeka ve veri odaklı, insanın hayatını sadeleştiren ürünler tasarlayan bağımsız
          bir ürün laboratuvarıdır.
        </p>
      </div>

      <div className="absolute bottom-11 right-12 z-40 flex flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
        <span>8 ürün · 1 laboratuvar</span>
        <span>TR · 2025</span>
      </div>

      <div className="absolute bottom-7 left-1/2 z-40 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
        Kaydır
      </div>
    </main>
  );
}
