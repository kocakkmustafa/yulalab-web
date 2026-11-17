// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import TransparencyPage from "@/app/[locale]/transparency/page";
import { StatCards } from "@/components/projects/StatCards";
import { ProofCard } from "@/components/common/ProofCard";
import { ProofLedger } from "@/components/experience/ExperienceOverlay";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";
import { FIXTURE_ACCURACY_CLAIM_ID, FIXTURE_ACCURACY_RECORD, WITHDRAWN_BF_STATS } from "./fixtures/withdrawn-bf-stats";
import { toExperienceClaims } from "@/lib/experience-claims";
import { presentClaims } from "@/lib/proof";
import {
  isClaimPresentable,
  isExpired,
  listClaimsExpiringWithin,
  listPresentableClaims,
} from "@/lib/public-registry";
import type { ExperienceCopy, ExperienceProduct } from "@/components/experience/types";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

/**
 * SEC-WEB-01 — an expired claim may not be published in the present tense.
 * Every test pins its own NOW; nothing here reads the real clock.
 */
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ComponentProps<"img"> & { fill?: boolean }) => <img alt={alt} src={src} />,
}));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {}, getTranslations: async () => (k: string) => k }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/StaggerWords", () => ({ StaggerWords: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/common/Reveal", () => ({ Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const NOW = new Date("2026-11-14T12:00:00+03:00");
const AFTER_ALL = new Date("2027-01-14T12:00:00+03:00");
const LABELS = { verified: "verified", needsReverification: "needs re-verification" };

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function at(now: Date) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
}

const allClaims = publicRegistry.flatMap((r) => r.claims);

describe("isClaimPresentable", () => {
  const claim = (expiresAt: string) => ({ expiresAt });

  it("refuses a claim whose window closed before now", () => {
    expect(isClaimPresentable(claim("2026-09-24"), NOW)).toBe(false);
  });

  it("boundary: valid through its own date, withheld from the first instant of the next day (site zone)", () => {
    expect(isClaimPresentable(claim("2027-01-13"), new Date("2027-01-13T23:59:59+03:00"))).toBe(true);
    expect(isClaimPresentable(claim("2027-01-13"), new Date("2027-01-14T00:00:00+03:00"))).toBe(false);
  });

  it("presents a claim that has not expired", () => {
    expect(isClaimPresentable(claim("2027-01-13"), NOW)).toBe(true);
  });
});

describe("today's registry through the gate", () => {
  it("NOW=2026-11-14: all 4 claims are presentable; the two expired Burun Farkı claims no longer exist in the registry", () => {
    expect(allClaims).toHaveLength(4);
    const presentable = publicRegistry.flatMap((r) => listPresentableClaims(r, NOW));
    expect(presentable).toHaveLength(4);
    expect(allClaims.some((c) => c.id.startsWith("burunfarki-"))).toBe(false);
    expect(allClaims.filter((c) => !isClaimPresentable(c, NOW))).toEqual([]);
  });

  it("NOW=2027-01-14: the four renewed claims close the gate by themselves; nothing remains presentable", () => {
    expect(publicRegistry.flatMap((r) => listPresentableClaims(r, AFTER_ALL))).toHaveLength(0);
    expect(allClaims.filter((c) => !isClaimPresentable(c, AFTER_ALL))).toHaveLength(4);
  });

  it("warns about the 4 claims that expire within 30 days of 2026-12-20", () => {
    expect(listClaimsExpiringWithin(publicRegistry, NOW, 30)).toHaveLength(0);
    const soon = listClaimsExpiringWithin(publicRegistry, new Date("2026-12-20T12:00:00+03:00"), 30);
    expect(soon).toHaveLength(4);
    expect(new Set(soon.map((s) => s.expiresAt))).toEqual(new Set(["2027-01-13"]));
  });

  it("presenter never calls an expired claim verified", () => {
    for (const now of [NOW, AFTER_ALL]) {
      for (const record of publicRegistry) {
        for (const p of presentClaims(record, now)) {
          if (p.claim.expiresAt && isExpired(p.claim.expiresAt, now)) expect(p.kind).not.toBe("verified");
        }
      }
    }
  });
});

describe("/transparency", () => {
  async function body(now: Date) {
    at(now);
    const ui = await TransparencyPage({ params: Promise.resolve({ locale: "tr" }) });
    render(
      <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul">
        {ui}
      </NextIntlClientProvider>,
    );
    return document.body.textContent ?? "";
  }

  it("NOW=2026-11-14: every claim keeps its statement; no lapsed marker and no Burun Farkı claim is rendered", async () => {
    const text = await body(NOW);
    for (const c of allClaims) expect(text).toContain(c.statementTr);
    expect(text).not.toMatch(/süre \d{4}-\d{2}-\d{2} tarihinde doldu/);
    expect(text).not.toContain("burunfarki-topk-accuracy");
    expect(text).not.toContain("burunfarki-explainability");
  });

  it("NOW=2027-01-14: no claim statement is shown, dated marker stays", async () => {
    const text = await body(AFTER_ALL);
    for (const c of allClaims) expect(text).not.toContain(c.statementTr);
    expect(text).toContain("süre 2027-01-13 tarihinde doldu");
  });

  it("two renders at different clocks change the lapsed-marker count (SEC-WEB-01a)", async () => {
    const lapsed = (t: string) => t.match(/süre \d{4}-\d{2}-\d{2} tarihinde doldu/g)?.length ?? 0;
    const before = lapsed(await body(NOW));
    cleanup();
    const after = lapsed(await body(AFTER_ALL));
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(before);
  });
});

describe("StatCards", () => {
  function render_(slug: string, now: Date) {
    const config = projects.find((p) => p.slug === slug) ?? { stats: [] };
    const stats = slug === FIXTURE_ACCURACY_RECORD.slug ? WITHDRAWN_BF_STATS : config.stats;
    const record = slug === FIXTURE_ACCURACY_RECORD.slug ? FIXTURE_ACCURACY_RECORD : publicRegistry.find((r) => r.slug === slug)!;
    return render(
      <StatCards slug={slug} stats={stats} record={record} locale="en" now={now} labels={LABELS} />,
    );
  }

  it("withholds the three figures of a lapsed claim and shows the re-verification marker (synthetic claim, expired 2026-09-24)", () => {
    const { container } = render_(FIXTURE_ACCURACY_RECORD.slug, NOW);
    const text = container.textContent ?? "";
    for (const figure of ["~29%", "~62%", "1,225"]) expect(text).not.toContain(figure);
    expect(text.match(/needs re-verification/g)).toHaveLength(3);
  });

  it("shows a figure whose claim is still open (LifeOS at 2026-11-14) and withholds it after 2027-01-13", () => {
    const config = projects.find((p) => p.slug === "lifeos")!;
    const linked = config.stats.find((s) => s.claimId)!;
    const before = render_("lifeos", NOW);
    expect(before.container.textContent).toContain(linked.value);
    cleanup();
    const after = render_("lifeos", AFTER_ALL);
    expect(after.container.textContent).not.toContain(linked.value);
  });
});

describe("home experience data and overlay", () => {
  it("NOW=2026-11-14: all 4 claims travel intact; no Burun Farkı claim exists to redact", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", NOW));
    expect(items).toHaveLength(4);
    expect(items.filter((i) => i.withheld)).toEqual([]);
    expect(items.map((i) => i.id)).not.toContain("burunfarki-topk-accuracy");
    expect(items.map((i) => i.id)).not.toContain("burunfarki-explainability");
    const intact = items.filter((i) => !i.withheld);
    expect(intact).toHaveLength(4);
    expect(intact.every((i) => i.statement !== "")).toBe(true);
  });

  it("NOW=2027-01-14: all 4 claims travel redacted", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", AFTER_ALL));
    expect(items).toHaveLength(4);
    for (const i of items) {
      expect(i.withheld).toBe(true);
      expect([i.statement, i.scope, i.source, i.figure ?? ""]).toEqual(["", "", "", ""]);
    }
  });

  it("overlay hides the statement once the client date passes expiresAt, keeping dates and the stale label", () => {
    const record = publicRegistry.find((r) => r.slug === "braavolabs")!;
    const claims = toExperienceClaims(record, "en", NOW);
    expect(claims.every((c) => !c.withheld)).toBe(true);
    expect(claims.length).toBeGreaterThan(0);
    const copy = { proof: { stale: "STALE", verified: "VERIFIED", freshnessPending: "PENDING", source: "S", scope: "SC", refreshDue: "DUE" } } as unknown as ExperienceCopy;
    const product = { claims, lifecycle: "beta" } as unknown as ExperienceProduct;
    const live = render(<ProofLedger copy={copy} product={product} today="2026-11-14" />);
    expect(live.container.textContent).toContain(claims[0].statement);
    cleanup();
    const lapsed = render(<ProofLedger copy={copy} product={product} today="2027-01-14" />);
    expect(lapsed.container.textContent).not.toContain(claims[0].statement);
    expect(screen.getAllByText("STALE").length).toBe(claims.length);
    expect(lapsed.container.textContent).toContain(claims[0].expiresAt);
  });
});

