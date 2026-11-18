import type { ComponentType } from "react";
import type { LabDemoId } from "@/data/lab-demos";

/**
 * WEB-P2-01a: the lazy import of each Lab demo, keyed by registry id. Only the
 * client grid imports this file (never a server module), so the demo code is
 * a separate chunk fetched when a card's "Open" is pressed.
 */
export const LAB_DEMO_LOADERS: Record<LabDemoId, () => Promise<ComponentType>> = {
  "lifeos-decision": () => import("@/components/projects/LifeosDemoArea").then((m) => m.LifeosDemoArea),
  "ostinato-rhythm": () => import("@/components/projects/OstinatoDemoArea").then((m) => m.OstinatoDemoArea),
  "braavolabs-run": () => import("@/components/projects/BraavolabsRunDemoArea").then((m) => m.BraavolabsRunDemoArea),
};
