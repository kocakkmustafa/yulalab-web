/**
 * Calls one of the site's cron routes (`/api/mail`, `/api/purge`) from a
 * Netlify scheduled function. `vercel.json` crons do not run on Netlify, so
 * this is the Netlify-side scheduler (WEB-P0-07b).
 *
 * Reads two environment NAMES, never prints their values: `CRON_SECRET` (the
 * same bearer the routes check) and `URL` (the site's primary URL, set by
 * Netlify). With either missing it does nothing, so the function is inert until
 * the founder sets CRON_SECRET in the Netlify UI.
 *
 * The routes answer 503 when something is skipped, blocked, dead or failed on
 * purpose (a monitor must notice); here that becomes a `console.error` line in
 * the function log with the status only, no body (a body can point at a person).
 */
export type CronCallResult = "skipped" | "ok" | "alarm" | "unauthorized" | "error";

export async function callCronRoute(
  path: "/api/mail" | "/api/purge",
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<CronCallResult> {
  const secret = env.CRON_SECRET;
  const base = env.URL;
  if (!secret || !base) {
    console.log(`cron ${path}: skipped (CRON_SECRET or URL not set)`);
    return "skipped";
  }
  try {
    const res = await fetchImpl(new URL(path, base), {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    if (res.status === 200) return "ok";
    if (res.status === 401) {
      console.error(`cron ${path}: 401 (CRON_SECRET differs between the function and the route)`);
      return "unauthorized";
    }
    console.error(`cron ${path}: status ${res.status}`);
    return "alarm";
  } catch (error) {
    console.error(`cron ${path}: request failed`, error instanceof Error ? error.name : "unknown");
    return "error";
  }
}
