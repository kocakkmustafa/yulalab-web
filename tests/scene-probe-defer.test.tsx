// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldDeferProbe } from "@/components/experience/scene-route";

const detect = vi.fn(() => ({ available: true, software: false, tier: "high" as const }));

vi.mock("@/components/experience/quality", () => ({ detectExperienceCapabilities: () => detect() }));
vi.mock("@/components/experience/loader", () => ({ scheduleAfterLoad: () => () => {} }));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/projects" }));
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

describe("SceneHost WebGL probe timing", () => {
  beforeEach(() => detect.mockClear());
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
});
