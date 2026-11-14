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
import { toExperienceClaims } from "@/lib/experience-claims";
import { presentClaims } from "@/lib/proof";
import {
  isClaimPresentable,
  isExpired,
  listClaimsExpiringWithin,
  listPresentableClaims,
  validateRegistry,
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
const AFTER_ALL = new Date("2026-12-09T12:00:00+03:00");
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
    expect(isClaimPresentable(claim("2026-12-08"), new Date("2026-12-08T23:59:59+03:00"))).toBe(true);
    expect(isClaimPresentable(claim("2026-12-08"), new Date("2026-12-09T00:00:00+03:00"))).toBe(false);
  });

  it("presents a claim that has not expired", () => {
    expect(isClaimPresentable(claim("2026-12-08"), NOW)).toBe(true);
  });
});

describe("today's registry through the gate", () => {
  it("NOW=2026-11-14: 6 of 6 claims are presentable (the two expired Burun Farkı claims are exempt)", () => {
    expect(allClaims).toHaveLength(6);
    expect(publicRegistry.flatMap((r) => listPresentableClaims(r, NOW))).toHaveLength(6);
  });

  it("NOW=2026-12-09: the four non-Burun-Farkı claims close the gate by themselves; only the 2 exempt ones remain", () => {
    const presentable = publicRegistry.flatMap((r) => listPresentableClaims(r, AFTER_ALL));
    expect(presentable.map((c) => c.id).sort()).toEqual(["burunfarki-explainability", "burunfarki-topk-accuracy"]);
    const hidden = allClaims.filter((c) => !isClaimPresentable(c, AFTER_ALL));
    expect(hidden).toHaveLength(4);
    expect(hidden.some((c) => c.id.startsWith("burunfarki-"))).toBe(false);
  });

  it("warns about the 4 claims that expire within 30 days of 2026-11-14", () => {
    const soon = listClaimsExpiringWithin(publicRegistry, NOW, 30);
    expect(soon).toHaveLength(4);
    expect(new Set(soon.map((s) => s.expiresAt))).toEqual(new Set(["2026-12-08"]));
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

  it("NOW=2026-11-14: every claim keeps its statement (Burun Farkı lapsed ones as on main)", async () => {
    const text = await body(NOW);
    for (const c of allClaims) expect(text).toContain(c.statementTr);
    expect(text).toContain("süre 2026-09-24 tarihinde doldu");
    expect(text).toContain("süre 2026-09-18 tarihinde doldu");
  });

  it("NOW=2026-12-09: non-Burun-Farkı statements are gone, dated marker stays; Burun Farkı unchanged", async () => {
    const text = await body(AFTER_ALL);
    for (const c of allClaims) {
      if (c.id.startsWith("burunfarki-")) expect(text).toContain(c.statementTr);
      else expect(text).not.toContain(c.statementTr);
    }
    expect(text).toContain("süre 2026-12-08 tarihinde doldu");
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
    const record = publicRegistry.find((r) => r.slug === slug)!;
    return render(
      <StatCards slug={slug} stats={config.stats} record={record} locale="en" now={now} labels={LABELS} />,
    );
  }

  it("keeps the three Burun Farkı figures and their re-verification marker (exempt, as on main)", () => {
    const { container } = render_("burunfarki", NOW);
    expect([...container.querySelectorAll("bdi")].map((n) => n.textContent)).toEqual(["~29%", "~62%", "1,225"]);
    expect(container.textContent?.match(/needs re-verification/g)).toHaveLength(3);
  });

  it("shows a figure whose claim is still open (LifeOS at 2026-11-14) and withholds it after 2026-12-08", () => {
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
  it("NOW=2026-11-14: every claim travels intact", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", NOW));
    expect(items).toHaveLength(6);
    expect(items.some((i) => i.withheld)).toBe(false);
    expect(items.every((i) => i.statement !== "")).toBe(true);
  });

  it("NOW=2026-12-09: the 4 gated claims travel redacted, the 2 Burun Farkı claims intact", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", AFTER_ALL));
    const redacted = items.filter((i) => i.withheld);
    expect(redacted).toHaveLength(4);
    for (const i of redacted) {
      expect(i.id.startsWith("burunfarki-")).toBe(false);
      expect([i.statement, i.scope, i.source, i.figure ?? ""]).toEqual(["", "", "", ""]);
    }
    expect(items.filter((i) => i.id.startsWith("burunfarki-")).every((i) => i.statement !== "")).toBe(true);
  });

  it("overlay hides the statement once the client date passes expiresAt, keeping dates and the stale label", () => {
    const record = publicRegistry.find((r) => r.slug === "braavolabs")!;
    const claims = toExperienceClaims(record, "en", NOW);
    expect(claims.every((c) => !c.withheld)).toBe(true);
    const copy = { proof: { stale: "STALE", verified: "VERIFIED", freshnessPending: "PENDING", source: "S", scope: "SC", refreshDue: "DUE" } } as unknown as ExperienceCopy;
    const product = { claims, lifecycle: "beta" } as unknown as ExperienceProduct;
    const live = render(<ProofLedger copy={copy} product={product} today="2026-11-14" />);
    expect(live.container.textContent).toContain(claims[0].statement);
    cleanup();
    const lapsed = render(<ProofLedger copy={copy} product={product} today="2026-12-09" />);
    expect(lapsed.container.textContent).not.toContain(claims[0].statement);
    expect(screen.getAllByText("STALE").length).toBe(claims.length);
    expect(lapsed.container.textContent).toContain(claims[0].expiresAt);
  });
});

describe("Burun Farkı önce=sonra", () => {
  // "Before" = main's behaviour: Burun Farkı claims are presented and rendered
  // with no gate. Everything below must match that, at both pinned dates.
  const bf = publicRegistry.find((r) => r.slug === "burunfarki")!;

  it.each([
    ["2026-11-14", NOW],
    ["2026-12-09", AFTER_ALL],
  ])("claim presentation and exports are unchanged at %s", (_label, now) => {
    expect(listPresentableClaims(bf, now)).toEqual(bf.claims);
    expect(bf.claims.every((c) => isClaimPresentable(c, now))).toBe(true);
    // Home data: identical to the pre-gate mapping (no `withheld`, full prose).
    for (const item of toExperienceClaims(bf, "en", now)) {
      const source = bf.claims.find((c) => c.id === item.id)!;
      expect(item).toEqual({
        id: source.id,
        figure: source.figures?.join(" · ") ?? null,
        statement: source.statementEn,
        evidenceKind: source.evidenceKind,
        evidenceLabel: item.evidenceLabel,
        source: source.source,
        scope: source.scopeEn,
        verifiedAt: source.verifiedAt,
        expiresAt: source.expiresAt,
      });
    }
    // Lapsed claims stay "lapsed" in the presenter, as before.
    expect(presentClaims(bf, now).filter((p) => p.claim.id === "burunfarki-topk-accuracy")[0].kind).toBe("lapsed");
  });

  it("StatCards figures and markers are unchanged long after expiry", () => {
    const config = projects.find((p) => p.slug === "burunfarki")!;
    const { container } = render(
      <StatCards slug="burunfarki" stats={config.stats} record={bf} locale="en" now={AFTER_ALL} labels={LABELS} />,
    );
    expect([...container.querySelectorAll("bdi")].map((n) => n.textContent)).toEqual(["~29%", "~62%", "1,225"]);
    expect(container.textContent?.match(/needs re-verification/g)).toHaveLength(3);
  });

  it("overlay shows Burun Farkı's lapsed statement with the stale label, as before", () => {
    const claims = toExperienceClaims(bf, "en", NOW);
    const copy = { proof: { stale: "STALE", verified: "VERIFIED", freshnessPending: "PENDING", source: "S", scope: "SC", refreshDue: "DUE" } } as unknown as ExperienceCopy;
    const product = { claims, lifecycle: "live" } as unknown as ExperienceProduct;
    const { container } = render(<ProofLedger copy={copy} product={product} today="2026-11-14" />);
    for (const c of claims) expect(container.textContent).toContain(c.statement);
    expect(screen.getAllByText("STALE")).toHaveLength(claims.length);
  });
});

describe("Burun Farkı önce=sonra — ProofCard (expected values are literals, not derived)", () => {
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

  it("lapsed BF card is byte-for-byte main's: dim text-ink-300 sentence, amber border, source link, scope, dated label", () => {
    const { container } = render(
      <ProofCard presented={{ kind: "lapsed", claim: bfClaim, expiredOn: "2026-09-24" }} locale="en" />,
    );
    expect(container.innerHTML).toBe(
      '<li class="glass p-6 h-full" style="border-color: rgba(251, 191, 36, 0.28);">' +
        '<p class="text-[15px] leading-[1.7] text-ink-300">BF statement</p>' +
        '<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.1em] uppercase text-ink-300">' +
        "<span>measured</span><span aria-hidden=\"true\">·</span><span>verified 2026-08-25</span>" +
        '<span aria-hidden="true">·</span><span class="text-amber-300/90 normal-case tracking-normal">needs re-verification — window closed 2026-09-24</span>' +
        '<span aria-hidden="true">·</span><a href="https://burunfark.com/dogruluk" target="_blank" rel="noreferrer" class="underline underline-offset-2 hover:text-ink-100 focusable">source</a>' +
        '<span aria-hidden="true">·</span><span class="normal-case tracking-normal text-ink-300 [overflow-wrap:anywhere]">BF scope</span>' +
        "</div></li>",
    );
  });

  it("in-window BF card keeps the bright text-ink-100 sentence, no border override, no re-verification label", () => {
    const { container } = render(<ProofCard presented={{ kind: "verified", claim: bfClaim }} locale="en" />);
    expect(container.querySelector("p")!.className).toBe("text-[15px] leading-[1.7] text-ink-100");
    expect(container.querySelector("li")!.getAttribute("style")).toBeNull();
    expect(container.textContent).toContain("verified 2026-08-25");
    expect(container.textContent).not.toMatch(/re-verification/);
  });
});

describe("validateRegistry — burunfarki- prefix is reserved for the burunfarki record", () => {
  const base = publicRegistry.find((r) => r.slug === "burunfarki")!;
  const other = publicRegistry.find((r) => r.slug === "lifeos")!;

  it("accepts the real registry", () => {
    expect(validateRegistry(publicRegistry).filter((e) => e.includes("reserved"))).toEqual([]);
  });

  it("rejects the prefix on another product's claim", () => {
    const bad = { ...other, claims: [{ ...other.claims[0], id: "burunfarki-sneaky" }] };
    expect(validateRegistry([bad]).some((e) => e.includes("lifeos: claim burunfarki-sneaky") && e.includes("reserved"))).toBe(true);
  });

  it("rejects a burunfarki claim without the prefix", () => {
    const bad = { ...base, claims: [{ ...base.claims[0], id: "topk-accuracy" }] };
    expect(validateRegistry([bad]).some((e) => e.includes("burunfarki: claim topk-accuracy") && e.includes("reserved"))).toBe(true);
  });
});
