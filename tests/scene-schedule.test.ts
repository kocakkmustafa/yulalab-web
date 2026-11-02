import { describe, expect, it, vi } from "vitest";
import { scheduleAfterLoad } from "@/components/experience/loader";

function fakeWindow(readyState: DocumentReadyState, idle = true) {
  const listeners = new Map<string, () => void>();
  const target = {
    document: { readyState },
    addEventListener: vi.fn((type: string, listener: () => void) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    requestIdleCallback: idle ? vi.fn(() => 7) : undefined,
    cancelIdleCallback: vi.fn(),
    setTimeout: vi.fn(() => 9),
    clearTimeout: vi.fn(),
  };
  return { target, fireLoad: () => listeners.get("load")?.() };
}

describe("3D scene scheduling behind the opening card", () => {
  it("waits for the page's load event before asking for an idle slot", () => {
    const start = vi.fn();
    const { target, fireLoad } = fakeWindow("interactive");
    scheduleAfterLoad(start, target as unknown as Window);
    expect(target.requestIdleCallback).not.toHaveBeenCalled();

    fireLoad();
    expect(target.requestIdleCallback).toHaveBeenCalledWith(start, { timeout: 400 });
  });

  it("asks for an idle slot at once when the page has already loaded", () => {
    const start = vi.fn();
    const { target } = fakeWindow("complete");
    scheduleAfterLoad(start, target as unknown as Window);
    expect(target.requestIdleCallback).toHaveBeenCalledOnce();
  });

  it("falls back to a task without requestIdleCallback and cancels cleanly", () => {
    const start = vi.fn();
    const { target } = fakeWindow("complete", false);
    const cancel = scheduleAfterLoad(start, target as unknown as Window);
    expect(target.setTimeout).toHaveBeenCalledWith(start, 0);
    cancel();
    expect(target.clearTimeout).toHaveBeenCalledWith(9);
    expect(target.removeEventListener).toHaveBeenCalledWith("load", expect.any(Function));
  });
});
