// @vitest-environment jsdom

import { act, render, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAmbientAudio } from "@/components/experience/audio";
import { ExperienceCanvas } from "@/components/experience/ExperienceCanvas";
import { ExperienceErrorBoundary } from "@/components/experience/ExperienceErrorBoundary";
import {
  QUALITY,
  detectInitialTier,
  downgradeTier,
  supportsWebGL,
} from "@/components/experience/quality";
import {
  parseCaptureParams,
  useExperienceProgress,
} from "@/components/experience/useExperienceProgress";

const experienceCanvasHarness = vi.hoisted(() => ({
  canvasProps: undefined as Record<string, unknown> | undefined,
  frameCallbacks: [] as Array<
    (state: { clock: { elapsedTime: number } }) => void
  >,
  invalidate: vi.fn(),
  performanceProps: undefined as Record<string, unknown> | undefined,
  renderer: {
    domElement: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    outputColorSpace: null as unknown,
    shadowMap: { type: null as unknown },
    toneMapping: null as unknown,
  },
  worldProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown> & { children?: ReactNode }) => {
    experienceCanvasHarness.canvasProps = props;
    return props.children ?? null;
  },
  useFrame: (
    callback: (state: { clock: { elapsedTime: number } }) => void,
  ) => {
    experienceCanvasHarness.frameCallbacks.push(callback);
  },
  useThree: <T,>(
    selector: (state: {
      gl: typeof experienceCanvasHarness.renderer;
      invalidate: typeof experienceCanvasHarness.invalidate;
    }) => T,
  ) =>
    selector({
      gl: experienceCanvasHarness.renderer,
      invalidate: experienceCanvasHarness.invalidate,
    }),
}));

vi.mock("@react-three/drei", () => ({
  PerformanceMonitor: (
    props: Record<string, unknown> & { children?: ReactNode },
  ) => {
    experienceCanvasHarness.performanceProps = props;
    return props.children ?? null;
  },
}));

vi.mock("@/components/experience/ExperienceWorld", () => ({
  ExperienceWorld: (props: Record<string, unknown>) => {
    experienceCanvasHarness.worldProps = props;
    return null;
  },
}));

function defineValue(target: object, key: PropertyKey, value: unknown) {
  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value,
  });
}

function installRuntimeSignals({
  webgl = true,
  reducedMotion = false,
  dpr = 1.5,
  width = 1440,
  height = 900,
  cores = 12,
  memory = 16,
}: {
  webgl?: boolean;
  reducedMotion?: boolean;
  dpr?: number;
  width?: number;
  height?: number;
  cores?: number;
  memory?: number;
} = {}) {
  const context = { getExtension: vi.fn() };
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(((kind: string) =>
      kind === "webgl2" && webgl ? context : null) as never);

  defineValue(window, "devicePixelRatio", dpr);
  defineValue(window, "innerWidth", width);
  defineValue(window, "innerHeight", height);
  defineValue(navigator, "hardwareConcurrency", cores);
  defineValue(navigator, "deviceMemory", memory);
  defineValue(window, "matchMedia", vi.fn(() => ({ matches: reducedMotion })));

  return { context, getContext };
}

function resetExperienceCanvasHarness() {
  experienceCanvasHarness.canvasProps = undefined;
  experienceCanvasHarness.frameCallbacks.length = 0;
  experienceCanvasHarness.invalidate.mockClear();
  experienceCanvasHarness.performanceProps = undefined;
  experienceCanvasHarness.renderer.domElement.addEventListener.mockClear();
  experienceCanvasHarness.renderer.domElement.removeEventListener.mockClear();
  experienceCanvasHarness.worldProps = undefined;
}

function installAnimationFrames() {
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => {
    nextId += 1;
    callbacks.set(nextId, callback);
    return nextId;
  });
  const cancel = vi.fn((id: number) => callbacks.delete(id));

  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);

  return {
    cancel,
    callbacks,
    request,
    runNext(time: number) {
      const entry = callbacks.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      if (!entry) throw new Error("No animation frame is pending");
      callbacks.delete(entry[0]);
      act(() => entry[1](time));
    },
  };
}

