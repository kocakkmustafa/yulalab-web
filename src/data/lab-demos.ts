import { lifeosDemoEnabled } from "@/server/lifeos-demo-surface";
import { ostinatoDemoEnabled } from "@/server/ostinato-demo-surface";

/**
 * WEB-P2-01a: the Lab demo registry. One entry per product try-out; adding a
 * demo means adding one record here (plus its messages under `labDemos`).
 *
 * - `flag.enabled` is the product page's own server-side flag reader, reused
 *   as is: the Lab page is prerendered, so it is read once per render or
 *   revalidation on the server. A closed flag means no card and no demo code.
 * - The lazy import lives in `src/components/lab/lab-demo-loaders.ts`, keyed
 *   by `id` (a Record over `LabDemoId`, so a record without a loader fails
 *   typecheck). It is a separate file on purpose: the Lab page is a server
 *   component that imports this registry, and Next bundles every client
 *   component reachable from a server module's `import()` into that page's
 *   first load. Keeping `import()` out of this file keeps demo code out of it.
 * - `descriptionKey` is a key under the `labDemos` messages namespace.
 * - Demos use synthetic data only; no live API, no secret.
 */
export type LabDemo = {
  id: LabDemoId;
  product: string;
  /** Product page slug; the no-JS fallback links to `/projects/<slug>#dene`. */
  slug: string;
  flag: { name: string; enabled: () => boolean };
  descriptionKey: "lifeos" | "ostinato";
};

export type LabDemoId = "lifeos-decision" | "ostinato-rhythm";

export const LAB_DEMOS: readonly LabDemo[] = [
  {
    id: "lifeos-decision",
    product: "LifeOS",
    slug: "lifeos",
    flag: { name: "LIFEOS_DEMO_ENABLED", enabled: lifeosDemoEnabled },
    descriptionKey: "lifeos",
  },
  {
    id: "ostinato-rhythm",
    product: "Ostinato",
    slug: "ostinato",
    flag: { name: "OSTINATO_DEMO_ENABLED", enabled: ostinatoDemoEnabled },
    descriptionKey: "ostinato",
  },
];

/** Demos whose flag is open right now (server side). */
export function enabledLabDemos(demos: readonly LabDemo[] = LAB_DEMOS): LabDemo[] {
  return demos.filter((d) => d.flag.enabled());
}
