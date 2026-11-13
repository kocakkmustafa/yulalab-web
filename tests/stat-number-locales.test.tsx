// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { StatCards } from "@/components/projects/StatCards";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import type { Locale, ProjectStat } from "@/lib/types";

// Numeric presentation only; catalogue semantics and browser RTL acceptance are separate.
vi.mock("@/lib/localized", () => ({ localized: (value: { en: string }) => value.en }));
afterEach(cleanup);
const labels = { verified: "verified", needsReverification: "needs re-verification" };
const config = projects.find((project) => project.slug === "burunfarki")!;
const record = publicRegistry.find((product) => product.slug === config.slug)!;
const clean = (value: string) => value.replace(/[\u061c\u200e\u200f]/g, "").replace(/\s/g, " ");

function renderStats(locale: Locale, stats: ProjectStat[] = config.stats) {
  const result = render(<StatCards slug={config.slug} stats={stats} record={record} locale={locale} now={new Date("2099-01-01T12:00:00Z")} labels={labels} />);
  return { ...result, values: [...result.container.querySelectorAll("bdi")].map((node) => clean(node.textContent ?? "")) };
}

describe("explicit numeric stat presentation", () => {
  it.each([
    ["tr", ["~%29", "~%62", "1.225"]],
    ["en", ["~29%", "~62%", "1,225"]],
    ["de", ["~29 %", "~62 %", "1.225"]],
    ["fr", ["~29 %", "~62 %", "1 225"]],
    ["ar", ["~٢٩٪", "~٦٢٪", "١٬٢٢٥"]],
    ["es-419", ["~29%", "~62%", "1,225"]],
    ["pt-BR", ["~29%", "~62%", "1.225"]],
    ["ja", ["~29%", "~62%", "1,225"]],
    ["it", ["~29%", "~62%", "1225"]],
    ["ko", ["~29%", "~62%", "1,225"]],
    ["id", ["~29%", "~62%", "1.225"]],
    ["pl", ["~29%", "~62%", "1225"]],
    ["hi", ["~29%", "~62%", "1,225"]],
    ["zh-Hans", ["~29%", "~62%", "1,225"]],
  ] satisfies [Locale, string[]][])("renders the same historical figures with %s number and percent conventions", (locale, expected) => {
    const original = JSON.stringify(config.stats);
    const result = renderStats(locale);
    // ICU/CLDR versions may use Latin or Arabic-Indic digits for bare ar.
    // Both explicit forms below preserve the same quantities and units.
    if (locale === "ar") expect([expected, ["~29%", "~62%", "1,225"]]).toContainEqual(result.values);
    else expect(result.values).toEqual(expected);
    expect(result.container.textContent?.match(/needs re-verification/g)).toHaveLength(3);
    expect(JSON.stringify(config.stats)).toBe(original);
  });

  it("keeps numeric metadata tied to the original evidence quantities and labels", () => {
    expect(config.stats.map((stat) => [stat.label.en, stat.value, stat.numericDisplay, stat.claimId])).toEqual([
      ["Top-1 (live tracking)", "~%29", { value: 0.29, unit: "percent", approximate: true }, "burunfarki-topk-accuracy"],
      ["Top-3 (live tracking)", "~%62", { value: 0.62, unit: "percent", approximate: true }, "burunfarki-topk-accuracy"],
      ["live-tracked races", "1.225", { value: 1225, unit: "integer" }, "burunfarki-topk-accuracy"],
    ]);
  });

  it("leaves technical and unannotated values unchanged instead of parsing strings", () => {
    const stats = ["AES-256", "Salsa", "1.225", "1e3"].map((value) => ({ value, label: { tr: value, en: value } }));
    expect(renderStats("de", stats).values).toEqual(["AES-256", "Salsa", "1.225", "1e3"]);
  });
});
