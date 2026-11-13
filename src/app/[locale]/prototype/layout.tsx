import type { Metadata } from "next";
import type { ReactNode } from "react";
import { assertPrototypeEnabled, PROTOTYPE_ROBOTS } from "@/components/prototype/gate";

// WEB-UX-04 prototype: never indexed; each page also gates on UX_PROTOTYPE=1.
export const metadata: Metadata = { robots: PROTOTYPE_ROBOTS };
export const dynamic = "force-dynamic";

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  assertPrototypeEnabled();
  return children;
}
