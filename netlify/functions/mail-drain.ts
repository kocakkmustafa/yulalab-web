import { callCronRoute } from "../lib/call-cron-route";

/** Drains the lead / data-request mail outbox every 15 minutes (WEB-P0-07b). */
export default async function handler(): Promise<Response> {
  const result = await callCronRoute("/api/mail");
  return new Response(result, { status: 200 });
}

export const config = { schedule: "*/15 * * * *" };
