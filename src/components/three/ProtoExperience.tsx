"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useProgress } from "@react-three/drei";
import { canRunScene } from "@/lib/three/capability";
import { activeCardIndex, type PortfolioCard } from "@/lib/three/portfolio-cards";
import type { SceneProgress } from "./ProtoScene";

const ProtoScene = dynamic(() => import("./ProtoScene"), { ssr: false });

function LoaderOverlay({ textReady }: { textReady: boolean }) {
  const { progress, active } = useProgress();
  const [gone, setGone] = useState(false);

  // Two readiness signals: useProgress covers THREE's manager; textReady
  // covers troika, which typesets OFF the manager (measured: manager-only
  // dismissed onto seconds of black scene). textReady additionally gets a
  // hard 6s cap — a hung font sync must degrade to "scene without the
  // word", never hold the whole page behind the loader forever.
  const [textDeadline, setTextDeadline] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTextDeadline(true), 6000);
    return () => clearTimeout(t);
  }, []);
  const textOk = textReady || textDeadline;
  useEffect(() => {
    if (active || !textOk) return;
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [active, textOk]);

  if (gone) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-[18px] bg-[#050506] transition-opacity duration-500"
      style={{ opacity: active || !textOk ? 1 : 0, pointerEvents: "none" }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 44% 40%, rgba(244,244,245,0.95) 0%, rgba(170,150,255,0.7) 26%, rgba(90,110,235,0.5) 48%, rgba(0,0,0,0) 74%)",
          filter: "blur(1px)",
          animation: "yl-breathe 2.2s ease-in-out infinite",
        }}
      />
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
        {active ? `%${Math.round(progress)} — ` : ""}sahne yükleniyor
      </div>
      <style>{`@keyframes yl-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }`}</style>
    </div>
  );
}

/** Static-branch card list — same content, no motion, no canvas. */
function StaticFallback({ cards }: { cards: PortfolioCard[] }) {
  return (
    <div aria-hidden className="fixed inset-0 bg-ink-900">
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.045) 0 1px, transparent 1px 96px), repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0 1px, transparent 1px 96px)",
          maskImage: "radial-gradient(75% 70% at 50% 46%, #000 38%, transparent 84%)",
          WebkitMaskImage: "radial-gradient(75% 70% at 50% 46%, #000 38%, transparent 84%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="select-none font-grotesk text-[19vw] font-bold leading-none tracking-tightest text-ink-50">
          YULA
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-10 flex flex-wrap justify-center gap-x-5 gap-y-2 px-6">
        {cards.map((c) => (
          <span key={c.slug} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
            {c.name} · {c.statusTr}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The scroll body + fixed scene. DOM sections own the scroll length; a
 * passive listener writes progress into a ref the scene reads per frame
 * (scrolling never re-renders React), and only the focused-card INDEX is
 * React state so the info panel updates exactly when the focus changes.
 */
export default function ProtoExperience({ cards }: { cards: PortfolioCard[] }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [textReady, setTextReady] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [bandOn, setBandOn] = useState(false);
  const progress = useRef<SceneProgress>({ fly: 0, band: 0 });
  const bandRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setReady(canRunScene());
  }, []);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const hero = heroRef.current?.getBoundingClientRect();
        const band = bandRef.current?.getBoundingClientRect();
        // fly: how far the hero section has been scrolled out of view.
        const fly = hero ? Math.min(1, Math.max(0, -hero.top / (hero.height || vh))) : 0;
        // band: progress through the band section's scrollable extent.
        const bandP = band
          ? Math.min(1, Math.max(0, -band.top / Math.max(1, band.height - vh)))
          : 0;
        progress.current.fly = fly;
        progress.current.band = bandP;
        setActiveIdx(activeCardIndex(bandP, cards.length));
        setBandOn(fly >= 1);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ready, cards.length]);

  const active = cards[activeIdx];

  return (
    <>
      {/* Scenery layer. */}
      {ready ? (
        <div className="fixed inset-0">
          <ProtoScene cards={cards} progress={progress} onTextReady={() => setTextReady(true)} />
          <LoaderOverlay textReady={textReady} />
        </div>
      ) : (
        <StaticFallback cards={cards} />
      )}

      {/* Scroll body — real DOM content, canvas is scenery behind it. */}
      <section ref={heroRef} className="relative z-10 h-screen">
        <div className="absolute bottom-11 left-6 flex max-w-sm flex-col gap-3 md:left-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
            Ürün Laboratuvarı · Türkiye
          </div>
          <p className="font-display text-[15px] font-light leading-normal text-ink-200 md:text-[17px]">
            Yapay zeka ve veri odaklı, insanın hayatını sadeleştiren ürünler tasarlayan
            bağımsız bir ürün laboratuvarıdır.
          </p>
        </div>
        <div className="absolute bottom-11 right-12 hidden flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300 md:flex">
          <span>8 ürün · 1 laboratuvar</span>
          <span>TR · 2025</span>
        </div>
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
          Kaydır
        </div>
      </section>

      <section ref={bandRef} className="relative z-10" style={{ height: `${cards.length * 62}vh` }}>
        {/* Snap sentinels: one per card, so releasing the wheel between two
            cards settles the camera ON one (proximity, not mandatory — the
            hero and tail stay free-scrolling). */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {cards.map((c) => (
            <div key={c.slug} style={{ height: `${62}vh`, scrollSnapAlign: "center" }} />
          ))}
        </div>
        <div className="pointer-events-none sticky top-0 flex h-screen items-end">
          {/* Focused-card panel: real DOM, updates with the same index the
              scene lights. Content comes from the registry mapping, so a
              research product can never present itself as shipped here. */}
          <div
            className="mb-11 ml-6 flex max-w-md flex-col gap-2 transition-opacity duration-500 md:ml-12"
            style={{ opacity: bandOn && active ? 1 : 0 }}
            aria-hidden={!bandOn}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-grotesk text-2xl font-bold tracking-tightest text-ink-50">
                {active?.name}
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: active?.lifecycle === "research" ? "#9A9AA3" : active?.brandPrimary }}
              >
                {active?.statusTr}
              </span>
            </div>
            <p className="font-display text-sm font-light leading-normal text-ink-200">
              {active?.shortTr}
            </p>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-300">
              {active?.screenshot
                ? `gerçek ekran görüntüsü · ${active.capturedAt}`
                : active?.lifecycle === "research"
                  ? "araştırma — gerçek ekran görüntüsü yok"
                  : "kayıtlı ekran görüntüsü yok — tipografik kart"}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
              {String(activeIdx + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 flex h-[50vh] items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
          prototip sonu — tüm ürünler /projects altında
        </span>
      </section>
    </>
  );
}
