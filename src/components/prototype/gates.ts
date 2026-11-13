import { company } from "@/data/company";

/**
 * The four doors (E2). Every href is an existing route; mailto uses the
 * published general address. Tested against the real app routes.
 */
export type GateId = "products" | "business" | "collab" | "review";

export type GateTarget = {
  id: GateId;
  /** Primary destination (an existing route). */
  href: string;
  /** Extra real links shown inside the door. */
  extra: { key: "collabPaths" | "collabMail"; href: string }[];
};

export const GATES: readonly GateTarget[] = [
  { id: "products", href: "/prototype/projects", extra: [] },
  { id: "business", href: "/consulting", extra: [] },
  {
    id: "collab",
    href: "/contact",
    extra: [
      { key: "collabPaths", href: "/prototype/contact" },
      { key: "collabMail", href: `mailto:${company.contact.email}` },
    ],
  },
  { id: "review", href: "/transparency", extra: [] },
];

/** Routes that exist in src/app/[locale] (excluding the gated prototype). */
export const PROTOTYPE_GATE_ROUTES = ["/prototype/projects", "/consulting", "/contact", "/transparency", "/prototype/contact"] as const;
