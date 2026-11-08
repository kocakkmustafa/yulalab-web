/**
 * The seven home-page scenes (WEB-P0-03a). The order and the anchor ids are a
 * stable contract: `/#scene-3-products` is a public deep link, and tickets
 * 03b-03h fill each scene's body without renaming it.
 */
export const HOME_SCENES = [
  { n: 1, key: "scene1", id: "scene-1-identity" },
  { n: 2, key: "scene2", id: "scene-2-difference" },
  { n: 3, key: "scene3", id: "scene-3-products" },
  { n: 4, key: "scene4", id: "scene-4-engineering" },
  { n: 5, key: "scene5", id: "scene-5-lab" },
  { n: 6, key: "scene6", id: "scene-6-trust" },
  { n: 7, key: "scene7", id: "scene-7-start" },
] as const;

export type HomeSceneKey = (typeof HOME_SCENES)[number]["key"];
