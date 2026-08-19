// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatCards } from "@/components/projects/StatCards";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";

afterEach(cleanup);

const LABELS = { verified: "verified", needsReverification: "needs re-verification" };

function product(slug: string) {
  const config = projects.find((p) => p.slug === slug)!;
  const record = publicRegistry.find((r) => r.slug === slug)!;
  return { config, record };
}

/**
 * Boundary instants are DERIVED from the claim rather than hardcoded.
 *
 * The first version used FRESH=2026-08-19 / LATE=2099-01-01, which never
 * probed the real edge — burunfarki's claim expires 2026-08-22, so
 * `claim.expiresAt` was bound to nothing and a component that keyed
 * staleness off `now.getFullYear() >= 2099` passed the whole suite.
 */
function onExpiryDay(expiresAt: string): Date {
  return new Date(`${expiresAt}T12:00:00+03:00`);
}
function dayAfterExpiry(expiresAt: string): Date {
  return new Date(onExpiryDay(expiresAt).getTime() + 86_400_000);
}

function renderFor(slug: string, now: Date) {
  const { config, record } = product(slug);
  return render(
    <StatCards
      slug={slug}
      stats={config.stats}
      record={record}
      locale="en"
      now={now}
      labels={LABELS}
    />,
  );
}

describe("a stat backed by a claim", () => {
  const { record } = product("burunfarki");
  const claim = record.claims.find((c) => c.id === "burunfarki-topk-accuracy")!;

  it("shows the verification date on the last day the claim is valid", () => {
    renderFor("burunfarki", onExpiryDay(claim.expiresAt));
    expect(screen.getAllByText(new RegExp(`verified ${claim.verifiedAt}`)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/needs re-verification/i)).toBeNull();
  });

  it("flips to needing re-verification the very next day", () => {
    // The real boundary, one day either side — not a year 2099 sentinel.
    renderFor("burunfarki", dayAfterExpiry(claim.expiresAt));
    expect(screen.getAllByText(/needs re-verification/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(new RegExp(`verified ${claim.verifiedAt}`))).toBeNull();
  });

  it("marks BOTH figures the claim covers", () => {
    renderFor("burunfarki", dayAfterExpiry(claim.expiresAt));
    expect(screen.getAllByText(/needs re-verification/i)).toHaveLength(2);
  });
});

describe("resolving the right claim, not just any claim", () => {
  // Braavolabs' "14" links to its SECOND claim. Every earlier test rendered
  // burunfarki, where both linked stats point at claims[0] — so replacing
  // the lookup with `record.claims[0]` passed the entire suite.
  const { record } = product("braavolabs");
  const providerClaim = record.claims.find((c) => c.id === "braavolabs-provider-count")!;
  const primitiveClaim = record.claims.find((c) => c.id === "braavolabs-primitive-count")!;

  it("is not claims[0]", () => {
    expect(record.claims[0].id).not.toBe("braavolabs-provider-count");
  });

  it("uses each stat's own claim date", () => {
    renderFor("braavolabs", onExpiryDay(providerClaim.expiresAt));
    expect(screen.getAllByText(new RegExp(`verified ${providerClaim.verifiedAt}`)).length).toBeGreaterThan(0);
  });

  it("stales each linked stat on its own claim's schedule", () => {
    // If the lookup collapsed to claims[0], both cards would flip together.
    const dates = [primitiveClaim.expiresAt, providerClaim.expiresAt];
    const earliest = dates.slice().sort()[0];
    const latest = dates.slice().sort()[1];
    if (earliest === latest) return; // same schedule today; nothing to separate

    renderFor("braavolabs", dayAfterExpiry(earliest));
    expect(screen.getAllByText(/needs re-verification/i)).toHaveLength(1);
  });
});

describe("a stat with no claim behind it", () => {
  it("renders plainly, with no invented provenance", () => {
    const { record } = product("burunfarki");
    const claim = record.claims.find((c) => c.id === "burunfarki-topk-accuracy")!;
    renderFor("burunfarki", onExpiryDay(claim.expiresAt));
    const races = screen.getByText("13.587").closest("div")!.parentElement!;
    expect(races.textContent).not.toMatch(/verified/i);
  });

  it("still renders the value", () => {
    const { record } = product("burunfarki");
    const claim = record.claims.find((c) => c.id === "burunfarki-topk-accuracy")!;
    renderFor("burunfarki", onExpiryDay(claim.expiresAt));
    expect(screen.getByText("13.587")).toBeTruthy();
    expect(screen.getByText("130.930")).toBeTruthy();
  });
});

describe("empty and degraded cases", () => {
  it("renders nothing when a product has no stats", () => {
    const { container } = render(
      <StatCards slug="x" stats={[]} record={undefined} locale="en" now={new Date()} labels={LABELS} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("does not crash, or invent provenance, without a registry record", () => {
    const { config } = product("burunfarki");
    render(
      <StatCards
        slug="burunfarki"
        stats={config.stats}
        record={undefined}
        locale="en"
        now={new Date()}
        labels={LABELS}
      />,
    );
    expect(screen.getByText("~%61")).toBeTruthy();
    expect(screen.queryByText(/verified/i)).toBeNull();
  });
});
