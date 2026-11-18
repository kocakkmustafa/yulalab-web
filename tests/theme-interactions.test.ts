// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lenisInstances: { destroy: ReturnType<typeof vi.fn>; options: Record<string, unknown> }[] = [];
vi.mock("lenis", () => ({
  default: class {
    destroy = vi.fn();
    options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      lenisInstances.push(this);
    }
  },
}));

import { smoothScrollAllowed, startSiteSmoothScroll, SITE_SMOOTH_LERP } from "@/lib/smooth-scroll";
import { startReveal } from "@/lib/reveal";

function mockMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const FINE = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

beforeEach(() => {
  document.body.innerHTML = "";
  lenisInstances.length = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("site smooth scroll (Lenis)", () => {
  it("starts only when motion is allowed, with a fine pointer, off the experience", () => {
    mockMedia({ [FINE]: true });
    expect(smoothScrollAllowed(window)).toBe(true);
    const stop = startSiteSmoothScroll(window);
    expect(lenisInstances).toHaveLength(1);
    expect(lenisInstances[0].options.lerp).toBe(SITE_SMOOTH_LERP);
    expect(lenisInstances[0].options.anchors).toBe(false);
    stop();
    expect(lenisInstances[0].destroy).toHaveBeenCalled();
  });

  it("does not start under prefers-reduced-motion", () => {
    mockMedia({ [FINE]: true, [REDUCED]: true });
    expect(smoothScrollAllowed(window)).toBe(false);
    startSiteSmoothScroll(window)();
    expect(lenisInstances).toHaveLength(0);
  });

  it("keeps touch devices native", () => {
    mockMedia({ [FINE]: false });
    startSiteSmoothScroll(window)();
    expect(lenisInstances).toHaveLength(0);
  });

  it("yields to the home experience's own scroll management", () => {
    mockMedia({ [FINE]: true });
    document.body.innerHTML = '<div data-yula-experience="true"></div>';
    expect(smoothScrollAllowed(window)).toBe(false);
    startSiteSmoothScroll(window)();
    expect(lenisInstances).toHaveLength(0);
  });
});

describe("data-reveal hook", () => {
  const build = () => {
    document.body.innerHTML = '<p data-reveal id="a">a</p>';
  };

  it("leaves content untouched under prefers-reduced-motion", () => {
    mockMedia({ [REDUCED]: true });
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
    build();
    startReveal(window)();
    expect(document.getElementById("a")!.hasAttribute("data-reveal-state")).toBe(false);
    vi.unstubAllGlobals();
  });

  it("leaves content untouched when IntersectionObserver is missing", () => {
    mockMedia({});
    vi.stubGlobal("IntersectionObserver", undefined);
    (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    build();
    startReveal(window)();
    expect(document.getElementById("a")!.hasAttribute("data-reveal-state")).toBe(false);
    vi.unstubAllGlobals();
  });

  it("hides only below-the-fold elements and reveals them on intersection", () => {
    mockMedia({});
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) { callback = cb; }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    window.IntersectionObserver = globalThis.IntersectionObserver;
    document.body.innerHTML = '<p data-reveal id="top">t</p><p data-reveal id="low">l</p>';
    const rect = (top: number) => ({ top }) as DOMRect;
    document.getElementById("top")!.getBoundingClientRect = () => rect(10);
    document.getElementById("low")!.getBoundingClientRect = () => rect(5000);
    const stop = startReveal(window);
    expect(document.getElementById("top")!.dataset.revealState).toBe("in");
    expect(document.getElementById("low")!.dataset.revealState).toBe("pending");
    callback([{ isIntersecting: true, target: document.getElementById("low")! } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(document.getElementById("low")!.dataset.revealState).toBe("in");
    stop();
    vi.unstubAllGlobals();
  });
});
