// Netlify scheduled function (roadmap 49): every 5 minutes it asks the site to
// run its webhook job, POST /api/internal/webhooks, which tries again the
// signed notices to apps' own APIs that are due (account.deleted) and deletes
// those older than 30 days. The work lives in src/lib/hosted/api-webhooks.ts
// (runApiWebhooks), so it is tested without Netlify.
//
// Needs INTERNAL_JOB_SECRET (32+ characters), like the daily job.

export default async function apiWebhooks(): Promise<Response> {
  const base = (process.env.URL ?? process.env.APP_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!base || !secret) {
    console.error("[api-webhooks] URL or INTERNAL_JOB_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }
  const response = await fetch(`${base}/api/internal/webhooks`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "user-agent": "yallapp-api-webhooks" },
  });
  const text = await response.text();
  if (!response.ok) console.error(`[api-webhooks] ${response.status}: ${text.slice(0, 500)}`);
  return new Response(null, { status: response.ok ? 204 : 502 });
}

// Every 5 minutes.
export const config = { schedule: "*/5 * * * *" };
