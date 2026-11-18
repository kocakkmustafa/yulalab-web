// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DesignPreviewSection } from "@/components/projects/DesignPreviewSection";
import { IMAGE_DIMENSIONS } from "@/data/image-dimensions";
import { designPreviews, developmentPreviews } from "@/data/product-presentations";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";

afterEach(cleanup);

const SHA: Record<string, string> = {
  "/projects/lifeos/design-preview-01-onboarding.png": "92018a7139b6409e17ef016c5945c7c8bb67244ca8f237463a47c53b1aba33b5",
  "/projects/lifeos/design-preview-02-today.png": "819439bac7363cc0d04ec3763ef87f2dffa48d368463d13933894ad735857c01",
  "/projects/lifeos/design-preview-03-finance.png": "e14798cb8d3cb21b1b44fef5accb5799d4b4fcb2d4aa0771a0ef1e7ac47aabe0",
  "/projects/lifeos/design-preview-04-focus.png": "8437522646fc909739d92689f75c156c1b56eb9e00f51ccc69b1dbea83c0004b",
  "/projects/lifeos/design-preview-05-health-score.png": "c1172cf5a9eff85a242004d900f42bffa2d222e07259488e9724316d0d8c341d",
  "/projects/lifeos/design-preview-06-habits.png": "761b51cf533f3cbd1e552b597652148e20dab0e3f67c93cf6862553b9fae1ec6",
  "/projects/braavolabs/design-preview-01-approval-queue.png": "2b035e66e1868e4d907fd3521fe59b1c7c1e2d2e9c502fa8cf9e050288afd45c",
  "/projects/braavolabs/design-preview-02-activity-audit.png": "5d99bdda839cfa89cd956b6e91e512b7abb109952387bff5e67cae83b9b5c731",
  "/projects/braavolabs/design-preview-03-notifications-error.png": "c0b8c1e4c122e0949d3f574d6a0a62110e9e04e8648f984ce6ccc38a711703f5",
  "/projects/braavolabs/design-preview-04-settings-budget.png": "ee28703c5416f87e859d6bb1feb0a11264ff0af94ac6b114eca0315d7b680f1e",
  "/projects/braavolabs/design-preview-05-settings-approval-rules.png": "1e246d8b5b126683a3b32037f5b1616a2d043c91f8024415d0a2a17d32ed6892",
};

function pngSize(path: string) {
  const bytes = readFileSync(`public${path}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const all = Object.entries(designPreviews).flatMap(([slug, list]) => list.map((p) => [slug, p] as const));

describe("design previews are honest design images, not screenshots", () => {
  it("has 6 LifeOS and 5 Braavolabs previews and exactly the pinned files", () => {
    expect(designPreviews.lifeos).toHaveLength(6);
    expect(designPreviews.braavolabs).toHaveLength(5);
    expect(all.map(([, p]) => p.path).sort()).toEqual(Object.keys(SHA).sort());
  });

  it.each(all)("%s %#", (slug, preview) => {
    expect(preview.captureKind).toBe("design");
    expect(preview.designedAt).toBe("2026-11-18");
    expect(preview.boardFile).toMatch(/\.dc\.html$/);
    expect(preview.designDirection.en).toBe(slug === "lifeos" ? "Silver Plum" : "Warm Graphite");
    expect(preview.designDirection.tr).toBe(slug === "lifeos" ? "Gümüş Erik" : "Ilık Grafit");
    expect(createHash("sha256").update(readFileSync(`public${preview.path}`)).digest("hex")).toBe(SHA[preview.path]);
    expect(IMAGE_DIMENSIONS[preview.path]).toEqual(pngSize(preview.path));
    expect(publicRegistry.find((r) => r.slug === slug)?.screenshots.some((s) => s.path === preview.path)).toBe(false);
    for (const alt of [preview.alt.tr, preview.alt.en]) expect(alt).not.toMatch(/screenshot|ekran görüntüsü/i);
    expect(preview.alt.en).not.toMatch(/[ğüşıöçĞÜŞİÖÇ₺]/);
    expect(Object.keys(preview)).not.toContain("sourceBuild");
  });

  it("keeps design previews out of product visuals and the registry; Braavolabs has no registry screenshots", () => {
    expect(publicRegistry.find((r) => r.slug === "braavolabs")?.screenshots).toEqual([]);
    expect(projects.find((p) => p.slug === "braavolabs")?.visuals.screenshots).toEqual([]);
    const designPaths = new Set(all.map(([, p]) => p.path));
    for (const project of projects) {
      for (const shot of project.visuals.screenshots) expect("src" in shot && designPaths.has(shot.src)).toBe(false);
    }
  });

  it("keeps the two removed Y2 captures on disk but unreferenced anywhere on the site", () => {
    // The publication-source gate (.github/ci/verify-published-source.py) cannot
    // express a deleted baseline file, so the PNGs stay as orphans; a separate
    // ticket teaches the gate about deletions. Nothing may reference them.
    const registryJson = readFileSync("public/portfolio-registry.json", "utf8");
    const braavolabs = JSON.stringify(projects.find((p) => p.slug === "braavolabs"));
    for (const name of ["screenshot-audit-trail.png", "screenshot-builder.png"]) {
      expect(existsSync(`public/projects/braavolabs/${name}`), name).toBe(true);
      expect(IMAGE_DIMENSIONS[`/projects/braavolabs/${name}`], name).toBeUndefined();
      expect(registryJson).not.toContain(name);
      expect(braavolabs).not.toContain(name);
      expect(JSON.stringify(publicRegistry)).not.toContain(name);
    }
  });

  it("leaves the dated development previews untouched", () => {
    expect(Object.values(developmentPreviews).flat()).toHaveLength(8);
  });
});

describe("DesignPreviewSection", () => {
  it.each([
    ["tr", "Tasarım önizlemesi", "ekran görüntüsü", "Tasarım yönü"],
    ["en", "Design preview", "not a capture of a published version", "Design direction"],
  ] as const)("%s shows label, disclaimer and per-figure provenance", (locale, label, disclaimer, dir) => {
    for (const slug of ["lifeos", "braavolabs"]) {
      const { container, unmount } = render(<DesignPreviewSection slug={slug} locale={locale} />);
      const section = container.querySelector(`[data-design-previews="${slug}"]`)!;
      expect(section.textContent).toContain(label);
      expect(section.textContent).toContain(disclaimer);
      const figures = section.querySelectorAll("figure");
      expect(figures).toHaveLength(designPreviews[slug].length);
      figures.forEach((figure, i) => {
        expect(figure.textContent).toContain(designPreviews[slug][i].boardFile);
        expect(figure.textContent).toContain(dir);
        expect(figure.textContent).toContain("2026-11-18");
        const img = figure.querySelector("img")!;
        expect(img.getAttribute("loading")).toBe("lazy");
        expect(img.getAttribute("decoding")).toBe("async");
        expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
        expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
      });
      unmount();
    }
  });

  it("renders nothing for a product without design previews", () => {
    const { container } = render(<DesignPreviewSection slug="gravita" locale="en" />);
    expect(container.innerHTML).toBe("");
  });
});
