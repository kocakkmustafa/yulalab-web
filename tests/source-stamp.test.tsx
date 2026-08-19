// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SourceStamp } from "@/components/common/SourceStamp";
import { publicRegistry } from "@/data/public-registry";

afterEach(cleanup);

const base = {
  evidenceKind: "measured" as const,
  verifiedAt: "2026-07-23",
  locale: "en" as const,
};

describe("a publicly checkable source", () => {
  it("is a real followable link", () => {
    render(<SourceStamp {...base} source="https://burunfark.com/model-performance" />);
    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.href).toBe("https://burunfark.com/model-performance");
  });
});

describe("an internal record", () => {
  const internal = "ventures/lifeos/app/lib/core/database/encryption_key_manager.dart";

  it("is never rendered as a link the reader cannot open", () => {
    render(<SourceStamp {...base} source={internal} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says plainly that it is an internal record", () => {
    // Showing a private repo path under the word "source" invites the
    // reader to go check something they have no access to. Naming it is the
    // difference between provenance and provenance theatre.
    render(<SourceStamp {...base} source={internal} />);
    expect(screen.getByText(/internal record/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(internal.slice(0, 30)))).toBeTruthy();
  });

  it("says it in Turkish too", () => {
    render(<SourceStamp {...base} locale="tr" source={internal} />);
    expect(screen.getByText(/iç kayıt/i)).toBeTruthy();
  });
});

describe("the real registry", () => {
  it("stores every public source with a scheme so it can be followed", () => {
    // burunfark.com/model-performance was stored without https://, so the
    // one genuinely public source on the site rendered as dead text.
    const looksLikeDomain = /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i;
    for (const record of publicRegistry) {
      for (const claim of record.claims) {
        expect(
          looksLikeDomain.test(claim.source),
          `${record.slug}/${claim.id}: source "${claim.source}" looks like a URL but has no scheme`,
        ).toBe(false);
      }
      for (const surface of record.surfaces) {
        expect(
          looksLikeDomain.test(surface.source),
          `${record.slug}/${surface.kind}: source "${surface.source}" looks like a URL but has no scheme`,
        ).toBe(false);
      }
    }
  });
});
