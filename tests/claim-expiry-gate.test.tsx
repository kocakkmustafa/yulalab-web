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
import { WITHDRAWN_BF_STATS } from "./fixtures/withdrawn-bf-stats";
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
  it("NOW=2026-11-14: 4 of 6 claims are presentable; the two expired Burun Farkı claims are withheld like any other lapsed claim", () => {
    expect(allClaims).toHaveLength(6);
    const presentable = publicRegistry.flatMap((r) => listPresentableClaims(r, NOW));
    expect(presentable).toHaveLength(4);
    expect(presentable.some((c) => c.id.startsWith("burunfarki-"))).toBe(false);
    const hidden = allClaims.filter((c) => !isClaimPresentable(c, NOW));
    expect(hidden.map((c) => c.id).sort()).toEqual(["burunfarki-explainability", "burunfarki-topk-accuracy"]);
  });

  it("NOW=2027-01-14: the four renewed claims close the gate by themselves; nothing remains presentable", () => {
    expect(publicRegistry.flatMap((r) => listPresentableClaims(r, AFTER_ALL))).toHaveLength(0);
    expect(allClaims.filter((c) => !isClaimPresentable(c, AFTER_ALL))).toHaveLength(6);
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

  it("NOW=2026-11-14: renewed claims keep their statement; lapsed Burun Farkı statements are gone, dated marker stays", async () => {
    const text = await body(NOW);
    for (const c of allClaims) {
      if (c.id.startsWith("burunfarki-")) expect(text).not.toContain(c.statementTr);
      else expect(text).toContain(c.statementTr);
    }
    expect(text).toContain("süre 2026-09-24 tarihinde doldu");
    expect(text).toContain("süre 2026-09-18 tarihinde doldu");
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
    expect(before).toBe(2);
    expect(after).toBeGreaterThan(before);
  });
});

describe("StatCards", () => {
  function render_(slug: string, now: Date) {
    const config = projects.find((p) => p.slug === slug)!;
    const stats = slug === "burunfarki" ? WITHDRAWN_BF_STATS : config.stats;
    const record = publicRegistry.find((r) => r.slug === slug)!;
    return render(
      <StatCards slug={slug} stats={stats} record={record} locale="en" now={now} labels={LABELS} />,
    );
  }

  it("withholds the three Burun Farkı figures and shows the re-verification marker (lapsed, no exemption)", () => {
    const { container } = render_("burunfarki", NOW);
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
  it("NOW=2026-11-14: the 4 renewed claims travel intact, the 2 lapsed Burun Farkı claims travel redacted", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", NOW));
    expect(items).toHaveLength(6);
    const redacted = items.filter((i) => i.withheld);
    expect(redacted.map((i) => i.id).sort()).toEqual(["burunfarki-explainability", "burunfarki-topk-accuracy"]);
    for (const i of redacted) expect([i.statement, i.scope, i.source, i.figure ?? ""]).toEqual(["", "", "", ""]);
    const intact = items.filter((i) => !i.withheld);
    expect(intact).toHaveLength(4);
    expect(intact.every((i) => i.statement !== "")).toBe(true);
  });

  it("NOW=2027-01-14: all 6 claims travel redacted", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", AFTER_ALL));
    expect(items).toHaveLength(6);
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

describe("Burun Farkı: önce=sonra yerine gizlendi", () => {
  // The Burun Farkı exemption is gone: its lapsed claims are withheld like any other.
  const bf = publicRegistry.find((r) => r.slug === "burunfarki")!;
  const BF_IDS = ["burunfarki-explainability", "burunfarki-topk-accuracy"];

  it.each([
    ["2026-11-14", NOW],
    ["2027-01-14", AFTER_ALL],
  ])("no Burun Farkı claim is presentable and none narrates at %s", (_label, now) => {
    expect(listPresentableClaims(bf, now)).toEqual([]);
    expect(bf.claims.some((c) => isClaimPresentable(c, now))).toBe(false);
    const items = toExperienceClaims(bf, "en", now);
    expect(items.map((i) => i.id).sort()).toEqual(BF_IDS);
    for (const item of items) {
      expect(item.withheld).toBe(true);
      expect([item.statement, item.scope, item.source, item.figure ?? ""]).toEqual(["", "", "", ""]);
      expect(item.expiresAt).toBeTruthy();
    }
    expect(presentClaims(bf, now).filter((p) => p.claim.id === "burunfarki-topk-accuracy")[0].kind).toBe("lapsed");
  });

  it("the burunfarki- id prefix carries no special meaning any more", () => {
    expect(isClaimPresentable({ id: "burunfarki-x", expiresAt: "2026-09-24" }, NOW)).toBe(false);
    expect(isClaimPresentable({ id: "burunfarki-x", expiresAt: "2027-01-13" }, NOW)).toBe(true);
    expect(isClaimPresentable({ id: "other-x", expiresAt: "2026-09-24" }, NOW)).toBe(false);
  });

  it("at the same NOW the four renewed claims are untouched", () => {
    const others = publicRegistry.filter((r) => r.slug !== "burunfarki").flatMap((r) => r.claims);
    expect(others).toHaveLength(4);
    expect(others.every((c) => isClaimPresentable(c, NOW))).toBe(true);
    expect(others.filter((c) => c.expiresAt && isExpired(c.expiresAt, NOW))).toEqual([]);
  });

  it("the Burun Farkı product page renders with no claim narration, no empty card", () => {
    const config = projects.find((p) => p.slug === "burunfarki")!;
    expect(config.stats).toEqual([]);
    const { container } = render(
      <StatCards slug="burunfarki" stats={WITHDRAWN_BF_STATS} record={bf} locale="en" now={AFTER_ALL} labels={LABELS} />,
    );
    const text = container.textContent ?? "";
    for (const figure of ["~29%", "~62%", "1,225"]) expect(text).not.toContain(figure);
    expect(text.match(/needs re-verification/g)).toHaveLength(3);
  });
});

describe("Burun Farkı ProofCard — lapsed card is redacted", () => {
  const bfClaim = {
    id: "burunfarki-topk-accuracy",
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

  it("lapsed BF card shows no sentence, no scope, no source link; keeps the dated marker", () => {
    const { container } = render(
      <ProofCard presented={{ kind: "lapsed", claim: bfClaim, expiredOn: "2026-09-24" }} locale="en" />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("BF statement");
    expect(text).not.toContain("BF scope");
    expect(container.querySelector("a")).toBeNull();
    expect(text).toContain("2026-09-24");
  });

  it("in-window BF-id card keeps the bright text-ink-100 sentence, no border override, no re-verification label", () => {
    const { container } = render(<ProofCard presented={{ kind: "verified", claim: bfClaim }} locale="en" />);
    expect(container.querySelector("p")!.className).toBe("text-[15px] leading-[1.7] text-ink-100");
    expect(container.querySelector("li")!.getAttribute("style")).toBeNull();
    expect(container.textContent).toContain("verified 2026-08-25");
    expect(container.textContent).not.toMatch(/re-verification/);
  });
});
