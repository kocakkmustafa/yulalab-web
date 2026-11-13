/**
 * The four doors of the home page (WEB-UX-05d, design 04 §E1/§E2). One source
 * for the scene 7 strip and the header "Doors" panel, so both list the same
 * targets in the same order. Anchor contract (design §2.1): products ->
 * /projects, work -> /consulting, partners -> /contact#yollar, inspect ->
 * /lab and /transparency.
 *
 * Every href is a route that exists or is delivered by a sibling ticket:
 * `/lab` (WEB-UX-05e) and `/contact#yollar` (WEB-UX-05f) are not on this
 * base yet and are only written as hrefs. The `/start` page (WEB-UX-05g) lists
 * these same doors on a page of its own, so no door points at `/start` itself.
 */
export type DoorKey = "products" | "work" | "partners" | "inspect";
export type DoorLinkKey = "products" | "consulting" | "contact" | "lab" | "transparency";

export type Door = {
  key: DoorKey;
  links: ReadonlyArray<{ key: DoorLinkKey; href: string }>;
};

export const HOME_DOORS: readonly Door[] = [
  { key: "products", links: [{ key: "products", href: "/projects" }] },
  { key: "work", links: [{ key: "consulting", href: "/consulting" }] },
  { key: "partners", links: [{ key: "contact", href: "/contact#yollar" }] },
  {
    key: "inspect",
    links: [
      { key: "lab", href: "/lab" },
      { key: "transparency", href: "/transparency" },
    ],
  },
];
