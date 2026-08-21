"use client";

import { useEffect, useRef, useState } from "react";
import { telemetry } from "./ProtoScene";

/**
 * The reference site keeps its instrumentation ON SCREEN — a scroll ruler
 * down the left edge, a live quaternion readout with an orientation gizmo
 * top-right, and the glass material's parameters bottom-left. It reads as
 * "you are looking at the real thing, not a render", which is exactly this
 * site's thesis, so the HUD is honest here rather than decorative: every
 * number below is the actual live value driving the scene.
 *
 * Updated from a rAF loop against a mutable telemetry object — React state
 * at 60fps would re-render the page every frame.
 */

/** Left edge: scroll ruler with the current section's label. */
export function ScrollRuler({ label, progress }: { label: string; progress: number }) {
  const ticks = Array.from({ length: 26 });
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-3 top-0 z-40 hidden h-screen flex-col justify-center gap-[6px] md:flex"
    >
      {ticks.map((_, i) => {
        const at = i / (ticks.length - 1);
        const active = Math.abs(at - progress) < 0.045;
        return (
          <div
            key={i}
            className="transition-all duration-200"
            style={{
              width: active ? 18 : i % 5 === 0 ? 12 : 7,
              height: 1,
              background: active ? "#F4F4F5" : "rgba(244,244,245,0.28)",
            }}
          />
        );
      })}
      <div
        className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-300"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </div>
    </div>
  );
}

/** Top-right: live quaternion of the glass body + an orientation gizmo. */
export function QuaternionHud() {
  const [q, setQ] = useState({ x: 0, y: 0, z: 0, w: 1 });
  const ball = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // 10Hz for the digits — 60Hz text updates are unreadable anyway and
      // would thrash the DOM; the gizmo itself stays at frame rate.
      if (t - last > 100) {
        last = t;
        setQ({ x: telemetry.qx, y: telemetry.qy, z: telemetry.qz, w: telemetry.qw });
      }
      if (ball.current) {
        const { qx, qy, qz, qw } = telemetry;
        ball.current.style.transform = `rotate3d(${qx || 0}, ${qy || 0}, ${qz || 0}, ${
          2 * Math.acos(Math.min(1, Math.abs(qw)))
        }rad)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fmt = (n: number) => (n < 0 ? "" : " ") + n.toFixed(2).replace("0.", ".");

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-6 top-24 z-40 hidden flex-col items-end gap-3 md:flex"
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-300">
        Cam gövde · quaternion
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums tracking-[0.1em] text-ink-200">
        <span className="inline-block h-2 w-2 rounded-full bg-ink-100" />
        <span>{fmt(q.x)}</span>
        <span>{fmt(q.y)}</span>
        <span>{fmt(q.z)}</span>
        <span>{fmt(q.w)}</span>
      </div>
      <div
        className="relative mt-1 h-16 w-16 rounded-full border border-hairline"
        style={{ perspective: "180px" }}
      >
        <div ref={ball} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          <span className="absolute left-1/2 top-1/2 h-[1px] w-14 -translate-x-1/2 -translate-y-1/2 bg-[#FF5C7A]" />
          <span
            className="absolute left-1/2 top-1/2 h-[1px] w-14 -translate-x-1/2 -translate-y-1/2 bg-[#6EE7C8]"
            style={{ transform: "translate(-50%,-50%) rotateZ(90deg)" }}
          />
          <span
            className="absolute left-1/2 top-1/2 h-[1px] w-14 -translate-x-1/2 -translate-y-1/2 bg-[#7AA2FF]"
            style={{ transform: "translate(-50%,-50%) rotateY(90deg)" }}
          />
        </div>
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
        Sürekli dönüş
      </div>
    </div>
  );
}

/** Bottom-left (hero beat): the glass material's real parameters. */
export function MaterialHud({ visible }: { visible: boolean }) {
  const rows: [string, string][] = [
    ["roughness", telemetry.roughness.toFixed(2)],
    ["ior", telemetry.ior.toFixed(2)],
    ["transmission", "1.00"],
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-8 left-16 z-40 hidden flex-col gap-2 transition-opacity duration-500 md:flex"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
        Cam gövde · materyal
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-24 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-300">{k}</span>
          <span className="h-[1px] w-16 bg-hairline" />
          <span className="font-mono text-[10px] tabular-nums text-ink-200">{v}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Scramble-in headline (the reel's about text resolves out of noise).
 * Runs once when it first enters the viewport, and is skipped outright
 * under prefers-reduced-motion — the final text is the initial state
 * there, never a puzzle the reader has to wait out.
 */
export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;

    const glyphs = "ABCDEFGHIJKLMNOPRSTUVYZ0123456789#%&/";
    let frame = 0;
    let raf = 0;

    const run = () => {
      const total = 34;
      frame += 1;
      const revealed = Math.floor((frame / total) * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => {
            if (i < revealed || ch === " " || ch === "\n") return ch;
            return glyphs[Math.floor(((frame * 7 + i * 13) % glyphs.length))];
          })
          .join(""),
      );
      if (frame < total) raf = requestAnimationFrame(run);
      else setShown(text);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !done.current) {
            done.current = true;
            raf = requestAnimationFrame(run);
            io.unobserve(node);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}
