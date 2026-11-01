// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ProductPage } from "@/components/projects/ProductPage";
import { getProjectBySlug } from "@/data/projects";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("@/components/common/Reveal", () => ({
  Reveal: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));
vi.mock("@/components/common/TrackView", () => ({ TrackView: () => null }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));

afterEach(cleanup);

type Copy = Record<string, string>;
type Catalogue = { product: Record<string, Copy> };

const catalogues = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Catalogue,
  ]),
) as Record<(typeof SUPPORTED_LOCALES)[number], Catalogue>;

// Founder direction 2026-11-02: Braavolabs, LifeOS and the five Motion apps
// each carry a short promotional read. Burun Farkı is out of scope.
const PITCHED = ["braavolabs", "lifeos", "ostinato", "choreia", "gravita", "jablab", "lissom"] as const;

function parts(copy: Copy) {
  return [1, 2, 3, 4].filter((n) => copy[`pitch${n}Body`] !== undefined);
}

describe("product pitch copy", () => {
  it.each(SUPPORTED_LOCALES)("gives every pitched product a headline and two to four parts in %s", (locale) => {
    for (const slug of PITCHED) {
      const copy = catalogues[locale].product[slug];
      expect(copy.pitchTitle?.trim(), `${locale}/${slug}: pitchTitle`).toBeTruthy();
      const used = parts(copy);
      expect(used.length, `${locale}/${slug}: part count`).toBeGreaterThanOrEqual(2);
      expect(used.length, `${locale}/${slug}: part count`).toBeLessThanOrEqual(4);
      // Parts are numbered without gaps so the page never skips one.
      expect(used).toEqual(used.map((_, index) => index + 1));
      for (const n of used) {
        expect(copy[`pitch${n}Title`]?.trim(), `${locale}/${slug}: pitch${n}Title`).toBeTruthy();
        expect(copy[`pitch${n}Body`]?.trim(), `${locale}/${slug}: pitch${n}Body`).toBeTruthy();
      }
    }
  });

  it("keeps the pitch short enough not to bury the page", () => {
    // Measured on the source languages; translations follow their length.
    for (const locale of ["tr", "en"] as const) {
      for (const slug of PITCHED) {
        const copy = catalogues[locale].product[slug];
        for (const n of parts(copy)) {
          expect(copy[`pitch${n}Body`].length, `${locale}/${slug}: pitch${n}Body`).toBeLessThanOrEqual(360);
        }
      }
    }
  });

  // The same scope product-showcase.test.tsx keeps on the roadmap: the pitch
  // must not present any of it as shipped. Braavolabs' Company is introduced
  // as "Next up", matching its roadmap label further down the page.
  it("claims nothing the showcase keeps on the roadmap", () => {
    const legalScope = /camera (coaching|follows)|suggests entries|mentor|coding agent|MIDI|placement test|progress sync|not recorded/i;
    for (const slug of PITCHED) {
      const copy = catalogues.en.product[slug];
      for (const n of parts(copy)) {
        expect(`${copy[`pitch${n}Title`]} ${copy[`pitch${n}Body`]}`, `${slug}: part ${n}`).not.toMatch(legalScope);
      }
    }
    expect(catalogues.en.product.braavolabs.pitch3Title).toMatch(/^Next up/);
    expect(catalogues.tr.product.braavolabs.pitch3Title).toMatch(/^Sırada/);
  });

  it("uses the same part count in every language", () => {
    for (const slug of PITCHED) {
      const counts = new Set(SUPPORTED_LOCALES.map((locale) => parts(catalogues[locale].product[slug]).length));
      expect(counts.size, slug).toBe(1);
    }
  });

  it.each(["tr", "en", "ja", "ar"] as const)("renders the pitch under its own heading in %s", (locale) => {
    const copy = catalogues[locale].product.ostinato;
    render(
      <NextIntlClientProvider locale={locale} messages={catalogues[locale]} timeZone="Europe/Istanbul">
        <ProductPage project={getProjectBySlug("ostinato")!} />
      </NextIntlClientProvider>,
    );
    const pitch = screen.getByTestId("product-pitch");
    expect(within(pitch).getByRole("heading", { level: 2, name: copy.pitchTitle })).toBeTruthy();
    expect(within(pitch).getAllByRole("heading", { level: 3 })).toHaveLength(parts(copy).length);
    expect(pitch.textContent).toContain(copy.pitch1Body);
  });

  it("leaves pages without a pitch unchanged", () => {
    const tr = catalogues.tr;
    render(
      <NextIntlClientProvider locale="tr" messages={tr} timeZone="Europe/Istanbul">
        <ProductPage project={getProjectBySlug("burunfarki")!} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByTestId("product-pitch")).toBeNull();
  });
});