function setScrollGeometry(scrollY: number) {
  defineValue(window, "scrollY", scrollY);
  defineValue(window, "innerHeight", 1_000);
  defineValue(document.documentElement, "scrollHeight", 2_000);
}

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("experience quality policy", () => {
  it("contains only mutable Canvas settings and only downgrades", () => {
    expect(QUALITY).toEqual({
      high: { dpr: [1, 2], shadows: "basic" },
      medium: { dpr: [1, 1.5], shadows: false },
      low: { dpr: 1, shadows: false },
    });
    expect(Object.keys(QUALITY.high).sort()).toEqual(["dpr", "shadows"]);

    expect(downgradeTier("high")).toBe("medium");
    expect(downgradeTier("medium")).toBe("low");
    expect(downgradeTier("low")).toBe("low");
  });

  it("uses a safe WebGL2 probe without forcing context loss", () => {
    const { context, getContext } = installRuntimeSignals();

    expect(supportsWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(context.getExtension).not.toHaveBeenCalled();
  });

  it("selects high only for a capable, roomy, motion-enabled device", () => {
    installRuntimeSignals();
    expect(detectInitialTier()).toBe("high");
  });

  it("allows a capable desktop at the high tier's capped DPR", () => {
    installRuntimeSignals({ dpr: 2 });
    expect(detectInitialTier()).toBe("high");
  });

  it("falls to medium for an otherwise capable compact viewport", () => {
    installRuntimeSignals({ width: 1_024, height: 768, cores: 8, memory: 8 });
    expect(detectInitialTier()).toBe("medium");
  });

  it("keeps a capable high-DPR phone at medium instead of treating size as weakness", () => {
    installRuntimeSignals({
      width: 390,
      height: 844,
      dpr: 3,
      cores: 8,
      memory: 8,
    });
    expect(detectInitialTier()).toBe("medium");
  });

  it.each([
    { signals: { webgl: false }, reason: "no WebGL2" },
    { signals: { reducedMotion: true }, reason: "reduced motion" },
    { signals: { cores: 2, memory: 2 }, reason: "constrained hardware" },
    { signals: { dpr: 3.5 }, reason: "an expensive pixel ratio" },
  ] as const)("selects low for $reason", ({ signals }) => {
    installRuntimeSignals(signals);
    expect(detectInitialTier()).toBe("low");
  });
});

describe("experience Canvas runtime contract", () => {
  it("applies the real quality settings and sleeps after a bounded demand warmup", () => {
    resetExperienceCanvasHarness();
    const baseProps = {
      products: [],
      progress: 0,
      mode: "desktop" as const,
      tier: "high" as const,
      onTierChange: vi.fn(),
      onReady: vi.fn(),
      onContextLost: vi.fn(),
    };
    const view = render(createElement(ExperienceCanvas, baseProps));

    expect(experienceCanvasHarness.canvasProps).toMatchObject({
      dpr: QUALITY.high.dpr,
      frameloop: "demand",
      shadows: QUALITY.high.shadows,
    });
    const immutableGl = experienceCanvasHarness.canvasProps?.gl;
    expect(immutableGl).toMatchObject({ antialias: true });
    expect(experienceCanvasHarness.performanceProps).toMatchObject({
      iterations: 8,
      ms: 250,
    });

    const initialFrame = experienceCanvasHarness.frameCallbacks.at(-1);
    expect(initialFrame).toBeDefined();
    experienceCanvasHarness.invalidate.mockClear();
    act(() => initialFrame?.({ clock: { elapsedTime: 0.5 } }));
    expect(experienceCanvasHarness.invalidate).toHaveBeenCalledTimes(1);

    experienceCanvasHarness.invalidate.mockClear();
    act(() => initialFrame?.({ clock: { elapsedTime: 3 } }));
    expect(experienceCanvasHarness.invalidate).not.toHaveBeenCalled();

    view.rerender(
      createElement(ExperienceCanvas, {
        ...baseProps,
        mode: "mobile",
        progress: 0.42,
        tier: "medium",
      }),
    );
    expect(experienceCanvasHarness.canvasProps).toMatchObject({
      dpr: QUALITY.medium.dpr,
      frameloop: "demand",
      shadows: QUALITY.medium.shadows,
    });
    expect(experienceCanvasHarness.canvasProps?.gl).toBe(immutableGl);
    expect(experienceCanvasHarness.invalidate).toHaveBeenCalled();
  });

  it("waits for assets plus a committed frame and keeps performance downgrades live", () => {
    resetExperienceCanvasHarness();
    const onReady = vi.fn();
    const onTierChange = vi.fn();
    const baseProps = {
      products: [],
      progress: 0.24,
      mode: "desktop" as const,
      tier: "high" as const,
      onTierChange,
      onReady,
      onContextLost: vi.fn(),
    };
    const view = render(createElement(ExperienceCanvas, baseProps));

    const beforeAssets = experienceCanvasHarness.frameCallbacks.at(-1);
    act(() => beforeAssets?.({ clock: { elapsedTime: 3 } }));
    expect(onReady).not.toHaveBeenCalled();

    const onAssetsSettled = experienceCanvasHarness.worldProps
      ?.onAssetsSettled as (() => void) | undefined;
    expect(onAssetsSettled).toBeTypeOf("function");
    experienceCanvasHarness.invalidate.mockClear();
    act(() => onAssetsSettled?.());
    expect(experienceCanvasHarness.invalidate).toHaveBeenCalled();

    const afterAssets = experienceCanvasHarness.frameCallbacks.at(-1);
    experienceCanvasHarness.invalidate.mockClear();
    act(() => afterAssets?.({ clock: { elapsedTime: 3 } }));
    expect(onReady).not.toHaveBeenCalled();
    expect(experienceCanvasHarness.invalidate).toHaveBeenCalledTimes(1);

    experienceCanvasHarness.invalidate.mockClear();
    act(() => afterAssets?.({ clock: { elapsedTime: 3 } }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(experienceCanvasHarness.invalidate).not.toHaveBeenCalled();

    const decline = experienceCanvasHarness.performanceProps
      ?.onDecline as (() => void) | undefined;
    act(() => decline?.());
    expect(onTierChange).toHaveBeenCalledWith("medium");

    view.rerender(
      createElement(ExperienceCanvas, { ...baseProps, tier: "low" }),
    );
    const lowDecline = experienceCanvasHarness.performanceProps
      ?.onDecline as (() => void) | undefined;
    act(() => lowDecline?.());
    expect(onTierChange).toHaveBeenCalledTimes(1);
  });
});

describe("deterministic capture parameters", () => {
  it("accepts only the literal capture switch and known tiers", () => {
    expect(parseCaptureParams("?capture=1&progress=.42&tier=high")).toEqual({
      enabled: true,
      progress: 0.42,
      tier: "high",
      loader: false,
      loaderProgress: 0,
    });

    expect(parseCaptureParams("?capture=true&progress=.42&tier=ultra")).toEqual({
      enabled: false,
      progress: 0.42,
      tier: null,
      loader: false,
      loaderProgress: 0,
    });
  });

  it("clamps finite progress and rejects malformed capture progress", () => {
    expect(parseCaptureParams("?capture=1&progress=4").progress).toBe(1);
    expect(parseCaptureParams("?capture=1&progress=-2").progress).toBe(0);
    expect(parseCaptureParams("?capture=1&progress=nope")).toMatchObject({
      enabled: false,
      progress: 0,
    });
  });

  it("exposes a separately clamped loader checkpoint only in capture mode", () => {
    expect(
      parseCaptureParams(
        "?capture=1&progress=.2&loader=1&loaderProgress=1.75&tier=medium",
      ),
    ).toEqual({
      enabled: true,
      progress: 0.2,
      tier: "medium",
      loader: true,
      loaderProgress: 1,
    });

    expect(parseCaptureParams("?loader=1&loaderProgress=.5")).toMatchObject({
      enabled: false,
      loader: false,
      loaderProgress: 0.5,
    });
  });
});

describe("the single experience progress loop", () => {
  it("reads normalized document scroll in one RAF chain and critically damps it", () => {
    window.history.replaceState({}, "", "/");
    setScrollGeometry(500);
    const frames = installAnimationFrames();
    const { result, unmount } = renderHook(() => useExperienceProgress(false));

    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(frames.callbacks.size).toBe(1);

    frames.runNext(16);
    const first = result.current.progress;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(0.5);
    expect(frames.callbacks.size).toBe(1);

    frames.runNext(32);
    expect(result.current.progress).toBeGreaterThan(first);
    expect(result.current.progress).toBeLessThan(0.5);
    expect(frames.callbacks.size).toBe(1);

    unmount();
    expect(frames.cancel).toHaveBeenCalledTimes(1);
  });

  it("returns exact document progress with no smoothing for reduced motion", () => {
    setScrollGeometry(625);
    const frames = installAnimationFrames();
    const { result, unmount } = renderHook(() => useExperienceProgress(true));

    frames.runNext(16);
    expect(result.current.progress).toBe(0.625);

    unmount();
  });

  it("pins capture progress exactly and does not start a scroll loop", () => {
    window.history.replaceState(
      {},
      "",
      "/?capture=1&progress=.625&tier=low",
    );
    const frames = installAnimationFrames();
    const { result } = renderHook(() => useExperienceProgress(false));

    expect(result.current.progress).toBe(0.625);
    expect(result.current.capture).toMatchObject({ enabled: true, tier: "low" });
    expect(frames.request).not.toHaveBeenCalled();
  });
});

class MockAudioParam {
  value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });
  linearRampToValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });
}

