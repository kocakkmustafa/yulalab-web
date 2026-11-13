import { callCronRoute } from "../lib/call-cron-route";

/** Daily retention purge, 01:00 UTC = 04:00 Europe/Istanbul (same hour as vercel.json). */
export default async function handler(): Promise<Response> {
  const result = await callCronRoute("/api/purge");
  return new Response(result, { status: 200 });
}

export const config = { schedule: "0 1 * * *" };
