// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import TransparencyPage from "@/app/[locale]/transparency/page";
import { publicRegistry } from "@/data/public-registry";
import { projects } from "@/data/projects";
import { lifecycleRows } from "@/lib/operating-system";
import { presentClaims } from "@/lib/proof";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

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

afterEach(cleanup);

async function renderTransparency(locale: "tr" | "en") {
  const ui = await TransparencyPage({ params: Promise.resolve({ locale }) });
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "tr" ? tr : en} timeZone="Europe/Istanbul">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("/transparency per-product anchors (WEB-UX-05e)", () => {
  it("renders one unique #<slug> anchor per registry record and per product page", async () => {
    const { container } = await renderTransparency("tr");
    const ids = Array.from(container.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const slug of [...publicRegistry.map((r) => r.slug), ...projects.map((p) => p.slug)]) {
      expect(ids, `missing #${slug}`).toContain(slug);
    }
  });

  it("states 'no sourced claim yet' in words for a block without claims", async () => {
    await renderTransparency("en");
    const now = new Date();
    const expected = publicRegistry.filter(
      (r) => presentClaims(r, now).filter((p) => p.kind !== "withheld").length === 0,
    ).length;
    const found = screen.queryAllByTestId("no-claims");
    expect(found).toHaveLength(expected);
    for (const el of found) expect(el.textContent).toBe("No sourced claim yet.");
  });

  it("keeps lapsed claims visible and counts them in the summary", async () => {
    await renderTransparency("tr");
    const now = new Date();
    const lapsed = publicRegistry.flatMap((r) => presentClaims(r, now)).filter((p) => p.kind === "lapsed");
    expect(Number(screen.getByTestId("summary-lapsed").querySelector("dd")!.textContent)).toBe(lapsed.length);
    const body = document.body.textContent ?? "";
    for (const p of lapsed) expect(body).toContain(p.claim.statementTr);
  });

  it("derives the status summary from the registry", async () => {
    await renderTransparency("tr");
    for (const row of lifecycleRows().filter((r) => r.count > 0)) {
      expect(screen.getByTestId(`summary-${row.key}`).querySelector("dd")!.textContent).toBe(String(row.count));
      expect(row.count).toBe(publicRegistry.filter((r) => r.lifecycle === row.key).length);
    }
  });

  it("summarises the ADRs", async () => {
    await renderTransparency("tr");
    const adr = screen.getByTestId("adr-summaries");
    expect(adr.textContent).toContain("ADR-003");
    expect(adr.textContent).toContain("ADR-004");
  });
});

describe("capital / outside-client sentence placement (ADR-004 §8 #2)", () => {
  it("appears on /transparency", async () => {
    await renderTransparency("en");
    expect(screen.getByTestId("transparency-nopromise").textContent).toBe(en.studio.noPromiseBody);
  });

  it("is read from messages only by the studio and transparency pages, and exists in no other message", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
      });
    const users = walk(join(__dirname, "../src")).filter((p) => readFileSync(p, "utf8").includes("noPromise"));
    expect(users.map((p) => p.replace(/^.*\/src\//, "")).sort()).toEqual([
      "app/[locale]/studio/page.tsx",
      "app/[locale]/transparency/page.tsx",
    ]);
    for (const [cat, needle] of [[tr, "Sermaye ya da yatırım"], [en, "capital or investment"]] as const) {
      const hits: string[] = [];
      const scan = (o: unknown, path: string) => {
        if (typeof o === "string") {
          if (o.includes(needle)) hits.push(path);
        } else if (o && typeof o === "object") {
          for (const [k, v] of Object.entries(o)) scan(v, `${path}.${k}`);
        }
      };
      scan(cat, "");
      expect(hits).toEqual([".studio.noPromiseBody"]);
    }
  });
});
