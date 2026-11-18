/**
 * WEB-P2-01a: the Lab demo registry, client-safe data only. One record per
 * product try-out; adding a demo means adding one record here, plus:
 * - its flag reader in `src/server/lab-demo-flags.ts` (a Record over
 *   `LabDemoId`, so a missing flag fails typecheck),
 * - its lazy import in `src/components/lab/lab-demo-loaders.ts` (same),
 * - its description under the `labDemos` messages namespace.
 *
 * This file is imported by the client grid, so it holds no flag name and no
 * server module. The flag files are server-only; the lazy import is a separate
 * file because the Lab page is a server component, and Next bundles every
 * client component reachable from a server module's `import()` into that
 * page's first load. Demos use synthetic data only; no live API, no secret.
 */
export type LabDemoId = "lifeos-decision" | "ostinato-rhythm";

export type LabDemo = {
  id: LabDemoId;
  product: string;
  /** Product page slug; the no-JS fallback links to `/projects/<slug>#dene`. */
  slug: string;
  /** Key under the `labDemos` messages namespace. */
  descriptionKey: "lifeos" | "ostinato";
};

export const LAB_DEMOS: readonly LabDemo[] = [
  { id: "lifeos-decision", product: "LifeOS", slug: "lifeos", descriptionKey: "lifeos" },
  { id: "ostinato-rhythm", product: "Ostinato", slug: "ostinato", descriptionKey: "ostinato" },
];
