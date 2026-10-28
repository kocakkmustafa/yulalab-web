/**
 * Motion Core parental-consent function used by `/[locale]/motion/consent`.
 *
 * The Supabase project ref and the function URL are public identifiers, not
 * secrets; the function runs with `verify_jwt = false`, so no key is sent.
 * Motion production project `aljdbngmeqwmsqhvfeau` (Yönetim read-only check, 2026-10-27);
 * set after Motion Core deployed the function with the R1 CORS contract for
 * https://yulalab.com and https://www.yulalab.com (K-3; no preview origin, so a
 * preview deploy cannot call it). The page CSP allows exactly this URL in `connect-src`.
 */
export const MOTION_CONSENT_ENDPOINT: string | null =
  "https://aljdbngmeqwmsqhvfeau.supabase.co/functions/v1/motion-parental-consent";

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
