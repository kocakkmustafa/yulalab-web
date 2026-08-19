// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatCards } from "@/components/projects/StatCards";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";

afterEach(cleanup);

const LABELS = { verified: "verified", needsReverification: "needs re-verification" };
const bf = projects.find((p) => p.slug === "burunfarki")!;
const bfRecord = publicRegistry.find((r) => r.slug === "burunfarki")!;

function renderStats(now: Date) {
  return render(
    <StatCards stats={bf.stats} record={bfRecord} locale="en" now={now} labels={LABELS} />,
  );
}

const FRESH = new Date("2026-08-19T12:00:00+03:00");
const LATE = new Date("2099-01-01T12:00:00+03:00");

describe("a stat backed by a claim", () => {
  it("shows when it was verified", () => {
    renderStats(FRESH);
    const claim = bfRecord.claims.find((c) => c.id === "burunfarki-topk-accuracy")!;
    expect(screen.getAllByText(new RegExp(`verified ${claim.verifiedAt}`)).length).toBeGreaterThan(0);
  });

  it("goes stale WITH the claim, in words", () => {
    // The defect: the claim card below said "needs re-verification" while
    // the 42px figure above kept asserting the number as current.
    renderStats(LATE);
    expect(screen.getAllByText(/needs re-verification/i).length).toBeGreaterThan(0);
  });

  it("stops showing a verification date once stale", () => {
    renderStats(LATE);
    expect(screen.queryByText(/verified 2026-07-23/)).toBeNull();
  });

  it("marks BOTH figures the claim covers, not just one", () => {
    // Top-1 and Top-3 come from one claim; flagging only one would leave the
    // other asserting a lapsed number.
    renderStats(LATE);
    expect(screen.getAllByText(/needs re-verification/i)).toHaveLength(2);
  });
});

describe("a stat with no claim behind it", () => {
  it("renders plainly, with no invented provenance", () => {
    // "13.587 races" has no registry claim. Stamping it with a date we do
    // not have would be worse than leaving it plain.
    renderStats(FRESH);
    const races = screen.getByText("13.587").closest("div")!.parentElement!;
    expect(races.textContent).not.toMatch(/verified/i);
  });

  it("still renders the value", () => {
    renderStats(FRESH);
    expect(screen.getByText("13.587")).toBeTruthy();
    expect(screen.getByText("130.930")).toBeTruthy();
  });
});

describe("empty case", () => {
  it("renders nothing when a product has no stats", () => {
    const { container } = render(
      <StatCards stats={[]} record={undefined} locale="en" now={FRESH} labels={LABELS} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("does not crash when a product has stats but no registry record", () => {
    render(
      <StatCards stats={bf.stats} record={undefined} locale="en" now={FRESH} labels={LABELS} />,
    );
    expect(screen.getByText("~%61")).toBeTruthy();
    expect(screen.queryByText(/verified/i)).toBeNull();
  });
});
