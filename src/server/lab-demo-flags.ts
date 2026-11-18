import { LAB_DEMOS, type LabDemoId } from "@/data/lab-demos";
import { lifeosDemoEnabled } from "@/server/lifeos-demo-surface";
import { braavolabsDemoEnabled } from "@/server/braavolabs-demo-surface";
import { ostinatoDemoEnabled } from "@/server/ostinato-demo-surface";

/**
 * WEB-P2-01a, server only. Each Lab demo's flag is the product page's own
 * reader, reused as is. The Lab page is prerendered, so a flag is read once
 * per render or revalidation. A closed flag means no card and no demo code;
 * only the list of visible ids reaches the client.
 */
export const LAB_DEMO_FLAGS: Record<LabDemoId, { name: string; enabled: () => boolean }> = {
  "lifeos-decision": { name: "LIFEOS_DEMO_ENABLED", enabled: lifeosDemoEnabled },
  "ostinato-rhythm": { name: "OSTINATO_DEMO_ENABLED", enabled: ostinatoDemoEnabled },
  "braavolabs-run": { name: "BRAAVOLABS_DEMO_ENABLED", enabled: braavolabsDemoEnabled },
};

/** Ids of the demos whose flag is open right now. */
export function enabledLabDemoIds(): LabDemoId[] {
  return LAB_DEMOS.filter((d) => LAB_DEMO_FLAGS[d.id].enabled()).map((d) => d.id);
}
