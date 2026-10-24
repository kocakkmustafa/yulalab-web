/**
 * Motion Core parental-consent function used by `/[locale]/motion/consent`.
 *
 * The Supabase project ref and the function URL are public identifiers, not
 * secrets; the function runs with `verify_jwt = false`, so no key is sent.
 * Keep `null` until Motion Core publishes the live function with
 * `Access-Control-Allow-Origin: https://yulalab.com`; the page then shows an
 * "unavailable" state and its CSP allows no connection at all.
 */
export const MOTION_CONSENT_ENDPOINT: string | null = null;

export const MOTION_CONSENT_ENDPOINT_PATTERN =
  /^https:\/\/[a-z0-9]{20}\.supabase\.co\/functions\/v1\/motion-parental-consent$/;

/**
 * `YULA_MOTION_CONSENT_ENDPOINT` exists only so localhost E2E can point the page
 * at an intercepted fake project. It must stay unset on Netlify (REL-02a reads
 * the provider env names). Any value outside the exact Supabase function shape
 * disables the page instead of falling back.
 */
export function motionConsentEndpoint(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.YULA_MOTION_CONSENT_ENDPOINT ?? MOTION_CONSENT_ENDPOINT;
  return value && MOTION_CONSENT_ENDPOINT_PATTERN.test(value) ? value : null;
}
