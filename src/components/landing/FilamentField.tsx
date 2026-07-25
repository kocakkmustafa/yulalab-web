"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * The filament field: the emblem's own threads, spread across the page.
 *
 * Scattered and sparse at the top, they multiply and align as the page
 * scrolls, and land on a single anchor in the closing scene where the
 * emblem sits. The studio's story — scattered ideas, gathered products —
 * told by the brand mark instead of by copy.
 *
 * Cost model: every path's `d` is generated once and never recomputed.
 * Scroll only moves two registered custom properties (--p, --s) on this
 * container; each path derives its own transform / opacity / dash from
 * them via calc(). See the `@property` block in globals.css.
 */

const ANCHOR = 500; // viewBox units — paths all terminate here

type Filament = {
  d: string;
  layer: 0 | 1 | 2;
  /** scene progress at which this filament starts drawing */
  t: number;
  /** present from the very first scene, at low opacity */
  seed: boolean;
  theta: number;
  sc: number;
  w: number;
};

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic — the composition must be identical on every load and
 * between server and client, so no Math.random() and no Date-derived seed.
 */
function buildPaths(count: number): Filament[] {
  const rnd = mulberry32(20260725);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const out: Filament[] = [];

  for (let i = 0; i < count; i++) {
    const layer = (i % 3) as 0 | 1 | 2;
    // golden-angle spacing keeps starts from clumping without randomness
    const a = i * 2.39996 + 0.55;
    const r = 660 + rnd() * 560;
    const sx = ANCHOR + Math.cos(a) * r;
    // flattened ring: threads sweep in from the sides rather than radiating
    // like spokes, which is what the emblem's own filaments do
    const sy = ANCHOR + Math.sin(a) * r * 0.5;

    const px = -Math.sin(a);
    const py = Math.cos(a);
    // alternating sign pulls neighbours into tight parallel bundles
    const bundle = i % 2 ? 1 : -1;
    const jitter = (i % 5) * 26 + rnd() * 90;
    const om = bundle * (300 + jitter);
    const o1 = bundle * (340 + jitter * 1.2);
    const o2 = bundle * (150 + jitter * 0.5);

    const mx = L(sx, ANCHOR, 0.52) + px * om;
    const my = L(sy, ANCHOR, 0.52) + py * om;
    const c1x = L(sx, mx, 0.5) + px * o1;
    const c1y = L(sy, my, 0.5) + py * o1;
    const c2x = L(sx, mx, 0.86) + px * o2;
    const c2y = L(sy, my, 0.86) + py * o2;
    const c3x = L(mx, ANCHOR, 0.62) + px * o2 * 0.45;
    const c3y = L(my, ANCHOR, 0.62) + py * o2 * 0.45;

    const d =
      `M${sx.toFixed(1)},${sy.toFixed(1)}` +
      `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}` +
      `S${c3x.toFixed(1)},${c3y.toFixed(1)} ${ANCHOR},${ANCHOR}`;

    // the first eight are always on screen — the opening scene shows a few
    // threads, not an empty void
    const seed = i < 8;
    // 0.58 max start, against a 2.6 draw rate, still reaches full at p=1
    const t = seed ? 0 : (i / count) * 0.58;

    out.push({
      d,
      layer,
      t,
      seed,
      theta: (rnd() - 0.5) * 34,
      sc: 0.12 + rnd() * 0.26,
      w: layer === 0 ? 1.05 : layer === 1 ? 0.8 : 0.5 + rnd() * 0.2,
    });

    // every fourth thread splits — the branching in the emblem artwork
    if (i % 4 === 1) {
      const b1x = L(mx, ANCHOR, 0.35) - px * 190;
      const b1y = L(my, ANCHOR, 0.35) - py * 190;
      const b2x = L(mx, ANCHOR, 0.75) - px * 90;
      const b2y = L(my, ANCHOR, 0.75) - py * 90;
      out.push({
        d:
          `M${mx.toFixed(1)},${my.toFixed(1)}` +
          `C${b1x.toFixed(1)},${b1y.toFixed(1)} ${b2x.toFixed(1)},${b2y.toFixed(1)} ${ANCHOR},${ANCHOR}`,
        layer,
        t: Math.min(t + 0.05, 0.6),
        seed: false,
        theta: (rnd() - 0.5) * 44,
        sc: 0.1 + rnd() * 0.26,
        w: layer === 0 ? 1.2 : 0.75,
      });
    }
  }
  return out;
}

type PassMode = "halo" | "body" | "core";

function Strand({
  paths,
  keyBase,
  color,
  mult,
  mode,
}: {
  paths: Filament[];
  keyBase: string;
  color: string;
  mult: number;
  mode: PassMode;
}) {
  return (
    <>
      {paths.map((p, i) => {
        const floorO = p.seed ? "0.16" : "0";
        const grow = `clamp(${p.seed ? "0.62" : "0"}, calc((var(--p) - ${p.t.toFixed(3)}) * 2.6), 1)`;
        // pathLength=100 normalises every path, so these "px" dash values
        // are really percentages of the run
        const dash =
          mode === "core"
            ? // the bright core is inset along the run, giving tapered tips
              { strokeDasharray: `calc(70px * ${grow}) 1000px`, strokeDashoffset: "-15px" }
            : { strokeDasharray: "100px", strokeDashoffset: `calc(100px * (1 - ${grow}))` };

        return (
          <g
            key={keyBase + i}
            style={{
              transformBox: "view-box",
              transformOrigin: `${ANCHOR}px ${ANCHOR}px`,
              transform: `rotate(calc(var(--s) * ${p.theta.toFixed(2)}deg)) scale(calc(1 + var(--s) * ${p.sc.toFixed(3)}))`,
              opacity: `clamp(${floorO}, calc((var(--p) - ${p.t.toFixed(3)}) * 4), 1)`,
            }}
          >
            <path
              d={p.d}
              fill="none"
              stroke={color}
              strokeWidth={(p.w * mult).toFixed(2)}
              strokeLinecap="round"
              pathLength={100}
              style={dash}
            />
          </g>
        );
      })}
    </>
  );
}

