import { getStore } from "@/lib/data";
import { appUrl, internalJobSecret, signingSecret } from "@/lib/env";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { openMailer } from "@/lib/mail";
import { runMailCampaigns } from "@/lib/mailing/campaigns";
import { getPlans } from "@/lib/settings/platform";
import { teamMail } from "@/lib/watch/env";

/**
 * 114 POST /api/internal/mail-campaigns: sends the email campaigns' next
 * emails for a few seconds (lib/mailing/campaigns.ts), each campaign at its
 * rate. `netlify/functions/mail-campaigns.mts` calls it every minute with
 * `Authorization: Bearer $INTERNAL_JOB_SECRET`, again while `more` says a
 * campaign may send more now. Safe to call again, also at the same time.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const report = await runMailCampaigns({
    store,
    now: () => new Date(),
    baseUrl: appUrl(),
    secret: signingSecret(),
    mailer: () => openMailer(store),
    plans: await getPlans(store),
    // Under a synchronous function's time limit, with room for the replies; the scheduled
    // function calls again (up to 3 times a minute) while a campaign may send more.
    budgetMs: 7000,
    alertMail: teamMail,
  });
  return json(report);
}
