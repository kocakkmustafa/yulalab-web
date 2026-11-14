import { describe, expect, it } from "vitest";
import { evaluate, median, overallPass, extractRun, toMarkdown } from "../scripts/lighthouse.mjs";

const run = (performance: number, accessibility: number) => ({ performance, accessibility, tbt: 100, lcp: 2000, cls: 0 });

describe("lighthouse kapısı", () => {
  it("medyan: tek, çift, sırasız, boş", () => {
    expect(median([90, 70, 80])).toBe(80);
    expect(median([70, 90, 80, 100])).toBe(85);
    expect(median([5])).toBe(5);
    expect(median([])).toBeNull();
    expect(median([null, Number.NaN] as unknown as number[])).toBeNull();
  });

  it("eşik geçti: medyan tek bir kötü koşudan etkilenmez", () => {
    const r = evaluate("mobile", [run(85, 100), run(40, 100), run(82, 96)]);
    expect(r.medians.performance).toBe(82);
    expect(r.pass).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it("eşik kaldı: perf ve a11y ayrı ayrı raporlanır", () => {
    const r = evaluate("desktop", [run(79, 94), run(79, 94), run(79, 94)]);
    expect(r.pass).toBe(false);
    expect(r.failures).toHaveLength(2);
  });

  it("sınır değerleri geçer (80 / 95)", () => {
    expect(evaluate("mobile", [run(80, 95)]).pass).toBe(true);
  });

  it("boş girdi kalır, bilinmeyen preset hata verir", () => {
    const r = evaluate("mobile", []);
    expect(r.pass).toBe(false);
    expect(r.medians.performance).toBeNull();
    expect(() => evaluate("tablet", [run(90, 100)])).toThrow();
    expect(overallPass([])).toBe(false);
  });

  it("extractRun ve markdown", () => {
    const lhr = { categories: { performance: { score: 0.876 }, accessibility: { score: 1 } }, audits: { "total-blocking-time": { numericValue: 123 } } };
    expect(extractRun(lhr)).toMatchObject({ performance: 88, accessibility: 100, tbt: 123, lcp: null });
    const md = toMarkdown([{ route: "/tr", ...evaluate("mobile", [run(90, 100)]) }]);
    expect(md).toContain("| /tr | mobile | 1 | 90 | 100 |");
    expect(md).toContain("GEÇTİ");
  });
});
