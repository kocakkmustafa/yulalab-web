import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

/**
 * SEC-WEB-02: a product whose status is "coming-soon" must not claim, in the
 * present tense, that it can be opened, downloaded or found in a store. The
 * Ostinato page said "Coming soon" in its pill while its description said
 * the guitar course "is open".
 *
 * Scope: every string of the product's data file and of its own
 * `product.<slug>` message block (tr + en). Patterns are deliberately
 * short; future-tense copy ("coming soon to the App Store", "opens with a
 * membership") does not match them.
 */
const CLAIMS: Array<[string, RegExp]> = [
  ["en: is/are open|live|available", /\b(?:is|are)\s+(?:now\s+)?(?:open|live|available)\b/i],
  ["en: open with <n>", /\bopen with \d/i],
  ["en: available now/today", /\bavailable\s+(?:now|today)\b/i],
  ["en: download now / get it on", /\b(?:download\s+now|get it on|free to download|now on the)\b/i],
  ["tr: açık", /\baçık\b/i],
  ["tr: yayında", /\byayında\b/i],
  ["tr: şimdi/hemen indir", /\b(?:şimdi|hemen)\s+indir/i],
  ["tr: mevcut/erişilebilir", /\b(?:mevcut|erişilebilir)\b/i],
];

function strings(value: unknown, path: string, out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  }
  return out;
}

type Candidate = { slug: string; status: string; data: unknown; messages: unknown[]; links: Array<{ kind: string; href?: string | null }> };

/** Returns one human-readable violation per offending string or link. */
export function availabilityClaims(c: Candidate): string[] {
  if (c.status !== "coming-soon") return [];
  const found: string[] = [];
  const all = [...strings(c.data, `${c.slug}.data`), ...c.messages.flatMap((m, i) => strings(m, `${c.slug}.messages[${i}]`))];
  for (const [path, text] of all) {
    for (const [label, re] of CLAIMS) {
      if (re.test(text)) found.push(`${path} [${label}]: "${text.match(re)?.[0]}"`);
    }
  }
  for (const link of c.links) {
    if ((link.kind === "ios" || link.kind === "android") && link.href) {
      found.push(`${c.slug}.links.${link.kind}: store link "${link.href}" on a coming-soon product`);
    }
  }
  return found;
}

function candidate(p: (typeof projects)[number]): Candidate {
  const { links, ...data } = p;
  return {
    slug: p.slug,
    status: p.status,
    data,
    messages: [
      (tr as unknown as { product: Record<string, unknown> }).product[p.slug],
      (en as unknown as { product: Record<string, unknown> }).product[p.slug],
    ],
    links,
  };
}

describe("coming-soon products make no availability claims", () => {
  const comingSoon = projects.filter((p) => p.status === "coming-soon");

  it("there is at least one coming-soon product to check", () => {
    expect(comingSoon.length).toBeGreaterThan(0);
  });

  it.each(comingSoon.map((p) => p.slug))("%s", (slug) => {
    const p = comingSoon.find((x) => x.slug === slug)!;
    expect(availabilityClaims(candidate(p))).toEqual([]);
  });

  it("negative check: the rule reports a fake coming-soon product that says it is available", () => {
    const fake: Candidate = {
      slug: "fake",
      status: "coming-soon",
      data: { description: { en: "The guitar course is open. Available now.", tr: "Gitar kursu açık." } },
      messages: [{ cta: "Get it on the App Store" }],
      links: [{ kind: "ios", href: "https://apps.apple.com/app/id1" }],
    };
    const v = availabilityClaims(fake);
    expect(v.length).toBeGreaterThanOrEqual(5);
    expect(v.join("\n")).toMatch(/is\/are open/);
    expect(v.join("\n")).toMatch(/tr: açık/);
    expect(v.join("\n")).toMatch(/store link/);
  });

  it("negative check: a live product with the same copy is not flagged, future-tense copy passes", () => {
    const live: Candidate = { slug: "x", status: "live", data: { d: "Available now" }, messages: [], links: [] };
    expect(availabilityClaims(live)).toEqual([]);
    const soon: Candidate = {
      slug: "y",
      status: "coming-soon",
      data: { d: "Coming soon to the App Store. Opens with a membership. Yakında App Store'da." },
      messages: [],
      links: [],
    };
    expect(availabilityClaims(soon)).toEqual([]);
  });
});
