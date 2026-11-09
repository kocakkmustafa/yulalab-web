import { notFound } from "next/navigation";

/**
 * WEB-UX-04 prototype gate. Closed by default: the prototype routes under
 * /prototype exist in the tree but answer 404 unless the process was started
 * with UX_PROTOTYPE=1 (e.g. `UX_PROTOTYPE=1 next dev`). They are not in the
 * sitemap or the navigation.
 */
export function prototypeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.UX_PROTOTYPE === "1";
}

/** Call first in every prototype page; renders the 404 when the gate is closed. */
export function assertPrototypeEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!prototypeEnabled(env)) notFound();
}

/** Metadata every prototype route carries: never indexed. */
export const PROTOTYPE_ROBOTS = { index: false, follow: false } as const;
