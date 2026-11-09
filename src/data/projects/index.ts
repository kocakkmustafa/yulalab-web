import type { ProjectConfig } from "@/lib/types";
import { sortByProductOrder } from "@/lib/product-index";
import { braavolabs } from "./braavolabs";
import { burunfarki } from "./burunfarki";
import { lifeos } from "./lifeos";
import { gravita } from "./gravita";
import { lissom } from "./lissom";
import { jablab } from "./jablab";
import { ostinato } from "./ostinato";
import { choreia } from "./choreia";

// Order comes from PRODUCT_ORDER in src/lib/product-index.ts (single source,
// WEB-UX-05a); ProjectConfig.order is superseded and not read here.
export const projects: ProjectConfig[] = sortByProductOrder([
  braavolabs,
  burunfarki,
  lifeos,
  gravita,
  lissom,
  jablab,
  ostinato,
  choreia,
]);

export function getProjectBySlug(slug: string): ProjectConfig | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectSlugs(): string[] {
  return projects.map((p) => p.slug);
}
