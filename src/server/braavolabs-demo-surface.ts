/**
 * Whether the Braavolabs agent run trace try-out (WEB-P2-01c) is shown on the
 * Lab page. Default closed: unset or anything other than "1" means off.
 *
 * Same shape as `ostinato-demo-surface.ts`: the Lab page is prerendered, so the
 * flag is read once per render/revalidation on the server. It is not a
 * NEXT_PUBLIC variable on purpose; the client never reads it. (The Braavolabs
 * product page's plan demo has no flag and is not affected by this one.)
 */
export function braavolabsDemoEnabled(): boolean {
  return process.env.BRAAVOLABS_DEMO_ENABLED === "1";
}
