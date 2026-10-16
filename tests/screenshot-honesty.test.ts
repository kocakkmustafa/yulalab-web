import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { developmentPreviews } from "@/data/product-presentations";
import { describe, expect, it } from "vitest";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";

/**
 * Roadmap §1.4: no fabricated product screens, and a product without real UI
 * carries an explicit concept/research label.
 *
 * Dated, sourced development previews live outside the publication registry.
 * Product status and published screenshot eligibility remain independent. A rule
 * that holds by current practice rather than by construction is one edit
 * from not holding, and the edit that breaks it (adding a nice-looking
 * mockup to an unreleased product) is exactly the tempting one.
 */
type Shot = { kind?: string; src?: string };
type Visuals = { screenshots?: Shot[] };
type Config = { slug: string; status: string; visuals?: Visuals };

const configs = projects as unknown as Config[];

function productShots(config: Config): Shot[] {
  return (config.visuals?.screenshots ?? []).filter((s) => s.kind === "product");
}

describe("only a shipped product may show a product screenshot", () => {
  it.each(configs.map((c) => [c.slug, c.status] as const))(
    "%s (%s)",
    (slug, status) => {
      const config = configs.find((c) => c.slug === slug)!;
      const shots = productShots(config);
      const shipped = status === "live" || status === "beta";
      if (!shipped) {
        expect(
          shots,
          `${slug} is "${status}" but carries ${shots.length} product screenshot(s) — an unreleased product must not show a UI it does not have`,
        ).toHaveLength(0);
      }
    },
  );

  it("names which products are allowed to have one, so a status flip is deliberate", () => {
    const allowed = configs.filter((c) => c.status === "live" || c.status === "beta").map((c) => c.slug).sort();
    expect(allowed).toEqual(["braavolabs", "burunfarki", "lifeos"]);
  });
});

describe("the registry agrees with what the page can render", () => {
  it("declares no screenshots for a research product", () => {
    for (const record of publicRegistry) {
      if (record.lifecycle !== "research") continue;
      expect(
        record.screenshots,
        `${record.slug} is research but the registry declares screenshots`,
      ).toHaveLength(0);
    }
  });

  it("gives every declared screenshot a build and a capture date", () => {
    // Already enforced by validateRecord for live/beta; asserted here too so
    // the reason survives next to the honesty rule it serves — a screenshot
    // with no provenance is a picture, not evidence.
    for (const record of publicRegistry) {
      for (const shot of record.screenshots) {
        expect(shot.sourceBuild, `${record.slug}: screenshot ${shot.path} has no sourceBuild`).toBeTruthy();
        expect(shot.capturedAt, `${record.slug}: screenshot ${shot.path} has no capturedAt`).toBeTruthy();
      }
    }
  });
});


describe("approved identity and development sources", () => {
  it("keeps all five approved masters byte-identical in the site", () => {
    const expected = {
      ostinato: "6db03e9cdc6da965fc88ed28e6fd7f78aedf02a5d3fe4927bacffdd6b6a57b73",
      jablab: "94e23e1069f0f5f78c6503b12fc2e8e6edab340cfecb3b301bf5976188f7d8c2",
      choreia: "51148ac9504aed95bb952d3b1c67d6234708960ae2d667a8a4864218135659b4",
      lissom: "0d6f1fb86078b14edf3e3bcd65deef5a2c35d3c98fd5865c20932ca5d5c4a242",
      gravita: "d46a534d11c1c45dd5fde8c85bd8c02ab5d5cc205e502669d66a37c9d6190229",
    };
    for (const [slug, hash] of Object.entries(expected)) {
      const project = projects.find((p) => p.slug === slug)!;
      expect(project.visuals.icon).toBe(`/projects/${slug}/icon.png`);
      expect(createHash("sha256").update(readFileSync(`public${project.visuals.icon}`)).digest("hex")).toBe(hash);
    }
  });

  it("keeps normal-app development views separate from publication evidence with exact provenance", () => {
    const expected = {
      "/projects/ostinato/preview-written-lesson-20261016.png": "745e683b1b490258e99a1fb8a798e198e4b05c17e11386eb42743b259168e377",
      "/projects/ostinato/preview-course-20261016.png": "eb0084ab724970d20101d0d82da2bc861ad161dcf6cfc64a0489262a1ede251a",
      "/projects/lifeos/preview-onboarding-20261016.png": "20fb36a1a27f80d097ef9bf1881040971cbe6819924014e13344f70664771b85",
    };
    for (const [slug, previews] of Object.entries(developmentPreviews)) {
      for (const preview of previews ?? []) {
        expect(preview.capturedAt).toBe("2026-10-16");
        expect(preview.sourceBuild).toMatch(/^development-ios-[0-9a-f]{40}$/);
        expect(createHash("sha256").update(readFileSync(`public${preview.path}`)).digest("hex")).toBe(expected[preview.path as keyof typeof expected]);
        expect(publicRegistry.find((record) => record.slug === slug)?.screenshots.some((shot) => shot.path === preview.path)).toBe(false);
      }
    }
  });
});
