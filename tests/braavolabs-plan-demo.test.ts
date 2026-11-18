import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import en from "../messages/en.json";
import tr from "../messages/tr.json";
import { SUPPORTED_LOCALES } from "../src/i18n/locales";
import { PLAN_INTENTS, PLAN_RISK, buildPlanCard } from "../src/components/projects/braavolabs-plan-demo-data";
import { mayEqualEn } from "./helpers/same-as-en";
import { PlanCardView } from "../src/components/projects/PlanCardView";

type Cat = Record<string, unknown>;
const catalogues: Record<string, Cat> = { en: en.braavolabsDemo, tr: tr.braavolabsDemo };
const reader = (cat: Cat) => (key: string) => {
  const v = key.split(".").reduce<unknown>((o, k) => (o as Cat)[k], cat);
  if (typeof v !== "string") throw new Error("missing " + key);
  return v;
};
const leaves = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Object.values(v as Cat).flatMap(leaves);
const BANNED = /çalışıyor|tamamlandı|running|completed|in progress|ilerleme|spinner|progress/i;

describe("Braavolabs plan card (WEB-P0-05)", () => {
  it("maps three intents to three fixed, distinct cards", () => {
    for (const [loc, cat] of Object.entries(catalogues)) {
      const cards = PLAN_INTENTS.map((i) => buildPlanCard(i, reader(cat)));
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map((c) => c.output)).size).toBe(3);
      // pure: same input, same card
      expect(buildPlanCard("report", reader(cat))).toEqual(buildPlanCard("report", reader(cat)));
      for (const c of cards) {
        expect(c.steps.length).toBeGreaterThan(0);
        expect(c.approvals.length).toBeGreaterThan(0);
        expect(c.risk).toBe(PLAN_RISK[c.intent]);
      }
      expect(cards.map((c) => c.risk), loc).toEqual(["low", "medium", "high"]);
    }
  });

  it("carries the disclaimer in tr and en", () => {
    expect(reader(catalogues.tr)("disclaimer")).toBe("Bu bir interaktif ürün konsepti/plan örneğidir, gerçek iş yürütülmüyor.");
    expect(reader(catalogues.en)("disclaimer")).toMatch(/interactive product concept \/ plan example; no real job is executed/);
  });

  it("has no unfilled placeholders (next-intl would return the key name)", () => {
    for (const cat of Object.values(catalogues)) for (const s of leaves(cat)) expect(s).not.toMatch(/[{}]/);
  });

  it("has no execution wording and no digits in tr/en", () => {
    for (const [loc, cat] of Object.entries(catalogues)) {
      for (const s of leaves(cat)) {
        expect(s, loc + ": " + s).not.toMatch(BANNED);
        expect(s, loc + ": " + s).not.toMatch(/\d/);
      }
    }
  });

  it("renders a static card with headings and lists, no progress or live-run markup", () => {
    const card = buildPlanCard("software", reader(catalogues.en));
    const html = renderToStaticMarkup(
      createElement(PlanCardView, {
        card,
        labels: { intent: "i", example: "Example card", note: "Example note", steps: "Steps", approvals: "Approvals", risk: "Risk", output: "Output" },
        headingId: "x",
      }),
    );
    expect(html).toContain(card.output);
    expect(html).toContain('role="list"');
    expect(html).not.toMatch(/progress|spinner|animate-|aria-busy/i);
  });

  it("translates the plan card for the other twelve locales (same keys and placeholders, differs from English unless allowlisted)", () => {
    const rest = SUPPORTED_LOCALES.filter((l) => l !== "tr" && l !== "en");
    expect(rest).toHaveLength(12);
    for (const l of rest) {
      const cat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", l + ".json"), "utf8"));
      const flat = (v: unknown, p = ""): [string, string][] =>
        typeof v === "string" ? [[p, v]] : Object.entries(v as Cat).flatMap(([k, x]) => flat(x, p ? p + "." + k : k));
      const src = flat(en.braavolabsDemo, "braavolabsDemo");
      const got = new Map(flat(cat.braavolabsDemo, "braavolabsDemo"));
      expect([...got.keys()].sort(), l).toEqual(src.map(([k]) => k).sort());
      const tokens = (s: string) => (s.match(/\{[^{}]+\}|\d+/g) ?? []).sort();
      for (const [k, enVal] of src) {
        const v = got.get(k)!;
        expect(v.trim(), l + " " + k).not.toBe("");
        // Placeholders and numbers in the source must survive (a translation may add digits for number words).
        for (const t of tokens(enVal)) expect(v, l + " " + k).toContain(t);
        if (!mayEqualEn(l, k)) expect(v, l + " " + k).not.toBe(enVal);
      }
    }
  });
});
