import type { ProjectConfig } from "@/lib/types";
import { braavolabs } from "./braavolabs";
import { burunfarki } from "./burunfarki";
import { lifeos } from "./lifeos";

export const projects: ProjectConfig[] = [braavolabs, burunfarki, lifeos].sort(
  (a, b) => a.order - b.order,
);

export function getProjectBySlug(slug: string): ProjectConfig | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectSlugs(): string[] {
  return projects.map((p) => p.slug);
}
