import { describe, expect, it } from "vitest";
import {
  EVENT_NAMES,
  EVENT_VERSION,
  LOCALES,
  parseEventPayload,
  outboundHostAllowlist,
} from "@/lib/analytics/events";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

// A payload that must always pass, so every "make one thing wrong" test
// below isolates the single rule it is checking.
function valid(overrides: Record<string, unknown> = {}) {
  return {
    v: EVENT_VERSION,
    event: "store_outbound",
    locale: "tr",
    page: "/projects/lifeos",
    product: "lifeos",
    target: "https://apps.apple.com/tr/app/id123",
    targetCategory: "store",
    session: "a".repeat(32),
    ...overrides,
  };
}

describe("event allowlist", () => {
  it("carries the anonymous interaction events but not the server-bound qualification verdict", () => {
    // Guards against someone quietly narrowing the funnel: the roadmap lists
    // 13 by name, so the contract must carry all 13.
    //
    // Qualification is a server-bound property of an accepted lead. Keeping
    // it here lets an anonymous caller inflate the numerator without a lead.
    expect(EVENT_NAMES).toEqual([
      "home_primary_cta",
      "products_filter_changed",
      "product_view",
      "product_primary_cta",
      "store_outbound",
      "demo_request_started",
      "demo_request_submitted",
      "case_study_view",
      "case_study_cta",
      "studio_view",
      "studio_application_started",
      "studio_application_submitted",
      "support_outbound",
      "home_view",
      "lead_form_started",
      "lead_form_submitted",
    ]);
  });

  it.each(["home_view", "lead_form_started", "lead_form_submitted"])(
    "accepts the WEB-P1-03 funnel event %s without a target",
    (event) => {
      const result = parseEventPayload(
        valid({ event, target: undefined, targetCategory: undefined, product: undefined, page: "/" }),
      );
      expect(result.ok, result.ok ? "" : result.reason).toBe(true);
    },
  );

  it.each(["home_view", "lead_form_started", "lead_form_submitted"])(
    "rejects %s when it carries a target",
    (event) => {
      const result = parseEventPayload(valid({ event }));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/must not carry a target/i);
    },
  );

  it("rejects an event name that is one character off a new funnel name", () => {
    expect(parseEventPayload(valid({ event: "home_views", target: undefined, targetCategory: undefined })).ok).toBe(false);
    expect(parseEventPayload(valid({ event: "lead_form_submit", target: undefined, targetCategory: undefined })).ok).toBe(false);
  });

  it("rejects an unknown event name", () => {
    const result = parseEventPayload(valid({ event: "definitely_not_an_event" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unknown event/i);
  });

  it("accepts a well-formed payload", () => {
    const result = parseEventPayload(valid());
    expect(result.ok).toBe(true);
  });

  it("security correction: rejects anonymous studio qualification even without a target", () => {
    const result = parseEventPayload(valid({ event: "studio_application_qualified" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unknown event/i);

    const targetless = parseEventPayload(
      valid({ event: "studio_application_qualified", target: undefined, targetCategory: undefined }),
    );
    expect(targetless.ok).toBe(false);
    if (!targetless.ok) expect(targetless.reason).toMatch(/unknown event/i);
  });
});

describe("no free text, no PII", () => {
  // The dangerous failure is not "rejects PII" — it is "accepts the request
  // and silently drops the field", which lets a caller believe personal data
  // was handled when it was actually discarded (or, worse, later logged).
  it.each(["email", "name", "message", "phone", "userId", "notes"])(
    "rejects an unknown field %s instead of silently dropping it",
    (field) => {
      const result = parseEventPayload(valid({ [field]: "kaan@example.com" }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/unknown field/i);
        // The key name may appear (developers need it); the VALUE must not,
        // because the reason string ends up in logs.
        expect(result.reason).not.toContain("kaan@example.com");
      }
    },
  );

  it("rejects a UTM value containing free text", () => {
    const result = parseEventPayload(valid({ campaign: "hello there, my email is a@b.co" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/campaign/i);
  });

  it("rejects an over-long UTM value", () => {
    const result = parseEventPayload(valid({ campaign: "a".repeat(65) }));
    expect(result.ok).toBe(false);
  });

  it("rejects a page path carrying a query string", () => {
    // Query strings are where personal data leaks into analytics; the
    // contract stores paths only.
    const result = parseEventPayload(valid({ page: "/contact?email=a@b.co" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/page/i);
  });

  it("rejects a page value that is an absolute URL", () => {
    expect(parseEventPayload(valid({ page: "https://evil.example/x" })).ok).toBe(false);
  });
});

describe("field shapes", () => {
  it("rejects a wrong event version", () => {
    expect(parseEventPayload(valid({ v: 99 })).ok).toBe(false);
  });

  it("accepts exactly the 14 public site locales, derived from the routing list", () => {
    expect([...LOCALES]).toEqual([...SUPPORTED_LOCALES]);
    expect(LOCALES).toHaveLength(14);
    for (const locale of SUPPORTED_LOCALES) {
      const result = parseEventPayload(valid({ locale }));
      expect(result.ok, `${locale}: ${result.ok ? "" : result.reason}`).toBe(true);
    }
  });

  it.each(["fr-CA", "zh", "ES-419", "pt", "ru", "", "tr "])("rejects the locale %j outside the 14", (locale) => {
    expect(parseEventPayload(valid({ locale })).ok).toBe(false);
  });

  it("rejects a product slug that is not in the public registry", () => {
    // Ties the funnel to the single source of truth (Y-P0-003) — an event
    // about a product the site does not publish is a bug, not data.
    const result = parseEventPayload(valid({ product: "not-a-product" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/product/i);
  });

  it("accepts every real registry slug", () => {
    for (const record of publicRegistry) {
      const result = parseEventPayload(
        valid({ product: record.slug, event: "product_view", target: undefined, targetCategory: undefined }),
      );
      expect(result.ok, `${record.slug} should be a valid product`).toBe(true);
    }
  });

  it("rejects a session token of the wrong shape", () => {
    expect(parseEventPayload(valid({ session: "short" })).ok).toBe(false);
    expect(parseEventPayload(valid({ session: "!".repeat(32) })).ok).toBe(false);
  });

  it("requires a session token", () => {
    expect(parseEventPayload(valid({ session: undefined })).ok).toBe(false);
  });
});

describe("outbound targets", () => {
  it("rejects a non-https target", () => {
    expect(parseEventPayload(valid({ target: "http://apps.apple.com/x" })).ok).toBe(false);
    expect(parseEventPayload(valid({ target: "javascript:alert(1)" })).ok).toBe(false);
  });

  it("rejects an outbound target whose host is not published in the registry", () => {
    // Without this the endpoint is an open logging relay: anyone could
    // record arbitrary URLs against our attribution table.
    const result = parseEventPayload(valid({ target: "https://evil.example/steal" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/target/i);
  });

  it("builds its host allowlist from the registry, not a hardcoded list", () => {
    const hosts = outboundHostAllowlist();
    expect(hosts.size).toBeGreaterThan(0);
    // Every registry surface URL's host must be reachable as an outbound.
    for (const record of publicRegistry) {
      for (const surface of record.surfaces) {
        if (!surface.url) continue;
        const host = new URL(surface.url).host;
        expect(hosts.has(host), `${host} (from ${record.slug}) should be allowlisted`).toBe(true);
      }
    }
  });

  it("allowlists every outbound URL the site actually renders", () => {
    // Regression guard for a defect a real browser found and the unit
    // tests missed: the first version derived the allowlist from the
    // public registry alone, so LifeOS's own primary CTA
    // (lifeos-legal.vercel.app, which lives only in ProjectConfig.links)
    // was rejected with a 400 on click. Any published link the site can
    // render must be reportable.
    const hosts = outboundHostAllowlist();
    for (const project of projects) {
      for (const link of project.links) {
        if (!link.href) continue;
        const host = new URL(link.href).host;
        expect(hosts.has(host), `${host} (${project.slug}/${link.kind}) must be allowlisted`).toBe(true);
      }
    }
  });

  it("rejects a target on an internal-only event", () => {
    const result = parseEventPayload(
      valid({ event: "products_filter_changed", target: "https://apps.apple.com/x" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/target/i);
  });

  it("requires a target on an outbound event", () => {
    const result = parseEventPayload(valid({ target: undefined, targetCategory: undefined }));
    expect(result.ok).toBe(false);
  });
});
