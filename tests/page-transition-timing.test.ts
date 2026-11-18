import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DURATION, EASE_UI } from "@/lib/motion";

const css = readFileSync("src/app/globals.css", "utf8");

describe("page transition timing (W1 BK3 reference parity)", () => {
  it("exits over 1.0s and enters over 1.1s on the shared ease", () => {
    expect(DURATION.pageExit).toBe(1.0);
    expect(EASE_UI).toEqual([0.25, 0.46, 0.45, 0.94]);
    expect(css).toMatch(/--ease-ui:\s*cubic-bezier\(0\.25,\s*0\.46,\s*0\.45,\s*0\.94\)/);
    expect(css).toMatch(/\.page-enter\s*{\s*animation:\s*pageIn 1100ms var\(--ease-ui\) both/);
  });

  it("drops the entry animation under reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.page-enter\s*{\s*animation:\s*none/);
  });

  it("keeps hash targets below the fixed header", () => {
    expect(css).toMatch(/html\s*{[^}]*scroll-padding-top:\s*136px/);
    expect(css).toMatch(/scroll-padding-top:\s*calc\(72px \+ 16px\)/);
  });
});
