// Netlify scheduled function (roadmap 61): every 5 minutes it asks the site to
// run its frequent job, POST /api/internal/frequent, which sends the
// notifications to apps' users whose time came (Dashboard › App notifications
// › Send later, and Yallapp Business) and pushes the announcements that
// started to the owners' phones, each once. The work lives in
// src/lib/jobs/frequent.ts (runFrequentJobs), so it is tested without Netlify.
//
// Needs INTERNAL_JOB_SECRET (32+ characters), like the daily job.

export default async function frequentJobs(): Promise<Response> {
  const base = (process.env.URL ?? process.env.APP_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!base || !secret) {
    console.error("[frequent-jobs] URL or INTERNAL_JOB_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }
  const response = await fetch(`${base}/api/internal/frequent`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "user-agent": "yallapp-frequent-jobs" },
  });
  const text = await response.text();
  if (!response.ok) console.error(`[frequent-jobs] ${response.status}: ${text.slice(0, 500)}`);
  return new Response(null, { status: response.ok ? 204 : 502 });
}

// Every 5 minutes.
export const config = { schedule: "*/5 * * * *" };