export function FilamentField({ density = 32 }: { density?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const paths = useMemo(() => buildPaths(density), [density]);

  const far = paths.filter((p) => p.layer === 0);
  const mid = paths.filter((p) => p.layer === 1);
  const near = paths.filter((p) => p.layer === 2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // a still, mid-density composition — deliberate, not half-drawn
      el.style.setProperty("--p", "0.62");
      el.style.setProperty("--s", "0.28");
      return;
    }

    let end = 1;
    let measuredHeight = 0;
    let raf = 0;

    /**
     * CSS.supports() is not sufficient: a browser can support scroll()
     * timelines and still leave the timeline inactive (currentTime null)
     * when the scroller is degenerate, in which case the animation never
     * applies and the field silently stays blank. Probe the real thing.
     */
    const timelineLive = () => {
      if (!CSS.supports?.("animation-timeline", "scroll()")) return false;
      const anims = el.getAnimations?.() ?? [];
      return anims.some((a) => a.timeline && a.timeline.currentTime !== null);
    };
    let cssDriven = false;

    const measure = () => {
      // progress hits 1 exactly when the closing emblem reaches centre screen
      const vh = window.innerHeight || 1;
      const doc = document.documentElement;
      let e = Math.max(1, (doc.scrollHeight || 1) - vh);
      const orb = document.getElementById("yl-orb");
      if (orb) {
        const r = orb.getBoundingClientRect();
        const target = r.top + window.scrollY + r.height / 2 - vh / 2;
        if (target > vh * 0.5) e = target;
      }
      end = e;
      measuredHeight = doc.scrollHeight;

      if (cssDriven) {
        const tail = Math.max(0, doc.scrollHeight - vh - end);
        // setProperty rather than the typed accessors: animation-timeline /
        // animation-range are newer than the DOM lib's CSSStyleDeclaration
        el.style.animation = "ylFilament 1s linear both";
        el.style.setProperty("animation-timeline", "scroll(root block)");
        el.style.setProperty("animation-range", `0px calc(100% - ${Math.round(tail)}px)`);
      }
    };

    const drive = () => {
      // fonts, images and reveals all change page height, which invalidates
      // where convergence should land
      if (Math.abs(document.documentElement.scrollHeight - measuredHeight) > 24) measure();
      if (cssDriven) return; // CSS owns --p/--s
      const p = Math.max(0, Math.min((window.scrollY || 0) / (end || 1), 1));
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--s", Math.pow(1 - p, 1.6).toFixed(4));
    };

    // arm the CSS path first, then check whether it actually took
    cssDriven = CSS.supports?.("animation-timeline", "scroll()") ?? false;
    measure();
    if (cssDriven && !timelineLive()) {
      cssDriven = false;
      el.style.animation = "none";
      measure();
    }
    drive();

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        drive();
      });
    };
    const onResize = () => {
      measure();
      drive();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [density]);

  // three passes per depth: soft halo, mid body, thin bright core
  const strand = (arr: Filament[], key: string, par: number, scale: number, dim: number) => (
    <>
      {(
        [
          ["h", "#2A6E7A", 3.4 * scale, 4, 0.42 * dim, "screen", "halo"],
          ["b", "#4FA8B8", 1.1 * scale, 0.3, 0.66 * dim, "screen", "body"],
          ["c", "#B8F0F5", 0.42 * scale, 0, 1 * dim, "plus-lighter", "core"],
        ] as const
      ).map(([suffix, color, mult, blur, opacity, blend, mode]) => (
        <g
          key={key + suffix}
          style={{
            transformBox: "view-box",
            transformOrigin: `${ANCHOR}px ${ANCHOR}px`,
            transform: `translateY(calc(var(--p) * ${par}px))`,
            filter: blur ? `blur(${blur}px)` : "none",
            opacity,
            mixBlendMode: blend as React.CSSProperties["mixBlendMode"],
          }}
        >
          <Strand paths={arr} keyBase={key + suffix} color={color} mult={mult} mode={mode} />
        </g>
      ))}
    </>
  );

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", contain: "strict" }}
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          {/* fades the field out at the edges so threads never end in a
              hard clip against the viewport border */}
          <radialGradient id="ylFade" cx="50%" cy="50%" r="52%">
            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <stop offset="48%" stopColor="#fff" stopOpacity={0.85} />
            <stop offset="80%" stopColor="#fff" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          <mask id="ylMask">
            <rect x={-200} y={-200} width={1400} height={1400} fill="url(#ylFade)" />
          </mask>
        </defs>
        <g mask="url(#ylMask)">
          <g style={{ filter: "blur(2.6px)" }}>{strand(far, "f", 24, 1.25, 0.5)}</g>
          {strand(mid, "m", -12, 1, 0.78)}
          {strand(near, "n", -32, 0.82, 1)}
        </g>
      </svg>
    </div>
  );
}