describe("Burun Farkı: the two expired claims were removed (founder, 2026-11-18)", () => {
  const bf = publicRegistry.find((r) => r.slug === "burunfarki")!;

  it.each([
    ["2026-11-14", NOW],
    ["2027-01-14", AFTER_ALL],
  ])("the product record carries no claim, so nothing is presentable or narrated at %s", (_label, now) => {
    expect(bf).toBeTruthy();
    expect(bf.claims).toEqual([]);
    expect(listPresentableClaims(bf, now)).toEqual([]);
    expect(presentClaims(bf, now)).toEqual([]);
    expect(toExperienceClaims(bf, "en", now)).toEqual([]);
  });

  it("neither removed id exists anywhere in the registry", () => {
    const ids = allClaims.map((c) => c.id);
    expect(ids).not.toContain("burunfarki-topk-accuracy");
    expect(ids).not.toContain("burunfarki-explainability");
  });

  it("the burunfarki- id prefix carries no special meaning any more", () => {
    expect(isClaimPresentable({ id: "burunfarki-x", expiresAt: "2026-09-24" }, NOW)).toBe(false);
    expect(isClaimPresentable({ id: "burunfarki-x", expiresAt: "2027-01-13" }, NOW)).toBe(true);
    expect(isClaimPresentable({ id: "other-x", expiresAt: "2026-09-24" }, NOW)).toBe(false);
  });

  it("at the same NOW the four remaining claims are untouched", () => {
    const others = publicRegistry.flatMap((r) => r.claims);
    expect(others).toHaveLength(4);
    expect(others.every((c) => isClaimPresentable(c, NOW))).toBe(true);
    expect(others.filter((c) => c.expiresAt && isExpired(c.expiresAt, NOW))).toEqual([]);
  });

  it("the Burun Farkı product config carries no stat, so no figure can reach the page", () => {
    const config = projects.find((p) => p.slug === "burunfarki")!;
    expect(config.stats).toEqual([]);
  });
});

