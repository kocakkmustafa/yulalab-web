import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_DOORS } from "@/components/landing/home-doors";
import { HOME_SCENES } from "@/components/landing/home-scenes";

const pages = path.join(process.cwd(), "src/app/[locale]");
const routeExists = (route: string) => fs.existsSync(path.join(pages, route, "page.tsx"));

/** Routes delivered by sibling tickets, absent on this base: href only. */
const PENDING = new Set(["/lab"]);

describe("home doors (WEB-UX-05d)", () => {
  it("has the four doors in the design order", () => {
    expect(HOME_DOORS.map((d) => d.key)).toEqual(["products", "work", "partners", "inspect"]);
  });

  it("keeps the anchor contract: products, work, partners, inspect targets", () => {
    const hrefs = Object.fromEntries(HOME_DOORS.map((d) => [d.key, d.links.map((l) => l.href)]));
    expect(hrefs).toEqual({
      products: ["/projects"],
      work: ["/consulting"],
      partners: ["/contact#yollar"],
      inspect: ["/lab", "/transparency"],
    });
  });

  it("points only at existing routes, apart from the documented pending ones", () => {
    for (const link of HOME_DOORS.flatMap((d) => d.links)) {
      const route = link.href.split("#")[0];
      if (PENDING.has(route)) continue;
      expect(routeExists(route), link.href).toBe(true);
    }
  });

  it("never targets /start from the doors themselves and never leaves the site", () => {
    for (const link of HOME_DOORS.flatMap((d) => d.links)) {
      expect(link.href).toMatch(/^\//);
      expect(link.href).not.toMatch(/^\/start/);
    }
    // WEB-UX-05g adds the /start page; the doors still point at the real destinations.
    expect(routeExists("/start")).toBe(true);
  });

  it("leaves the HomeScenes anchor ids untouched", () => {
    expect(HOME_SCENES.map((s) => s.id)).toEqual([
      "scene-1-identity",
      "scene-2-difference",
      "scene-3-products",
      "scene-4-engineering",
      "scene-5-lab",
      "scene-6-trust",
      "scene-7-start",
    ]);
  });

  it("renders the strip outside YulaExperience and links with plain anchors", () => {
    const strip = fs.readFileSync(path.join(process.cwd(), "src/components/landing/Scene7Start.tsx"), "utf8");
    const experience = fs.readFileSync(path.join(process.cwd(), "src/components/experience/YulaExperience.tsx"), "utf8");
    expect(strip).toContain("localePath(locale");
    expect(strip).not.toMatch(/from "@\/i18n\/navigation"/);
    expect(experience).not.toMatch(/home-doors|Scene7Start/);
  });
});
