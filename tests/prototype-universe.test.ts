import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import {
  accessFor,
  badgeKindFor,
  buildUniverse,
  filterUniverse,
  groupUniverse,
  MAIN_SLUGS,
  parseFilter,
  staleClaimCount,
  summarize,
  UNIVERSE_ORDER,
} from "@/components/prototype/universe";

const entries = buildUniverse(publicRegistry, projects, "tr");

describe("prototype universe ordering and grouping", () => {
  it("uses the single ordering source for all 8 products", () => {
    expect(entries.map((e) => e.slug)).toEqual([...UNIVERSE_ORDER]);
    expect(entries).toHaveLength(publicRegistry.length);
    expect(entries.map((e) => e.slug).slice(0, 3)).toEqual(["lifeos", "braavolabs", "ostinato"]);
  });

  it("splits into main products and portfolio", () => {
    const g = groupUniverse(entries);
    expect(g.main.map((e) => e.slug)).toEqual([...MAIN_SLUGS]);
    expect(g.portfolio.map((e) => e.slug)).toEqual(["burunfarki", "gravita", "lissom", "jablab", "choreia"]);
  });

  it("is a stable order independent of registry order", () => {
    const reversed = buildUniverse([...publicRegistry].reverse(), projects, "en");
    expect(reversed.map((e) => e.slug)).toEqual(entries.map((e) => e.slug));
  });
});

describe("badge mapping from registry status", () => {
  it("maps every registry record", () => {
    for (const r of publicRegistry) {
      const expected = { live: "live", beta: "beta", research: "soon", archived: "archived" }[r.lifecycle];
      expect(entries.find((e) => e.slug === r.slug)?.badge).toBe(expected);
    }
  });
  it("labels research honestly as coming soon, never live (Ostinato)", () => {
    expect(badgeKindFor("research")).toBe("soon");
    expect(entries.find((e) => e.slug === "ostinato")?.badge).toBe("soon");
  });
  it("gives live and beta a badge too", () => {
    expect(badgeKindFor("live")).toBe("live");
    expect(badgeKindFor("beta")).toBe("beta");
  });
});

describe("status filter and summary", () => {
  it("filters by badge and keeps order", () => {
    expect(filterUniverse(entries, "all")).toHaveLength(entries.length);
    expect(filterUniverse(entries, "soon").every((e) => e.badge === "soon")).toBe(true);
    expect(filterUniverse(entries, "beta").map((e) => e.slug)).toEqual(["braavolabs"]);
  });
  it("parses filter values defensively", () => {
    expect(parseFilter("beta")).toBe("beta");
    expect(parseFilter("x")).toBe("all");
    expect(parseFilter(undefined)).toBe("all");
  });
  it("derives the summary from the registry", () => {
    const s = summarize(entries);
    expect(s.total).toBe(publicRegistry.length);
    expect(s.live + s.beta + s.soon + s.archived).toBe(s.total);
    expect(s.live).toBe(publicRegistry.filter((r) => r.lifecycle === "live").length);
  });
});

describe("access path", () => {
  it("never draws a link without a real https surface; falls back to notify mailto", () => {
    for (const e of entries) {
      if (e.access.kind === "links") {
        expect(e.access.links.length).toBeGreaterThan(0);
        for (const l of e.access.links) expect(l.href).toMatch(/^https:\/\//);
      } else {
        expect(e.access.href).toMatch(/^mailto:/);
      }
    }
    expect(entries.find((e) => e.slug === "ostinato")?.access.kind).toBe("notify");
  });
  it("research products have no surfaces", () => {
    const r = publicRegistry.find((x) => x.slug === "ostinato")!;
    expect(accessFor(r, projects.find((p) => p.slug === "ostinato")!).kind).toBe("notify");
  });
  it("counts stale claims by expiry date", () => {
    const r = publicRegistry.find((x) => x.slug === "braavolabs")!;
    expect(staleClaimCount(r, "2000-01-01")).toBe(0);
    expect(staleClaimCount(r, "2999-01-01")).toBe(r.claims.length);
  });
});
