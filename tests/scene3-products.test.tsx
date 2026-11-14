import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Scene3Products } from "@/components/landing/Scene3Products";
import {
  FLAGSHIP_SLUGS,
  demoSlotOf,
  proofBadgeOf,
} from "@/components/landing/scene3-products";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { toExperienceClaims } from "@/lib/experience-claims";
import { presentedKindOf } from "@/lib/proof";
import { PRODUCT_ORDER } from "@/lib/product-index";
import type { ProductPublicRecord } from "@/lib/types";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

/** WEB-P0-03d. Dates derive from the registry so renewing claims cannot break the tests. */
const flagshipClaims = publicRegistry
  .filter((r) => (FLAGSHIP_SLUGS as readonly string[]).includes(r.slug))
  .flatMap((r) => r.claims);
const day = (iso: string, delta: number) => {
  const d = new Date(`${iso}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
};
const expiries = flagshipClaims.flatMap((c) => (c.expiresAt ? [c.expiresAt] : [])).sort();
const OPEN = day(expiries[0], -1);
const AFTER_ALL = day(expiries[expiries.length - 1], 1); // max(expiresAt)+1

const catalogue = { en, tr } as const;
function makeT(locale: "en" | "tr") {
  const t = (key: string, values?: Record<string, string | number>) => {
    const found = key
      .replace(/^scene3\./, "")
      .split(".")
      .reduce<unknown>(
        (n, p) => (n as Record<string, unknown> | undefined)?.[p],
        catalogue[locale].home.scene3 as unknown,
      );
    if (typeof found !== "string") throw new Error(`missing ${key}`);
    return found.replace(/\{(\w+)\}/g, (_, k) => String(values?.[k]));
  };
  return t as never;
}
const render = (now: Date, locale: "en" | "tr" = "en") =>
  renderToStaticMarkup(<Scene3Products t={makeT(locale)} locale={locale} now={now} />);

const lifeos = publicRegistry.find((r) => r.slug === "lifeos") as ProductPublicRecord;
const planned = (over: Partial<ProductPublicRecord["claims"][number]>): ProductPublicRecord => ({
  ...lifeos,
  claims: [{ ...(lifeos.claims.find((c) => c.claimState) as ProductPublicRecord["claims"][number]), ...over }],
});

describe("Scene 3 flagship cells", () => {
  it("renders the three cells with a demo label, a proof badge and a product link", () => {
    const html = render(OPEN);
    for (const slug of FLAGSHIP_SLUGS) {
      expect(html).toContain(`data-scene3-cell="${slug}"`);
      expect(html).toContain(`href="/en/projects/${slug}"`);
    }
    expect((html.match(/data-scene3-demo=/g) ?? []).length).toBe(3);
    expect((html.match(/data-scene3-proof=/g) ?? []).length).toBe(3);
    // No flagship has a real product test today, so that label never appears.
    expect(html).toContain("example / simulation");
    expect(html).toContain("not here yet");
    expect(html).not.toContain("real product test");
  });

  it("uses the Turkish labels in tr", () => {
    const html = render(OPEN, "tr");
    expect(html).toContain("örnek/simülasyon");
    expect(html).toContain("henüz gelmedi");
    expect(html).toContain('href="/projects/braavolabs"');
  });

  it("keeps the other five products reachable through the index link", () => {
    const html = render(OPEN);
    expect(html).toContain('data-scene3-all="true"');
    expect(html).toContain('href="/en/projects"');
    expect(PRODUCT_ORDER.filter((s) => !(FLAGSHIP_SLUGS as readonly string[]).includes(s))).toHaveLength(5);
  });

  it("says verified only while a claim is open; after every window closed it says lapsed", () => {
    expect(render(OPEN)).toContain('data-scene3-proof="verified"');
    const closed = render(AFTER_ALL);
    expect(closed).not.toContain('data-scene3-proof="verified"');
    expect(closed).not.toMatch(/Verified claims/);
    expect(closed).toContain('data-scene3-proof="lapsed"');
    expect(closed).toContain("not shown as verified");
  });

  it("claims no availability for the coming-soon product", () => {
    const ostinato = projects.find((p) => p.slug === "ostinato")!;
    expect(demoSlotOf("ostinato", ostinato)).toBe("soon");
    expect(render(OPEN)).not.toMatch(/App Store|Google Play/);
  });
});

describe("proofBadgeOf / presentedKindOf", () => {
  it("withheld claims never read as verified", () => {
    for (const over of [{ claimState: "planned" as const }, { publishableAsPresentTense: false }]) {
      const record = planned({ ...over, expiresAt: expiries[expiries.length - 1] });
      expect(proofBadgeOf(record, OPEN)).toEqual({ state: "none" });
      expect(presentedKindOf(record, record.claims[0].id, OPEN)).toBe("withheld");
    }
  });
  it("is none without a record and for a record without claims", () => {
    expect(proofBadgeOf(undefined, OPEN)).toEqual({ state: "none" });
    const ostinato = publicRegistry.find((r) => r.slug === "ostinato")!;
    expect(proofBadgeOf(ostinato, OPEN).state).toBe("none");
  });
  it("lapsed once every window closed; unknown claim id is undefined", () => {
    expect(proofBadgeOf(lifeos, AFTER_ALL).state).toBe("lapsed");
    expect(presentedKindOf(lifeos, "no-such-claim", OPEN)).toBeUndefined();
  });
  it("the journey drops withheld claims at the source", () => {
    const record = planned({ claimState: "planned", expiresAt: expiries[expiries.length - 1] });
    expect(toExperienceClaims(record, "en", OPEN)).toHaveLength(0);
    expect(toExperienceClaims(lifeos, "en", OPEN)).toHaveLength(lifeos.claims.length);
  });
});
