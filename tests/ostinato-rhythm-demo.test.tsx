// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import OstinatoRhythmDemo, { BEAT_MS, COUNT_IN } from "@/components/projects/OstinatoRhythmDemo";
import type { OstinatoDemoText } from "@/components/projects/OstinatoDemoArea";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

const text = en.ostinatoDemo as unknown as OstinatoDemoText;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
});

const has = (id: string) => screen.getByTestId(id).textContent ?? "";
const focused = (el: HTMLElement) => document.activeElement === el;
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
// start() schedules the first beat 150 ms ahead; count-in beats come first.
const toScoredBeat = (k: number) => advance(150 + (COUNT_IN + k) * BEAT_MS);

describe("OstinatoRhythmDemo (WEB-P1-02)", () => {
  it("starts only on a user action, taps by keyboard, and announces the result", () => {
    render(<OstinatoRhythmDemo text={text} />);
    expect(screen.queryByTestId("rhythm-tap")).toBeNull();
    fireEvent.click(screen.getByTestId("rhythm-start"));
    const tap = screen.getByTestId("rhythm-tap");
    expect(focused(tap)).toBe(true);

    // During the lead-in a tap is acknowledged but not scored.
    fireEvent.keyDown(tap, { key: " " });
    expect(has("rhythm-last")).toContain(text.countIn);

    toScoredBeat(0);
    fireEvent.keyDown(tap, { key: "Enter" });
    expect(has("rhythm-last")).toContain("Perfect");
    // A held key (repeat) is not another tap; a click is not a tap either.
    fireEvent.keyDown(tap, { key: " ", repeat: true });
    fireEvent.click(tap);

    advance(8 * BEAT_MS);
    expect(screen.queryByTestId("rhythm-tap")).toBeNull();
    expect(has("rhythm-accuracy")).toBe("Timing accuracy: 13%");
    expect(has("rhythm-summary")).toBe("Perfect: 1, Good: 0, Missed: 7");
    expect(has("rhythm-announce")).toMatch(/Round finished\. Perfect: 1.*13%/);
    expect(screen.getByTestId("rhythm-announce").getAttribute("aria-live")).toBe("polite");
    expect(focused(screen.getByRole("heading", { name: "Round result" }))).toBe(true);
    expect(has("rhythm-start")).toBe("Try again");
  });

  it("rates early and late taps with signed milliseconds", () => {
    render(<OstinatoRhythmDemo text={text} />);
    fireEvent.click(screen.getByTestId("rhythm-start"));
    const tap = screen.getByTestId("rhythm-tap");
    toScoredBeat(0);
    fireEvent.keyDown(tap, { key: " " });
    advance(BEAT_MS + 90);
    fireEvent.keyDown(tap, { key: " " });
    expect(has("rhythm-last")).toContain("Good, 90 ms late");
  });

  it("offers no microphone button when the browser has none, and stays silent when permission is denied", async () => {
    render(<OstinatoRhythmDemo text={text} />);
    expect(screen.queryByTestId("rhythm-mic")).toBeNull();
    cleanup();

    class FakeAudio {
      currentTime = 0;
      destination = {};
      resume = () => Promise.resolve();
      close = () => Promise.resolve();
    }
    vi.stubGlobal("AudioContext", FakeAudio);
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    render(<OstinatoRhythmDemo text={text} />);
    const mic = screen.getByTestId("rhythm-mic");
    expect(getUserMedia).not.toHaveBeenCalled(); // never asked before the visitor presses it
    await act(async () => void fireEvent.click(mic));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByTestId("rhythm-start"));
    expect(screen.getByTestId("rhythm-tap")).toBeTruthy();
  });

  it("copy exists in tr and en, with no digits, no store-claim wording", () => {
    for (const c of [en.ostinatoDemo, tr.ostinatoDemo]) {
      for (const [k, v] of Object.entries(c)) {
        expect(v, k).not.toMatch(/\d/);
        expect(v, k).not.toMatch(/\bders|öğren|lesson|learn|course/i);
      }
    }
    expect(tr.ostinatoDemo.kicker).toBe("Ritim hissi denemesi");
    expect(tr.ostinatoDemo.perfect).toBe("Mükemmel");
  });
});
