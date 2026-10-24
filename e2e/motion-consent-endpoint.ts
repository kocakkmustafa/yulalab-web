// Fake Supabase project used only by localhost E2E (playwright.config.ts passes it to
// `next start`; the specs intercept every request to it). Not a real project ref.
export const E2E_MOTION_CONSENT_ENDPOINT = "https://e2eyulamotionconsent.supabase.co/functions/v1/motion-parental-consent";
