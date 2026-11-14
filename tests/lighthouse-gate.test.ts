import { describe, expect, it } from "vitest";
import { annotations, failureReport, minRuns, evaluate, median, overallPass, extractRun, toMarkdown } from "../scripts/lighthouse.mjs";

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
    expect(r.status).toBe("kaldı");
  });

  it("sınır değerleri geçer (80 / 95)", () => {
    expect(evaluate("mobile", [run(80, 95)], undefined, 1).pass).toBe(true);
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
    const md = toMarkdown([{ route: "/tr", ...evaluate("mobile", [run(90, 100)], undefined, 1) }]);
    expect(md).toContain("| /tr | mobile | 1/1 | 90 | 100 |");
    expect(md).toContain("GEÇTİ");
  });

  it("kısmi koşu geçti sayılmaz (3 hedefte 1 başarılı = eksik), 2 yeterli", () => {
    const one = evaluate("mobile", [run(95, 100)], undefined, 3);
    expect(one.status).toBe("eksik");
    expect(one.pass).toBe(false);
    expect(evaluate("mobile", [run(95, 100), run(90, 100)], undefined, 3).pass).toBe(true);
    expect(minRuns(3)).toBe(2);
    expect(minRuns(1)).toBe(1);
  });

  it("null skorlu koşu elenir; medyanlar aynı kümeden gelir", () => {
    const runs = [run(90, 100), { performance: 10, accessibility: null }, { performance: null, accessibility: 100 }, run(70, 96)];
    const r = evaluate("mobile", runs as never, undefined, 3);
    expect(r.runs).toBe(2);
    expect(r.medians.performance).toBe(80);
    expect(r.medians.accessibility).toBe(98);
  });

  it("annotation ve hata yolu raporu", () => {
    const bad = { route: "/tr", ...evaluate("mobile", [run(50, 100), run(50, 100), run(50, 100)]) };
    expect(annotations([bad])[0]).toMatch(/^::warning title=Lighthouse \/tr mobile::kaldı/);
    expect(annotations([{ route: "/tr", ...evaluate("mobile", [run(90, 100), run(90, 100)]) }])).toEqual([]);
    expect(annotations([])).toHaveLength(1);
    const f = failureReport("sunucu hazır olmadı\nx");
    expect(f.markdown).toContain("Ölçüm alınamadı: sunucu hazır olmadı");
    expect(f.json.pass).toBe(false);
    expect(f.annotation.startsWith("::warning")).toBe(true);
    expect(f.annotation).not.toContain("\n");
  });
});
