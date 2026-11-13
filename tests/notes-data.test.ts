import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { articleNotes, getArticleBySlug, notes } from "@/data/notes";
import { publicRegistry } from "@/data/public-registry";
import { routing } from "@/i18n/routing";
import sitemap from "@/app/sitemap";
import NoteArticlePage, { generateMetadata, generateStaticParams } from "@/app/[locale]/notes/[slug]/page";

vi.mock("@/i18n/navigation", () => ({ Link: () => null }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {}, getTranslations: async () => (k: string) => k }));

const claims = publicRegistry.flatMap((r) => r.claims);

/** Returns the registry verifiedAt for a ref, or undefined for a plain repo path. */
function registryVerifiedAt(ref: string): string | undefined {
  const claim = claims.find((c) => c.id === ref);
  if (claim) return claim.verifiedAt;
  const m = /^registry:([^/]+)\/surface\/([^/]+)$/.exec(ref);
  if (m) {
    const surface = publicRegistry.find((r) => r.slug === m[1])?.surfaces.find((s) => s.kind === m[2]);
    return surface?.verifiedAt;
  }
  return undefined;
}

describe("notes data (WEB-P0-09)", () => {
  it("has the three expected articles and keeps changelog entries typed", () => {
    expect(articleNotes.map((n) => n.slug).sort()).toEqual([
      "braavolabs-primitives-and-providers",
      "how-we-verify-claims",
      "lifeos-on-device-encryption",
    ]);
    expect(notes.filter((n) => n.kind === "changelog").map((n) => n.slug)).toEqual([
      "site-motion",
      "terms-of-service",
      "lifeos-live",
    ]);
  });

  it("keeps notes newest first and slugs unique", () => {
    const dates = notes.map((n) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(notes.map((n) => n.slug)).size).toBe(notes.length);
  });

  for (const note of articleNotes) {
    describe(note.slug, () => {
      it("has paragraphs in tr and en and at least one source", () => {
        expect(note.sources.length).toBeGreaterThanOrEqual(1);
        expect(note.paragraphs.length).toBeGreaterThan(0);
        for (const p of note.paragraphs) {
          expect(p.tr.trim()).not.toBe("");
          expect(p.en.trim()).not.toBe("");
        }
      });

      it("every source ref is a registry claim/surface or an existing repo path", () => {
        for (const source of note.sources) {
          const fromRegistry = registryVerifiedAt(source.ref);
          if (fromRegistry !== undefined) {
            // verifiedAt must match the registry record exactly.
            expect(source.verifiedAt, source.ref).toBe(fromRegistry);
          } else {
            expect(fs.existsSync(path.join(process.cwd(), source.ref)), `missing path ${source.ref}`).toBe(true);
            expect(source.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }
        }
      });

      it("states every figure of each cited claim at word boundaries, in both languages", () => {
        const trText = note.paragraphs.map((p) => p.tr).join(" ");
        const enText = note.paragraphs.map((p) => p.en).join(" ");
        const esc = (v: string) => v.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
        const has = (text: string, v: string) =>
          new RegExp("(^|[^\\p{L}\\p{N}])" + esc(v) + "($|[^\\p{L}\\p{N}])", "iu").test(text);
        for (const source of note.sources) {
          const claim = claims.find((c) => c.id === source.ref);
          if (!claim) continue;
          for (const figure of claim.figures ?? []) {
            const word = claim.figureWords?.[figure];
            expect(has(trText, figure) || (!!word && has(trText, word.tr)), `${figure} tr`).toBe(true);
            expect(has(enText, figure) || (!!word && has(enText, word.en)), `${figure} en`).toBe(true);
          }
        }
      });

      it("every date, commit and version in the text matches a cited registry record", () => {
        const allowed = note.sources
          .flatMap((source) => {
            const claim = claims.find((c) => c.id === source.ref);
            if (claim) return [claim.verifiedAt, claim.expiresAt, claim.buildOrCommit ?? "", claim.source];
            const m = /^registry:([^/]+)\/surface\/([^/]+)$/.exec(source.ref);
            const surface = m && publicRegistry.find((r) => r.slug === m[1])?.surfaces.find((s) => s.kind === m[2]);
            return surface ? [surface.verifiedAt, surface.expiresAt, surface.source] : [];
          })
          .concat(note.date, ...note.sources.map((s) => s.verifiedAt))
          .join(" ");
        for (const lang of ["tr", "en"] as const) {
          const text = note.paragraphs.map((p) => p[lang]).join(" ");
          const tokens = [
            ...(text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []),
            ...(text.match(/@[0-9a-f]{12}\b/g) ?? []).map((t) => t.slice(1)),
            ...(text.match(/\b\d+\.\d+\.\d+\b/g) ?? []),
            ...(text.match(/iOS \d+\.\d+/g) ?? []).map((t) => t.replace("iOS ", "")),
          ];
          for (const token of tokens) expect(allowed.includes(token), `${note.slug} ${lang}: ${token}`).toBe(true);
        }
      });

      it("does not use superlative or store/performance wording", () => {
        const all = [note.title, note.body, ...note.paragraphs].map((s) => `${s.tr} ${s.en}`).join(" ");
        for (const banned of [
          /\b(first|only|best|users|downloads)\b/i,
          /(^|[^\p{L}])(ilk|tek|en iyi|kullanıcı sayısı|indirme)($|[^\p{L}])/iu,
        ]) {
          expect(banned.test(all), String(banned)).toBe(false);
        }
      });
    });
  }

  it("never refers to Burun Farkı claims", () => {
    const all = JSON.stringify(articleNotes).toLowerCase();
    expect(all).not.toContain("burun");
  });

  it("calls notFound for an unknown article slug", async () => {
    await expect(
      NoteArticlePage({ params: Promise.resolve({ locale: "tr", slug: "no-such-note" }) }),
    ).rejects.toThrow();
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "tr", slug: "no-such-note" }) });
    expect(meta.alternates?.canonical).not.toContain("no-such-note");
  });

  it("looks articles up by slug", () => {
    expect(getArticleBySlug("how-we-verify-claims")?.kind).toBe("article");
    expect(getArticleBySlug("lifeos-live")).toBeUndefined();
  });
});

describe("routes and sitemap (WEB-P0-09)", () => {
  it("generateStaticParams covers 14 locales x 3 slugs", () => {
    const params = generateStaticParams();
    expect(routing.locales).toHaveLength(14);
    expect(params).toHaveLength(14 * 3);
    expect(params).toContainEqual({ locale: "tr", slug: "how-we-verify-claims" });
    expect(params).toContainEqual({ locale: "zh-Hans", slug: "lifeos-on-device-encryption" });
  });

  it("sitemap lists /why-yula and every article for every locale", () => {
    const urls = sitemap().map((e) => e.url);
    for (const note of articleNotes) {
      expect(urls.filter((u) => u.endsWith(`/notes/${note.slug}`))).toHaveLength(14);
    }
    expect(urls.filter((u) => u.endsWith("/why-yula"))).toHaveLength(14);
  });
});
