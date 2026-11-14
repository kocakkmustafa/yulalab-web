"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { OstinatoDemoText } from "@/components/projects/OstinatoDemoArea";
import { nearestBeat, rateDeviation, scoreRound, type Rating, type RoundScore } from "@/components/projects/ostinato-rhythm-scoring";

/**
 * WEB-P1-02 rhythm feel try-out. Touch/keyboard tapping is the primary path;
 * the microphone is an optional second input and only asked for when the
 * visitor presses its button. Denied or unavailable = stay on tapping, no
 * message. No network, no storage; microphone audio is analysed in memory for
 * loudness only and never recorded or sent.
 */
export const BEAT_MS = 700;
export const COUNT_IN = 4;
export const SCORED = 8;
const LEAD_S = 0.15;

type Phase = "idle" | "running" | "done";
type Last = { rating: Rating; deviationMs: number } | "countin" | null;
type Ctx = AudioContext;
type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };

/** Event time on the performance clock; falls back to now when the event clock is not on it. */
const eventTime = (e: { timeStamp: number }) => {
  const now = performance.now();
  return Math.abs(e.timeStamp - now) < 1000 ? e.timeStamp : now;
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

const BTN =
  "min-h-12 px-5 py-3 rounded-xl border-2 text-start font-grotesk text-[15.5px] leading-[1.4] text-ink-50 " +
  "border-[color:var(--yula-hairline-strong)] bg-transparent " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--yula-focus)]";

