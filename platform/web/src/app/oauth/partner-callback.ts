import { revalidatePath } from "next/cache";
import { recordStaffChange } from "@/lib/admin/audit";
import { chooseApp, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, sessionSecret } from "@/lib/env";
import { oauthRedirectUri, partnerAppCredentials, readOAuthState } from "@/lib/hosted/connectors/partner-apps";
import { PlatformCheckError, platformConnectorConfig } from "@/lib/hosted/connectors/platforms";
import { platformDefinition } from "@/lib/hosted/connectors/registry";

/**
 * 25 Where Salla and Zid send the store owner back after they approve
 * Yallapp's partner app (src/app/oauth/<platform>/route.ts):
 * `?code=…&state=…`, or `?error=…`. The `state` is the app's ID signed by
 * this server (lib/hosted/connectors/partner-apps.ts), and the signed-in
 * dashboard user must own that app. The code is swapped for tokens, the
 * store is checked (store details and one product), and the connection is
 * saved as the Website step's choice; the owner goes back to the Website
 * step. Problems are shown on a small page with the way back.
 */

const WEBSITE_STEP = "/dashboard/setup?step=website";

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(title: string, text: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)} · Yallapp</title>
</head>
<body style="margin:0;background:#F4EFE6;color:#0E0D24;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.5">
<main style="max-width:560px;margin:48px auto;padding:0 16px">
<div style="background:#FFFFFF;border-radius:12px;padding:24px">
<h1 style="font-size:22px;margin:0 0 12px">${escape(title)}</h1>
<p>${escape(text)}</p>
<p><a href="${WEBSITE_STEP}" style="color:#C2410C">Back to the Website step</a></p>
</div>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}

export async function partnerOAuthCallback(request: Request, platformId: "salla" | "zid", fetcher: typeof fetch = fetch): Promise<Response> {
  const definition = platformDefinition(platformId);
  const oauth = definition?.oauth;
  if (!definition || !oauth) return page("Not available", "This platform can't be connected.", 404);
  const query = new URL(request.url).searchParams;
  const now = new Date();
  const state = readOAuthState(query.get("state") ?? "", sessionSecret(), now);
  if (!state || state.platform !== definition.id) {
    return page("This link has expired", `Start again from the Website step of your Yallapp dashboard and select Connect with ${definition.name}.`, 400);
  }
  if (query.get("error")) {
    return page("Access wasn't given", `${definition.name} didn't give Yallapp access to your store, so nothing was connected.`, 400);
  }
  const context = await getClientContext();
  if (!context || !mayUseDashboard(context)) {
    return page("Sign in first", `Sign in to your Yallapp dashboard, then select Connect with ${definition.name} again.`, 401);
  }
  const app = context.apps.find((a) => a.id === state.appId);
  if (!app) return page("Not your app", `This approval was started for an app of another account. Sign in to the right account and connect again.`, 403);
  if (app.appType !== definition.appType) {
    return page("Choose Store first", `${definition.name} works with Store apps. Change your app type to Store, then connect again.`, 400);
  }
  const code = query.get("code")?.trim() ?? "";
  if (!code || code.length > 2000) return page("Something went wrong", `${definition.name} sent no approval. Please connect again.`, 400);

  const store = await getStore();
  const key = encryptionKey();
  const credentials = await partnerAppCredentials(store, oauth.settingKey, key);
  if (!credentials) return page("Not available yet", `Connecting a ${definition.name} store isn't available yet. Message us on WhatsApp.`, 503);

  let values: Record<string, string>;
  try {
    values = await oauth.connect(code, credentials, oauthRedirectUri(appUrl(), definition.id), fetcher);
  } catch {
    return page(`${definition.name} didn't accept this approval`, `The approval may have expired. Select Connect with ${definition.name} again.`, 400);
  }
  let renewed: Record<string, string> = {};
  try {
    await definition
      .create(values, {
        appId: app.id,
        store,
        fetcher,
        saveSecrets: async (secrets) => {
          renewed = { ...renewed, ...secrets };
        },
        partnerApp: async () => credentials,
      })
      .check();
  } catch (e) {
    return page(
      "Your store couldn't be connected",
      e instanceof PlatformCheckError ? e.message : `${definition.name} didn't answer. Please try again in a moment.`,
      e instanceof PlatformCheckError ? 400 : 503,
    );
  }
  await store.updateApp(app.id, { backend: "hosted", connector: platformConnectorConfig(app.id, definition, { ...values, ...renewed }, key), websiteDoneAt: now }, now);
  await recordStaffChange({ ...context, app }, `Connected a ${definition.name} store on the Website step`);
  await chooseApp(app.id);
  revalidatePath("/dashboard", "layout");
  return new Response(null, { status: 303, headers: { location: `${appUrl()}${WEBSITE_STEP}&connected=${definition.id}`, "cache-control": "no-store" } });
}
