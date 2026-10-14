import { checkApi } from "../app/api-check";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { shopifyAdminToken, shopifyToken } from "../hosted/connectors";
import { platformConnector } from "../hosted/connectors/platforms";
import { platformDefinition } from "../hosted/connectors/registry";
import { ShopifyConnector } from "../hosted/connectors/shopify";

export interface ConnectionStatus {
  ok: boolean;
  message: string;
  /** What failed, one line each. */
  problems: string[];
}

/**
 * Asks the app's website or platform whether it answers now (roadmap 11.2):
 * the API check for WordPress and custom APIs, the platform's own check for
 * Shopify and connected platforms. Dashboard content always answers.
 */
export async function checkConnection(store: DataStore, app: App, key: Buffer): Promise<ConnectionStatus> {
  const connector = app.connector;
  if (connector?.kind === "catalog" || connector?.kind === "bookings" || connector?.kind === "courses" || connector?.kind === "listings") {
    return { ok: true, message: "Content is managed in the dashboard and served by the hosted API.", problems: [] };
  }
  if (connector?.kind === "shopify") {
    const token = shopifyToken(app, key);
    if (!token) return { ok: false, message: "The Shopify token can't be read. The client connects the shop again.", problems: [] };
    try {
      const name = await new ShopifyConnector({ shopDomain: connector.shopDomain, storefrontToken: token, adminToken: shopifyAdminToken(app, key) }).check();
      return { ok: true, message: `Shopify answers: ${name}.`, problems: [] };
    } catch (error) {
      return { ok: false, message: "Shopify didn't accept the saved token.", problems: [error instanceof Error ? error.message : String(error)] };
    }
  }
  if (connector?.kind === "platform") {
    const name = platformDefinition(connector.platform)?.name ?? connector.platform;
    const platform = platformConnector(app, key, { store });
    if (!platform) return { ok: false, message: `The ${name} keys can't be read. The client connects again.`, problems: [] };
    try {
      return { ok: true, message: `${name} answers: ${await platform.check()}.`, problems: [] };
    } catch (error) {
      return { ok: false, message: `${name} didn't accept the saved keys.`, problems: [error instanceof Error ? error.message : String(error)] };
    }
  }
  if (app.backend === "hosted") return { ok: false, message: "The app is on the hosted API but nothing is connected yet.", problems: [] };
  if (app.backend === "setup_requested") {
    // 19 The plugin may already be active on the new site (activated before the client asked): check that site.
    const license = await store.getLicenseForApp(app.clientId, app.id);
    const activation = license ? await store.getActivation(license.id) : null;
    if (!activation) return { ok: false, message: "Waiting for our team to set up WordPress: the plugin isn't active on a site yet.", problems: [] };
    const base = `https://${activation.siteUrl}/wp-json/yallapp/v1`;
    const result = await checkApi(base, app.appType);
    return {
      ok: false,
      message: result.ok
        ? `The plugin is active on ${activation.siteUrl} and answers as the app expects. Use “WordPress is ready” to move the app to it.`
        : `The plugin is active on ${activation.siteUrl}, but it doesn't answer as the app expects yet.`,
      problems: result.checks.filter((c) => !c.ok).map((c) => (c.detail ? `${c.label}: ${c.detail}` : c.label)),
    };
  }
  const base = app.backend === "custom_api" ? app.apiBaseUrl : app.siteUrl ? `${app.siteUrl.replace(/\/+$/, "")}/wp-json/yallapp/v1` : null;
  if (!base) return { ok: false, message: "No website address is saved yet.", problems: [] };
  const result = await checkApi(base, app.appType);
  return {
    ok: result.ok,
    message: result.ok ? `${base} answers as the app expects.` : `${base} doesn't answer as the app expects.`,
    problems: result.checks.filter((c) => !c.ok).map((c) => (c.detail ? `${c.label}: ${c.detail}` : c.label)),
  };
}
