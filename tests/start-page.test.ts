import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null, { status: 209 }) }));
import { NextRequest } from "next/server";
import middleware from "@/middleware";
import sitemap from "@/app/sitemap";
import { HOME_DOORS } from "@/components/landing/home-doors";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

const read = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "messages", `${locale}.json`), "utf8")) as {
    start: Record<string, string>;
    home: { doors: Record<string, unknown> };
  };

// `/lab` is delivered by WEB-UX-05e and is not on this base yet.
const PENDING_SIBLING_ROUTES = new Set(["/lab"]);

describe("/start doors page (WEB-UX-05g)", () => {
  const trStart = (tr as unknown as { start: Record<string, string> }).start;
  const enStart = (en as unknown as { start: Record<string, string> }).start;

  it.each(SUPPORTED_LOCALES)("%s has the same start keys as en and non-empty values", (locale) => {
    const start = read(locale).start;
    expect(Object.keys(start).sort()).toEqual(Object.keys(enStart).sort());
    for (const value of Object.values(start)) expect(value.trim()).not.toBe("");
  });

  it("tr and en are written; the other languages carry the English fallback", () => {
    expect(trStart.lede).not.toBe(enStart.lede);
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "tr" && l !== "en")) {
      expect(read(locale).start).toEqual(enStart);
    }
  });

  it("has four doors, every door has copy keys, and every target is an existing route", () => {
    expect(HOME_DOORS).toHaveLength(4);
    const doors = en.home.doors as unknown as Record<string, Record<string, string>>;
    for (const door of HOME_DOORS) {
      expect(doors[door.key].title).toBeTruthy();
      expect(doors[door.key].audience).toBeTruthy();
      for (const link of door.links) {
        expect(doors[door.key][link.key]).toBeTruthy();
        const route = link.href.split("#")[0];
        if (PENDING_SIBLING_ROUTES.has(route)) continue;
        const dir = path.join(__dirname, "..", "src", "app", "[locale]", route.slice(1));
        expect(fs.existsSync(path.join(dir, "page.tsx")), `${route} has no page`).toBe(true);
      }
    }
  });

  it("is in the sitemap for every language and the router does not mistake it for a locale", () => {
    const urls = sitemap().map((e) => e.url);
    for (const locale of SUPPORTED_LOCALES) {
      expect(urls).toContain(`https://yulalab.com${locale === "tr" ? "" : "/" + locale}/start`);
    }
    for (const p of ["/start", "/en/start", "/pt-BR/start"]) {
      expect(middleware(new NextRequest(`https://yulalab.com${p}`)).status).toBe(209);
    }
  });
});