describe("ProofCard (synthetic claim) — lapsed card is redacted", () => {
  const bfClaim = {
    id: FIXTURE_ACCURACY_CLAIM_ID,
    statementTr: "BF ifade",
    statementEn: "BF statement",
    evidenceKind: "measured" as const,
    source: "https://burunfark.com/dogruluk",
    scopeTr: "BF kapsam",
    scopeEn: "BF scope",
    owner: "Burun Farkı",
    verifiedAt: "2026-08-25",
    expiresAt: "2026-09-24",
  };

  it("lapsed card shows no sentence, no scope, no source link; keeps the dated marker", () => {
    const { container } = render(
      <ProofCard presented={{ kind: "lapsed", claim: bfClaim, expiredOn: "2026-09-24" }} locale="en" />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("BF statement");
    expect(text).not.toContain("BF scope");
    expect(container.querySelector("a")).toBeNull();
    expect(text).toContain("2026-09-24");
  });

  it("in-window card keeps the bright text-ink-100 sentence, no border override, no re-verification label", () => {
    const { container } = render(<ProofCard presented={{ kind: "verified", claim: bfClaim }} locale="en" />);
    expect(container.querySelector("p")!.className).toBe("text-[15px] leading-[1.7] text-ink-100");
    expect(container.querySelector("li")!.getAttribute("style")).toBeNull();
    expect(container.textContent).toContain("verified 2026-08-25");
    expect(container.textContent).not.toMatch(/re-verification/);
  });
});