export default function OstinatoRhythmDemo({ text }: { text: OstinatoDemoText }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [beatOn, setBeatOn] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [last, setLast] = useState<Last>(null);
  const [result, setResult] = useState<RoundScore | null>(null);
  const [announce, setAnnounce] = useState("");
  const [micAvailable, setMicAvailable] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const ctx = useRef<Ctx | null>(null);
  const beats = useRef<number[]>([]);
  const taps = useRef<number[]>([]);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const stream = useRef<MediaStream | null>(null);
  const tapBtn = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setMicAvailable(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const stopMic = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  }, []);
  useEffect(
    () => () => {
      clearTimers();
      stopMic();
      void ctx.current?.close().catch(() => {});
    },
    [stopMic],
  );

  const ensureCtx = (): Ctx | null => {
    if (ctx.current) return ctx.current;
    const Ac = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
    if (!Ac) return null;
    try {
      ctx.current = new Ac();
    } catch {
      return null;
    }
    return ctx.current;
  };

  const registerTap = useCallback((at: number) => {
    if (phaseRef.current !== "running") return;
    const hit = nearestBeat(at, beats.current);
    if (!hit) return;
    if (hit.index < COUNT_IN) {
      setLast("countin");
      return;
    }
    taps.current.push(at);
    setLast({ rating: rateDeviation(hit.deviationMs), deviationMs: Math.round(hit.deviationMs) });
  }, []);

  const finish = useCallback(() => {
    phaseRef.current = "done";
    const score = scoreRound(taps.current, beats.current.slice(COUNT_IN));
    setResult(score);
    setPhase("done");
    setBeatOn(false);
    setAnnounce(
      fill(text.announceDone, {
        summary: fill(text.summary, { perfect: score.perfect, good: score.good, miss: score.miss }),
        accuracy: fill(text.accuracy, { pct: score.accuracyPct }),
      }),
    );
  }, [text]);

  const start = () => {
    const ac = ensureCtx();
    clearTimers();
    taps.current = [];
    setResult(null);
    setLast(null);
    setCountIn(true);
    void ac?.resume().catch(() => {});
    const lat = ac ? (ac.outputLatency || ac.baseLatency || 0) * 1000 : 0;
    const audioNow = ac ? ac.currentTime : 0;
    const perfNow = performance.now();
    const first = perfNow + LEAD_S * 1000 + lat;
    beats.current = Array.from({ length: COUNT_IN + SCORED }, (_, k) => first + k * BEAT_MS);
    beats.current.forEach((when, k) => {
      if (ac) {
        try {
        const t0 = audioNow + LEAD_S + (k * BEAT_MS) / 1000;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.frequency.value = k < COUNT_IN ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.1);
        } catch {
          // Sound is best effort; the visual beat and scoring still run.
        }
      }
      const delay = Math.max(0, when - performance.now());
      timers.current.push(
        window.setTimeout(() => {
          setBeatOn(true);
          if (k >= COUNT_IN) setCountIn(false);
        }, delay),
        window.setTimeout(() => setBeatOn(false), delay + 120),
      );
    });
    const end = beats.current[beats.current.length - 1] - performance.now() + BEAT_MS / 2 + 60;
    timers.current.push(window.setTimeout(finish, end));
    phaseRef.current = "running";
    setPhase("running");
    setAnnounce(text.running);
  };

  // Focus management: tap button when the round starts, result heading when it ends.
  useEffect(() => {
    if (phase === "running") tapBtn.current?.focus();
    if (phase === "done") resultHeading.current?.focus();
  }, [phase]);

  // Keyboard: Space/Enter tap on keydown (not repeat); the synthetic click is
  // suppressed so one press is one tap. Pointer taps use pointerdown for low latency.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) registerTap(eventTime(e));
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " ") e.preventDefault();
  };

  // Optional microphone: loudness onsets count as taps. Only after the visitor opts in.
  const micTimer = useRef<number | null>(null);
  const toggleMic = async () => {
    if (micOn) {
      stopMic();
      setMicOn(false);
      return;
    }
    const ac = ensureCtx();
    if (!ac) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      void ac.resume().catch(() => {});
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      ac.createMediaStreamSource(s).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let avg = 0.01;
      let armed = true;
      let lastOnset = 0;
      if (micTimer.current) window.clearInterval(micTimer.current);
      micTimer.current = window.setInterval(() => {
        if (!stream.current) {
          if (micTimer.current) window.clearInterval(micTimer.current);
          return;
        }
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (armed && rms > Math.max(0.08, avg * 3) && now - lastOnset > 150) {
          armed = false;
          lastOnset = now;
          registerTap(now);
        } else if (rms < Math.max(0.04, avg * 1.5)) {
          armed = true;
        }
        avg = avg * 0.97 + rms * 0.03;
      }, 12);
      setMicOn(true);
    } catch {
      // Denied or unavailable: stay on tapping, silently.
      stopMic();
    }
  };
  useEffect(
    () => () => {
      if (micTimer.current) window.clearInterval(micTimer.current);
    },
    [],
  );

  const dev = (l: Exclude<Last, "countin" | null>) =>
    fill(l.deviationMs < 0 ? text.early : text.late, { ms: Math.abs(l.deviationMs) });

  return (
    <div data-testid="ostinato-rhythm-body" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        {phase !== "running" ? (
          <button type="button" onClick={start} data-testid="rhythm-start" className={BTN}>
            {phase === "done" ? text.restart : text.start}
          </button>
        ) : null}
        {micAvailable ? (
          <button type="button" aria-pressed={micOn} onClick={() => void toggleMic()} data-testid="rhythm-mic" className={BTN + (micOn ? " font-semibold underline decoration-2 underline-offset-4" : "")}>
            {text.micLabel}
          </button>
        ) : null}
      </div>
      {micOn ? <p className="max-w-[60ch] text-[15.5px] leading-[1.6] text-ink-50" data-testid="rhythm-mic-on">{text.micOn}</p> : null}
      <p className="max-w-[60ch] text-[14.5px] leading-[1.6] text-ink-300">{text.micNote}</p>

      {phase === "running" ? (
        <div className="flex flex-col items-start gap-4" data-testid="rhythm-stage">
          <span
            aria-hidden="true"
            data-testid="rhythm-pulse"
            data-on={beatOn ? "1" : "0"}
            className={
              "inline-block h-6 w-6 rounded-full border-2 border-[color:var(--yula-hairline-strong)] " +
              (beatOn ? "bg-[color:var(--yula-focus)] motion-safe:scale-125" : "bg-transparent")
            }
          />
          <button
            ref={tapBtn}
            type="button"
            data-testid="rhythm-tap"
            aria-describedby="ostinato-rhythm-hint"
            onPointerDown={(e) => {
              e.preventDefault();
              tapBtn.current?.focus();
              registerTap(eventTime(e));
            }}
            onClick={(e) => e.preventDefault()}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            className={BTN + " w-full sm:w-80 min-h-28 text-center text-[18px] touch-manipulation select-none"}
          >
            {text.tapButton}
          </button>
          <p id="ostinato-rhythm-hint" className="text-[14.5px] leading-[1.6] text-ink-300">
            {countIn ? text.countIn : text.tapHint}
          </p>
          <p aria-hidden="true" data-testid="rhythm-last" className="min-h-6 text-[15.5px] text-ink-50">
            {last === "countin" ? text.countIn : last ? `${text.last}: ${text[last.rating]}, ${dev(last)}` : ""}
          </p>
        </div>
      ) : null}

      {phase === "done" && result ? (
        <div data-testid="rhythm-result" className="max-w-[60ch] rounded-xl border border-[color:var(--yula-hairline-strong)] px-4 py-4">
          <h3 ref={resultHeading} tabIndex={-1} className="font-display text-[22px] mb-3 text-ink-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--yula-focus)]">
            {text.resultHeading}
          </h3>
          <p data-testid="rhythm-accuracy" className="text-[17px] text-ink-50 mb-1">{fill(text.accuracy, { pct: result.accuracyPct })}</p>
          <p data-testid="rhythm-summary" className="text-[15.5px] text-ink-300">{fill(text.summary, { perfect: result.perfect, good: result.good, miss: result.miss })}</p>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite" data-testid="rhythm-announce">{announce}</p>
    </div>
  );
}
