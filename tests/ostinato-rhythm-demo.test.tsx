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
    fireEvent.click(tap, { detail: 1 });

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
    await act(async () => void fireEvent.click(screen.getByTestId("rhythm-start")));
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

  it("counts a click with no pointer (assistive tech) once, and does not double-count pointer clicks", () => {
    render(<OstinatoRhythmDemo text={text} />);
    fireEvent.click(screen.getByTestId("rhythm-start"));
    const tap = screen.getByTestId("rhythm-tap");
    toScoredBeat(0);
    advance(10);
    fireEvent.pointerDown(tap);
    expect(has("rhythm-last")).toContain("Perfect, 10 ms late");
    advance(100);
    fireEvent.click(tap, { detail: 1 }); // the click that follows the pointerdown
    expect(has("rhythm-last")).toContain("Perfect, 10 ms late");
    // detail 0: voice control / screen reader activation is a tap on its own.
    advance(BEAT_MS - 110 + 40);
    fireEvent.click(tap, { detail: 0 });
    expect(has("rhythm-last")).toContain("Perfect, 40 ms late");
  });

  describe("audio clock and microphone races", () => {
    const fakeAudio = (resume: () => Promise<void>) => {
      class FakeAudio {
        currentTime = 0;
        destination = {};
        resume = resume;
        close = () => Promise.resolve();
        getOutputTimestamp = () => ({ contextTime: this.currentTime, performanceTime: performance.now() });
        createAnalyser = () => ({ fftSize: 0, getFloatTimeDomainData: () => {} });
        createMediaStreamSource = () => ({ connect: () => {} });
      }
      vi.stubGlobal("AudioContext", FakeAudio);
      return FakeAudio;
    };

    it("places the first beat only after resume() settles, on the mapped audio clock", async () => {
      let release: () => void = () => {};
      fakeAudio(() => new Promise<void>((r) => (release = r)));
      render(<OstinatoRhythmDemo text={text} />);
      fireEvent.click(screen.getByTestId("rhythm-start"));
      expect(screen.queryByTestId("rhythm-tap")).toBeNull(); // not running while resume is pending
      advance(500); // slow resume: a click-time clock would now be 500 ms off
      await act(async () => release());
      const tap = screen.getByTestId("rhythm-tap");
      toScoredBeat(0);
      fireEvent.keyDown(tap, { key: " " });
      expect(has("rhythm-last")).toContain("Perfect");
      expect(has("rhythm-last")).toContain("0 ms");
    });

    const micSetup = () => {
      fakeAudio(() => Promise.resolve());
      const stop = vi.fn();
      let resolve: (s: unknown) => void = () => {};
      const getUserMedia = vi.fn(() => new Promise((r) => (resolve = r)));
      Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
      return { stop, getUserMedia, grant: () => resolve({ getTracks: () => [{ stop }] }) };
    };

    it("locks the button while the permission prompt is open and asks once", async () => {
      const m = micSetup();
      render(<OstinatoRhythmDemo text={text} />);
      const mic = screen.getByTestId("rhythm-mic") as HTMLButtonElement;
      await act(async () => void fireEvent.click(mic));
      expect(mic.disabled).toBe(true);
      await act(async () => void fireEvent.click(mic));
      expect(m.getUserMedia).toHaveBeenCalledTimes(1);
      await act(async () => m.grant());
      expect(mic.disabled).toBe(false);
      expect(mic.getAttribute("aria-pressed")).toBe("true");
    });

    it("stops a stream that arrives after unmount and starts no listening loop", async () => {
      const m = micSetup();
      const setIv = vi.spyOn(window, "setInterval");
      const { unmount } = render(<OstinatoRhythmDemo text={text} />);
      await act(async () => void fireEvent.click(screen.getByTestId("rhythm-mic")));
      unmount();
      await act(async () => m.grant());
      expect(m.stop).toHaveBeenCalledTimes(1);
      expect(setIv).not.toHaveBeenCalled();
    });
  });
});