class MockAudioNode {
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class MockScheduledSource extends MockAudioNode {
  buffer: unknown = null;
  loop = false;
  frequency = new MockAudioParam();
  type = "sine";
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];

  currentTime = 1;
  destination = new MockAudioNode();
  sampleRate = 8;
  state: AudioContextState = "suspended";
  oscillator = new MockScheduledSource();
  noise = new MockScheduledSource();
  filter = Object.assign(new MockAudioNode(), {
    type: "lowpass",
    frequency: new MockAudioParam(),
    Q: new MockAudioParam(),
  });
  master = Object.assign(new MockAudioNode(), { gain: new MockAudioParam() });
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createOscillator = vi.fn(() => this.oscillator);
  createBufferSource = vi.fn(() => this.noise);
  createBiquadFilter = vi.fn(() => this.filter);
  createGain = vi.fn(() => this.master);
  createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(8) }));

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

describe("opt-in ambient audio", () => {
  it("creates WebAudio only from enable, ramps toggles, and disposes once", async () => {
    MockAudioContext.instances.length = 0;
    defineValue(window, "AudioContext", MockAudioContext);
    const audio = createAmbientAudio();

    expect(MockAudioContext.instances).toHaveLength(0);
    await audio.setEnabled(true);
    expect(MockAudioContext.instances).toHaveLength(0);
    expect(audio.isEnabled()).toBe(false);

    await audio.enable();
    const context = MockAudioContext.instances[0];
    expect(context).toBeDefined();
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.oscillator.start).toHaveBeenCalledTimes(1);
    expect(context.noise.start).toHaveBeenCalledTimes(1);
    expect(audio.isEnabled()).toBe(true);

    await audio.enable();
    expect(MockAudioContext.instances).toHaveLength(1);

    await audio.setEnabled(false);
    expect(audio.isEnabled()).toBe(false);
    await audio.setEnabled(true);
    expect(audio.isEnabled()).toBe(true);

    await audio.dispose();
    await audio.dispose();
    expect(audio.isEnabled()).toBe(false);
    expect(context.oscillator.stop).toHaveBeenCalledTimes(1);
    expect(context.noise.stop).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);

    await audio.enable();
    expect(MockAudioContext.instances).toHaveLength(1);
  });

  it("stays inert when WebAudio is unavailable", async () => {
    defineValue(window, "AudioContext", undefined);
    defineValue(window, "webkitAudioContext", undefined);
    const audio = createAmbientAudio();

    await expect(audio.enable()).resolves.toBeUndefined();
    expect(audio.isEnabled()).toBe(false);
    await expect(audio.dispose()).resolves.toBeUndefined();
  });
});

describe("experience error isolation", () => {
  it("renders the semantic fallback and reports client render failures", () => {
    const error = new Error("canvas failed");
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const BrokenCanvas = () => {
      throw error;
    };

    render(
      createElement(ExperienceErrorBoundary, {
        children: createElement(BrokenCanvas),
        fallback: createElement("p", null, "Static experience"),
        onError,
      }),
    );

    expect(screen.getByText("Static experience")).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
  });
});
