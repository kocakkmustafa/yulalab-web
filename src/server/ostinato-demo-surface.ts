/**
 * Whether the Ostinato rhythm feel try-out (WEB-P1-02) is shown on the product
 * page. Default closed: unset or anything other than "1" means off.
 *
 * Same shape as `lead-surface.ts`: the product page is prerendered, so the
 * flag is read once per render/revalidation on the server. While it is off
 * the demo component is never rendered, so no demo JS is loaded by the page.
 * It is not a NEXT_PUBLIC variable on purpose; the client component never
 * reads it. (No load-time browser guard here, unlike lead-surface: ProductPage
 * is rendered under jsdom by existing tests.)
 */
export function ostinatoDemoEnabled(): boolean {
  return process.env.OSTINATO_DEMO_ENABLED === "1";
}
