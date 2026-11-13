// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import TransparencyPage from "@/app/[locale]/transparency/page";
import { StatCards } from "@/components/projects/StatCards";
import { ProofLedger } from "@/components/experience/ExperienceOverlay";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";
import { toExperienceClaims } from "@/lib/experience-claims";
import { presentClaims } from "@/lib/proof";
import {
  isClaimPresentable,
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
  it("NOW=2026-11-14: 4 of 6 claims are presentable, the two Burun Farkı claims are not", () => {
    const presentable = publicRegistry.flatMap((r) => listPresentableClaims(r, NOW));
    expect(allClaims).toHaveLength(6);
    expect(presentable).toHaveLength(4);
    expect(allClaims.filter((c) => !isClaimPresentable(c, NOW)).map((c) => c.id).sort()).toEqual([
      "burunfarki-explainability",
      "burunfarki-topk-accuracy",
    ]);
  });

  it("NOW=2026-12-09: the four remaining claims close the gate by themselves", () => {
    expect(publicRegistry.flatMap((r) => listPresentableClaims(r, AFTER_ALL))).toHaveLength(0);
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
          if (!isClaimPresentable(p.claim, now)) expect(p.kind).not.toBe("verified");
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

  it("NOW=2026-11-14: expired claims show a dated marker and no statement; live claims keep theirs", async () => {
    const text = await body(NOW);
    for (const c of allClaims) {
      if (isClaimPresentable(c, NOW)) expect(text).toContain(c.statementTr);
      else expect(text).not.toContain(c.statementTr);
    }
    expect(text).toContain("süre 2026-09-24 tarihinde doldu");
    expect(text).toContain("süre 2026-09-18 tarihinde doldu");
  });

  it("NOW=2026-12-09: no claim statement is published at all", async () => {
    const text = await body(AFTER_ALL);
    for (const c of allClaims) expect(text).not.toContain(c.statementTr);
    expect(text).toContain("süre 2026-12-08 tarihinde doldu");
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

  it("withholds the figures of an expired claim (Burun Farkı at 2026-11-14)", () => {
    const { container } = render_("burunfarki", NOW);
    expect([...container.querySelectorAll("bdi")].map((n) => n.textContent)).toEqual(["—", "—", "—"]);
    expect(container.textContent).not.toMatch(/29|62|1[.,]?225/);
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
  it("NOW=2026-11-14: expired claims travel redacted, live claims intact", () => {
    for (const record of publicRegistry) {
      for (const item of toExperienceClaims(record, "en", NOW)) {
        const source = record.claims.find((c) => c.id === item.id)!;
        if (isClaimPresentable(source, NOW)) {
          expect(item.withheld).toBe(false);
          expect(item.statement).toBe(source.statementEn);
        } else {
          expect(item.withheld).toBe(true);
          expect([item.statement, item.scope, item.source, item.figure ?? ""]).toEqual(["", "", "", ""]);
        }
      }
    }
  });

  it("NOW=2026-12-09: every claim travels redacted", () => {
    const items = publicRegistry.flatMap((r) => toExperienceClaims(r, "en", AFTER_ALL));
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.withheld && i.statement === "")).toBe(true);
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
