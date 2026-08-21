"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useProgress } from "@react-three/drei";
import { canRunScene } from "@/lib/three/capability";
import { activeCardIndex, type PortfolioCard } from "@/lib/three/portfolio-cards";
import { notes } from "@/data/notes";
import type { SceneProgress } from "./ProtoScene";
import { MaterialHud, QuaternionHud, ScrambleText, ScrollRuler } from "./SceneHud";

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
      className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#050506] transition-opacity duration-500"
      style={{ opacity: active || !textOk ? 1 : 0, pointerEvents: "none" }}
    >
      {/* The reference opens by CONSTRUCTING its mark out of technical
          drafting lines around a glowing core, not by spinning a spinner —
          the loader is the first proof that this is a built thing. */}
      <svg viewBox="0 0 600 600" className="h-[62vmin] w-[62vmin]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="rgba(244,244,245,0.16)" strokeWidth="1">
          <circle cx="300" cy="300" r="232" />
          <circle cx="300" cy="300" r="150" />
          <path d="M0 300 H600 M300 0 V600" />
          <path d="M60 540 L300 30 L540 540" />
          <path d="M118 470 L300 118 L482 470" />
          <path d="M0 470 H600 M0 118 H600" />
        </g>
        {/* the Y mark, drawn as a construction */}
        <g stroke="rgba(244,244,245,0.85)" strokeWidth="3" strokeLinecap="square">
          <path d="M186 176 L300 330 L414 176" />
          <path d="M300 330 V452" />
        </g>
        <g stroke="rgba(160,190,255,0.5)" strokeWidth="1" strokeDasharray="3 9">
          <circle cx="300" cy="300" r="284" />
        </g>
      </svg>
      <div
        className="pointer-events-none absolute"
        style={{
          width: "16vmin",
          height: "16vmin",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 44% 40%, rgba(244,244,245,0.95) 0%, rgba(170,150,255,0.72) 24%, rgba(90,110,235,0.5) 46%, rgba(0,0,0,0) 74%)",
          filter: "blur(1px)",
          animation: "yl-breathe 2.2s ease-in-out infinite",
        }}
      />
      <div className="absolute bottom-[14vh] font-mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
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
  const [pageProgress, setPageProgress] = useState(0);
  const [section, setSection] = useState("GİRİŞ");
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
        const max = document.documentElement.scrollHeight - vh;
        const pp = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        setPageProgress(pp);
        setSection(fly < 0.6 ? "GİRİŞ" : pp > 0.86 ? "MANİFESTO" : "ÜRÜNLER");
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
      ) : null}
      {ready ? (
        <>
          <ScrollRuler label={section} progress={pageProgress} />
          <QuaternionHud />
          <MaterialHud visible={!bandOn} />
        </>
      ) : (
        <StaticFallback cards={cards} />
      )}

      {/* Scroll body — real DOM content, canvas is scenery behind it. */}
      <section ref={heroRef} className="relative z-10 h-screen">
        {/* Hero layout follows the reference: instrumentation bottom-left
            (MaterialHud), a dated NEWS column on the right, and the copy
            centered under the mark — nothing competing for bottom-left. */}
        <div className="absolute left-1/2 top-[70%] w-[min(88vw,540px)] -translate-x-1/2 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
            Ürün Laboratuvarı · Türkiye
          </div>
          <p className="mt-3 font-display text-[15px] font-light leading-normal text-ink-200">
            Yapay zeka ve veri odaklı, insanın hayatını sadeleştiren ürünler tasarlayan
            bağımsız bir ürün laboratuvarıdır.
          </p>
        </div>

        <div className="absolute bottom-24 right-6 hidden w-[300px] flex-col gap-4 md:flex md:right-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">Notlar</div>
          {notes.slice(0, 3).map((n) => (
            <div key={n.slug} className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.12em] text-ink-400">
                {n.date.replace(/-/g, ".")}
              </span>
              <span className="font-display text-[13px] leading-snug text-ink-200">{n.title.tr}</span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-11 right-6 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300 md:block md:right-12">
          8 ürün · 1 laboratuvar · TR 2025
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
          {/* Reference layout: date line, BIG title, tag chips bottom-left;
              "all works" bottom-right. */}
          <div
            className="mb-10 ml-6 mr-6 flex max-w-xl flex-col gap-3 transition-opacity duration-500 md:ml-12"
            style={{ opacity: bandOn && active ? 1 : 0 }}
            aria-hidden={!bandOn}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
              {active?.capturedAt ? `${active.capturedAt} · gerçek ekran görüntüsü` : "kayıt: ekran görüntüsü yok"}
            </div>
            <div className="font-grotesk text-4xl font-bold leading-none tracking-tightest text-ink-50 md:text-5xl">
              {active?.name}
            </div>
            <p className="max-w-md font-display text-sm font-light leading-normal text-ink-200">
              {active?.shortTr}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className="rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{
                  color: active?.lifecycle === "research" ? "#9A9AA3" : active?.brandPrimary,
                  borderColor: active?.lifecycle === "research" ? "rgba(255,255,255,0.25)" : `${active?.brandPrimary}66`,
                }}
              >
                {active?.statusTr}
              </span>
              <span className="rounded-full border border-hairline px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-300">
                {active?.screenshot ? "kayıtlı ekran" : active?.lifecycle === "research" ? "gerçek ekran yok" : "tipografik kart"}
              </span>
              <span className="rounded-full border border-hairline px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-300">
                {String(activeIdx + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div
            className="absolute bottom-10 right-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-100 transition-opacity duration-500 md:right-12"
            style={{ opacity: bandOn ? 1 : 0 }}
            aria-hidden={!bandOn}
          >
            Tüm ürünler ↗
          </div>
        </div>
      </section>

      {/* The white cut — the reel's sudden light "about" beat. Pure DOM over
          the canvas: content identical to the live /manifesto page, no new
          copy authored here. */}
      <section className="relative z-20 bg-ink-50 px-6 py-24 text-ink-900 md:px-12 md:py-32">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
            Manifesto
          </div>
          <h2 className="font-grotesk text-5xl font-medium leading-none tracking-tightest md:text-7xl">
            <ScrambleText text="Aceleyle değil," />
            <br />
            <ScrambleText text="özenle." />
          </h2>
          <p className="max-w-2xl font-display text-lg font-light leading-relaxed text-ink-600 md:text-xl">
            YULA Lab; trende değil, kanıta yaslanan bağımsız bir ürün laboratuvarı.
            Ürünlerimizin her biri aynı disiplinin farklı yüzü: insan hayatında ölçülebilir
            bir farkı, abartısız ve şeffaf bir tasarımla yaratmak.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">İsim</div>
              <p className="font-display text-sm leading-normal text-ink-600">
                Yula: yol gösteren ışık. Karanlıkta yön gösteren küçük ama güvenilir ışığın adı.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Disiplin</div>
              <p className="font-display text-sm leading-normal text-ink-600">
                Lab: deney, ölçüm, tekrar. Işık tutan ama gösteriş yapmayan bir çalışma biçimi.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Söz</div>
              <p className="font-display text-sm leading-normal text-ink-600">
                Sitedeki her rakam kaynağını ve doğrulanma tarihini taşır; süresi dolan iddia
                &quot;doğrulanmış&quot; gibi gösterilmez.
              </p>
            </div>
          </div>
          <Link href="/manifesto" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-900 underline underline-offset-4">
            Manifestonun tamamı ↗
          </Link>
        </div>
      </section>

      <footer className="relative z-20 overflow-hidden border-t border-hairline bg-[#050506] px-6 pb-10 pt-20 md:px-12">
        {/* Hanging drop-lines from the top edge — the reel's closing frame. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56">
          {[6, 11, 14, 19, 27, 33, 38, 46, 52, 58, 63, 71, 78, 84, 91].map((left, i) => (
            <span
              key={left}
              className="absolute top-0 w-[1px]"
              style={{
                left: `${left}%`,
                height: `${40 + ((i * 37) % 60)}%`,
                background: "linear-gradient(to bottom, rgba(244,244,245,0.42), rgba(244,244,245,0))",
              }}
            />
          ))}
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-14">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4">
              <span
                className="select-none font-grotesk text-7xl font-bold leading-none tracking-tightest md:text-9xl"
                style={{ color: "transparent", WebkitTextStroke: "1.5px rgba(244,244,245,0.6)" }}
              >
                YULA
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300">
                yol gösteren ışık · İstanbul
              </span>
            </div>
            <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Ürünler</div>
                <Link className="font-display text-sm text-ink-200" href="/projects/braavolabs">Braavolabs</Link>
                <Link className="font-display text-sm text-ink-200" href="/projects/burunfarki">Burun Farkı</Link>
                <Link className="font-display text-sm text-ink-200" href="/projects/lifeos">LifeOS</Link>
                <Link className="font-display text-sm text-ink-300" href="/projects">Tüm ürünler</Link>
              </div>
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Site</div>
                <Link className="font-display text-sm text-ink-200" href="/manifesto">Manifesto</Link>
                <Link className="font-display text-sm text-ink-200" href="/transparency">Şeffaflık</Link>
                <Link className="font-display text-sm text-ink-200" href="/notes">Notlar</Link>
                <Link className="font-display text-sm text-ink-200" href="/support">Destek</Link>
              </div>
              <div className="flex flex-col gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Hukuk</div>
                <Link className="font-display text-sm text-ink-200" href="/privacy">Gizlilik</Link>
                <Link className="font-display text-sm text-ink-200" href="/terms">Şartlar</Link>
                <Link className="font-display text-sm text-ink-200" href="/contact">İletişim</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-hairline pt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300 md:flex-row md:justify-between">
            <span>© 2026 YULA Lab · merhaba@yulalab.com</span>
            <span>kanıtsız iddia yayınlamayız</span>
          </div>
        </div>
      </footer>
    </>
  );
}
