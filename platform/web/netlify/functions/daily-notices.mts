// Netlify scheduled function (roadmap 13.4): once a day it asks the site to
// run its daily job, POST /api/internal/daily, which applies downgrades whose
// date came and sends the owner notices (plan ending in 7 days, tomorrow and
// today; app users at 80% and 100%), each only once. The work itself lives in
// src/lib/notices.ts (runDailyNotices), so it is tested without Netlify.
//
// Needs INTERNAL_JOB_SECRET (32+ characters) in the site's environment
// variables; the route refuses every request without it. Netlify runs
// scheduled functions on published deploys only.

export default async function dailyNotices(): Promise<Response> {
  const base = (process.env.URL ?? process.env.APP_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!base || !secret) {
    console.error("[daily-notices] URL or INTERNAL_JOB_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }
  const response = await fetch(`${base}/api/internal/daily`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "user-agent": "yallapp-daily-notices" },
  });
  const text = await response.text();
  if (!response.ok) console.error(`[daily-notices] ${response.status}: ${text.slice(0, 500)}`);
  else console.log(`[daily-notices] ${text.slice(0, 500)}`);
  return new Response(null, { status: response.ok ? 204 : 502 });
}

// Every day at 06:10 UTC (09:10 in Türkiye).
export const config = { schedule: "10 6 * * *" };
