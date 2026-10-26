import { currentPlanId } from "../billing/plan-change";
import type { DataStore } from "../data/store";
import { effectivePlans } from "../entitlements";
import type { App } from "../data/types";
import { sameSite } from "../license/site-url";
import { previewConfigFor, type PreviewConfig } from "./config";
import { verifyPreviewToken } from "./token";

export type PreviewConfigResult =
  | { status: 200; body: PreviewConfig }
  | { status: 403 | 404 | 410; body: { code: string; message: string } };

/**
 * 17 `GET /api/preview/{token}/config`: the app's preview config, for a valid
 * token only. The token names one app and is the only thing that gives
 * access: it reads nothing else.
 */
export async function previewConfigResult(
  store: DataStore,
  token: string,
  now: Date,
  options: { key: string; platformUrl: string; assetUrl: (assetId: string) => string },
): Promise<PreviewConfigResult> {
  const check = verifyPreviewToken(token, options.key, now);
  if (!check.ok) {
    return check.reason === "expired"
      ? { status: 410, body: { code: "preview_expired", message: "This preview link has expired. Open the preview again from your Yallapp dashboard." } }
      : { status: 403, body: { code: "invalid_token", message: "This preview link isn't valid. Open the preview from your Yallapp dashboard." } };
  }
  const app = await store.getAppById(check.grant.appId);
  if (!app) return { status: 404, body: { code: "not_found", message: "This app doesn't exist anymore." } };
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const plans = await effectivePlans(store);
  const plan = license ? currentPlanId(license, now) : null;
  return {
    status: 200,
    body: previewConfigFor(app, check.grant, {
      token,
      platformUrl: options.platformUrl,
      assetUrl: options.assetUrl,
      plan,
      plans,
      pluginConnected: await wordpressPluginConnected(store, app),
    }),
  };
}

/** The Yallapp plugin on the app's WordPress site has activated the app's license: only then can the preview read the site. */
export async function wordpressPluginConnected(store: DataStore, app: App): Promise<boolean> {
  if (app.backend !== "wordpress" || !app.siteUrl) return false;
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await store.getActivation(license.id) : null;
  return Boolean(activation && sameSite(activation.siteUrl, app.siteUrl));
}
