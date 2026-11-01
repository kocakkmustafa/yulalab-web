// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SOUND_PROMPT_KEY, SoundPrompt } from "@/components/experience/SoundPrompt";

const COPY = { prompt: "This site has sound. Turn it on?", on: "Sound on", skip: "Continue without sound" };

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("sound prompt", () => {
  it("asks once and starts sound only from the visitor's click", () => {
    const toggle = vi.fn();
    render(<SoundPrompt copy={COPY} soundEnabled={false} onSoundToggle={toggle} />);
    expect(screen.getByRole("region", { name: COPY.prompt })).toBeTruthy();
    expect(toggle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: COPY.on }));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: COPY.prompt })).toBeNull();
    expect(window.sessionStorage.getItem(SOUND_PROMPT_KEY)).toBe("1");
  });

  it("continues silently and does not ask again in this tab", () => {
    const toggle = vi.fn();
    render(<SoundPrompt copy={COPY} soundEnabled={false} onSoundToggle={toggle} />);
    fireEvent.click(screen.getByRole("button", { name: COPY.skip }));
    expect(toggle).not.toHaveBeenCalled();
    cleanup();

    render(<SoundPrompt copy={COPY} soundEnabled={false} onSoundToggle={toggle} />);
    expect(screen.queryByRole("region", { name: COPY.prompt })).toBeNull();
  });

  it("stays hidden once sound is already on", () => {
    render(<SoundPrompt copy={COPY} soundEnabled onSoundToggle={vi.fn()} />);
    expect(screen.queryByRole("region", { name: COPY.prompt })).toBeNull();
  });

  it("still asks when storage is blocked", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<SoundPrompt copy={COPY} soundEnabled={false} onSoundToggle={vi.fn()} />);
    expect(screen.getByRole("region", { name: COPY.prompt })).toBeTruthy();
    getItem.mockRestore();
  });
});
