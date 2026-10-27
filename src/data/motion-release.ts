/**
 * Motion first-release switches for site copy that is only true once Motion Core
 * services are live. Flip in a dedicated commit after the live check, never ahead of it.
 *
 * MOTION_PARENTAL_CONSENT_LIVE: Core `motion-parental-consent` answers yulalab.com with
 * CORS, parental-approval mail is sent through Google Workspace, Supabase Auth account
 * mail uses the same Workspace SMTP, and `/[locale]/motion/consent` is deployed. Gates the
 * parental-approval section of the Motion privacy page, its retention row and the
 * Workspace processor sentence.
 */
export const MOTION_PARENTAL_CONSENT_LIVE = false;
