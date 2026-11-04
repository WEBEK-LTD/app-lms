// Netlify scheduled function (roadmap 114): every minute it asks the site to
// send the email campaigns' next emails, POST /api/internal/mail-campaigns,
// and asks again (up to three times in all) while the answer says a campaign
// may send more now. Each call sends for a few seconds; every campaign keeps
// to its own rate (emails a minute). The work lives in
// src/lib/mailing/campaigns.ts (runMailCampaigns), so it is tested without
// Netlify.
//
// Needs INTERNAL_JOB_SECRET (32+ characters), like the other jobs.

export default async function mailCampaigns(): Promise<Response> {
  const base = (process.env.URL ?? process.env.APP_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!base || !secret) {
    console.error("[mail-campaigns] URL or INTERNAL_JOB_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }
  const started = Date.now();
  for (let call = 0; call < 3 && Date.now() - started < 18_000; call += 1) {
    const response = await fetch(`${base}/api/internal/mail-campaigns`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "user-agent": "yallapp-mail-campaigns" },
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[mail-campaigns] ${response.status}: ${text.slice(0, 500)}`);
      return new Response(null, { status: 502 });
    }
    let more = false;
    try {
      more = (JSON.parse(text) as { more?: boolean }).more === true;
    } catch {
      more = false;
    }
    if (!more) break;
  }
  return new Response(null, { status: 204 });
}

// Every minute.
export const config = { schedule: "* * * * *" };
