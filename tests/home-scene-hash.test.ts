import { describe, expect, it } from "vitest";
import { HOME_SCENES, homeSceneIdFromHash } from "@/components/landing/home-scenes";

describe("homeSceneIdFromHash", () => {
  it("accepts exactly the seven scene ids", () => {
    for (const scene of HOME_SCENES) expect(homeSceneIdFromHash(`#${scene.id}`)).toBe(scene.id);
    expect(HOME_SCENES).toHaveLength(7);
  });

  it("never throws and returns null for anything else, including malformed escapes", () => {
    for (const hash of ["", "#", "#%E0%A4%A", "#%", "#scene-9-x", "#scene-3-products%20", "#experience-hero", "scene-3-products"]) {
      expect(() => homeSceneIdFromHash(hash)).not.toThrow();
      expect(homeSceneIdFromHash(hash)).toBeNull();
    }
  });
});
