// @vitest-environment jsdom
import type { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { zoomThrough } from "../src/lib/zoom-through";

function click(overrides: Partial<MouseEvent<HTMLElement>> = {}) {
  return { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...overrides } as MouseEvent<HTMLElement>;
}

function media() {
  const node = document.createElement("div");
  node.className = "media-in relative";
  node.innerHTML = '<img alt="" src="data:," /><a href="#x">x</a>';
  node.getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 180, right: 310, bottom: 200, x: 10, y: 20, toJSON: () => ({}) });
  document.body.appendChild(node);
  return node;
}

function motion(reduce: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("card zoom-through", () => {
  it("keeps plain navigation for modified clicks, reduced motion and missing WAAPI", () => {
    motion(false);
    const node = media();
    expect(zoomThrough(click({ metaKey: true }), node)).toBe(false);
    expect(zoomThrough(click({ button: 1 }), node)).toBe(false);
    expect(zoomThrough(click(), node)).toBe(false); // jsdom has no Element.animate
    motion(true);
    node.animate = vi.fn() as unknown as typeof node.animate;
    expect(zoomThrough(click(), node)).toBe(false);
    expect(document.querySelector("[data-zoom-through]")).toBeNull();
  });

  it("flies a hidden, inert copy from the card and always removes it", () => {
    vi.useFakeTimers();
    motion(false);
    const node = media();
    const animation = { onfinish: null as null | (() => void), oncancel: null as null | (() => void) };
    HTMLElement.prototype.animate = vi.fn(() => animation) as unknown as HTMLElement["animate"];
    expect(zoomThrough(click(), node)).toBe(true);
    const copy = document.querySelector<HTMLElement>("[data-zoom-through]")!;
    expect(copy.getAttribute("aria-hidden")).toBe("true");
    expect(copy.classList.contains("media-in")).toBe(false);
    expect(copy.style.position).toBe("fixed");
    expect(copy.style.left).toBe("10px");
    expect(copy.style.pointerEvents).toBe("none");
    expect(copy.querySelector("a")!.getAttribute("tabindex")).toBe("-1");
    vi.advanceTimersByTime(1600);
    expect(document.querySelector("[data-zoom-through]")).toBeNull();
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  });
});
