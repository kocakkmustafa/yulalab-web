/**
 * Whether the LifeOS synthetic decision and reminder try-out (WEB-P1-01) is
 * shown on the product page. Default closed: unset or anything other than "1"
 * means off.
 *
 * Same shape as `ostinato-demo-surface.ts`: the product page is prerendered, so
 * the flag is read once per render/revalidation on the server. While it is off
 * the demo component is never rendered, so no demo JS is loaded by the page.
 * It is not a NEXT_PUBLIC variable on purpose; the client component never
 * reads it.
 */
export function lifeosDemoEnabled(): boolean {
  return process.env.LIFEOS_DEMO_ENABLED === "1";
}
