import { chooseApp, getClientContext } from "@/lib/auth/session";
import { appUrl } from "@/lib/env";
import { isPlan } from "@/lib/plans";

/**
 * GET /dashboard/open?app=<id>&to=renew|change-plan|users|app-sign-in|media: the links in the
 * owner emails and dashboard notices (13.2, 13.4). Opens the dashboard on
 * that app (only one of the signed-in client's own) and goes to the page.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const go = (path: string) => new Response(null, { status: 303, headers: { location: `${appUrl()}${path}` } });
  const context = await getClientContext();
  if (!context) return go("/sign-in");
  const app = context.apps.find((a) => a.id === url.searchParams.get("app"));
  if (app) await chooseApp(app.id);
  const plan = url.searchParams.get("plan");
  const query = isPlan(plan) ? `?plan=${plan}` : "";
  switch (url.searchParams.get("to")) {
    case "renew":
      return go(`/dashboard/license${query}#renew`);
    case "change-plan":
      return go(`/dashboard/license${query}#change-plan`);
    // 19 From the "own WhatsApp number failed" email.
    case "app-sign-in":
      return go("/dashboard/app-sign-in");
    // 51 From the storage emails and notices.
    case "media":
      return go("/dashboard/media");
    default:
      return go("/dashboard");
  }
}
