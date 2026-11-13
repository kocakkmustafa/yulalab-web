// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeProbeTier, shouldDeferProbe, worseTier } from "@/components/experience/scene-route";

const detect = vi.fn(() => ({ available: true, software: false, tier: "high" as const }));

vi.mock("@/components/experience/quality", () => ({ detectExperienceCapabilities: () => detect() }));
const schedule = vi.fn(() => () => {});
let currentPath = "/projects";
vi.mock("@/components/experience/loader", () => ({ scheduleAfterLoad: () => schedule() }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => currentPath }));
vi.mock("@/components/theme/ThemeProvider", () => ({ useTheme: () => ({ ready: true }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import { SceneHost } from "@/components/experience/SceneHost";

function setViewport(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width") ? mobile : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe("shouldDeferProbe", () => {
  it("defers on phones only", () => {
    expect(shouldDeferProbe({ mobile: true })).toBe(true);
    expect(shouldDeferProbe({ mobile: false })).toBe(false);
  });
});

describe("tier merging", () => {
  it("keeps a canvas-lowered tier when a late probe reports higher", () => {
    expect(mergeProbeTier("low", "high")).toBe("low");
    expect(mergeProbeTier("medium", "high")).toBe("medium");
  });
  it("takes the probe tier when the canvas reported nothing, and worse probes win", () => {
    expect(mergeProbeTier(null, "high")).toBe("high");
    expect(mergeProbeTier("medium", "low")).toBe("low");
    expect(worseTier("high", "medium")).toBe("medium");
    expect(worseTier("low", "high")).toBe("low");
  });
});

describe("SceneHost WebGL probe timing", () => {
  beforeEach(() => {
    detect.mockClear();
    schedule.mockClear();
    currentPath = "/projects";
  });
  afterEach(cleanup);

  it("probes on mount on desktop", () => {
    setViewport(false);
    render(<SceneHost>x</SceneHost>);
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("waits for the first gesture on mobile and probes once", () => {
    setViewport(true);
    render(<SceneHost>x</SceneHost>);
    expect(detect).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event("touchstart"));
    });
    expect(detect).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("removes the gesture listeners on unmount without probing", () => {
    setViewport(true);
    const view = render(<SceneHost>x</SceneHost>);
    view.unmount();
    window.dispatchEvent(new Event("pointerdown"));
    expect(detect).not.toHaveBeenCalled();
  });

  it.each(["keydown", "wheel"])("probes on a %s gesture", (type) => {
    setViewport(true);
    render(<SceneHost>x</SceneHost>);
    act(() => {
      window.dispatchEvent(new Event(type));
    });
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("requests the backdrop right after the probing gesture, once per page", () => {
    setViewport(true);
    const view = render(<SceneHost>x</SceneHost>);
    expect(schedule).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    expect(schedule).toHaveBeenCalledTimes(1);
    currentPath = "/contact";
    view.rerender(<SceneHost>y</SceneHost>);
    expect(schedule).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(schedule).toHaveBeenCalledTimes(2);
  });
});
