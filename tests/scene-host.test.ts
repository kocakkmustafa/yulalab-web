import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  backdropLoadPolicy,
  easeSceneTransition,
  interpolateSceneProgress,
  SCENE_BACKDROP_PROGRESS,
  SCENE_TRANSITION_MS,
  sceneToneForPath,
} from "@/components/experience/scene-route";

const read = (relative: string) => readFileSync(path.resolve(import.meta.dirname, "..", relative), "utf8");

describe("persistent scene route contract", () => {
  it("keeps legal, account and data routes quiet", () => {
    for (const route of [
      "/privacy", "/privacy/lifeos", "/privacy/motion/", "/terms",
      "/delete-account/motion", "/delete-account/lifeos", "/data-request/verify", "/motion/consent",
    ]) {
      expect(sceneToneForPath(route), route).toBe("quiet");
    }
  });

  it("shows the world behind content pages", () => {
    for (const route of ["/", "/projects", "/projects/lifeos", "/consulting", "/manifesto", "/transparency", "/contact", "/support", "/privacy-notes"]) {
      expect(sceneToneForPath(route), route).toBe("page");
    }
  });

  it("eases camera travel from the shown pose to the target without overshoot", () => {
    expect(easeSceneTransition(0)).toBe(0);
    expect(easeSceneTransition(1)).toBe(1);
    expect(easeSceneTransition(Number.NaN)).toBe(1);
    let previous = 0;
    for (let step = 1; step <= 20; step += 1) {
      const value = easeSceneTransition(step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(interpolateSceneProgress(0.42, SCENE_BACKDROP_PROGRESS, 0)).toBeCloseTo(0.42);
    expect(interpolateSceneProgress(0.42, SCENE_BACKDROP_PROGRESS, SCENE_TRANSITION_MS)).toBe(SCENE_BACKDROP_PROGRESS);
    expect(interpolateSceneProgress(0.42, SCENE_BACKDROP_PROGRESS, SCENE_TRANSITION_MS * 4)).toBe(SCENE_BACKDROP_PROGRESS);
  });
});

describe("first-visit backdrop loading", () => {
  it("defers the renderer to the first gesture on phones and constrained hardware", () => {
    expect(backdropLoadPolicy({ tier: "high", mobile: true })).toBe("first-gesture");
    expect(backdropLoadPolicy({ tier: "low", mobile: false })).toBe("first-gesture");
    expect(backdropLoadPolicy({ tier: "medium", mobile: false })).toBe("after-load");
    expect(backdropLoadPolicy({ tier: "high", mobile: false })).toBe("after-load");
  });
});

describe("persistent scene wiring", () => {
  it("creates the renderer once in the locale layout, outside the route transition", () => {
    const layout = read("src/app/[locale]/layout.tsx");
    const host = layout.indexOf("<SceneHost>");
    expect(host).toBeGreaterThan(-1);
    expect(layout.indexOf("<PageTransition>")).toBeGreaterThan(host);
    expect(layout.indexOf("</SceneHost>")).toBeGreaterThan(layout.indexOf("</PageTransition>"));
  });

  it("leaves the WebGL canvas to the host; the journey only directs it", () => {
    const journey = read("src/components/experience/YulaExperience.tsx");
    expect(journey).not.toContain("<ExperienceCanvas");
    expect(journey).toContain("useSceneJourney(");
    const host = read("src/components/experience/SceneHost.tsx");
    expect(host).toContain("<ExperienceCanvas");
    // three.js is never part of a route's first-load bundle.
    expect(host).toMatch(/dynamic<ExperienceCanvasProps>\(/);
    expect(host).toContain("ssr: false");
  });

  it("falls back to the painted ground for reduced motion and while the scene is not live", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/html\[data-scene="live"\] body \{\s*background: transparent;/);
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.scene-host \{\s*display: none;/);
    expect(css).toMatch(/\.scene-host\[data-scene-tone="quiet"\] \.scene-host-veil \{\s*opacity: 0\.95;/);
  });
});
