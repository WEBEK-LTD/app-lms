import { decrypt, encrypt } from "../../crypto/encryption";
import type { App, ConnectorConfig } from "../../data/types";
import { ShopifyConnector } from "./shopify";
import type { Connector } from "./types";

const context = (appId: string) => `app:connector:${appId}`;

export function shopifyConnectorConfig(appId: string, shopDomain: string, storefrontToken: string, key: Buffer): ConnectorConfig {
  return { kind: "shopify", shopDomain, storefrontTokenEncrypted: encrypt(storefrontToken, key, context(appId)) };
}

/** The saved Storefront access token, decrypted (server only). */
export function shopifyToken(app: App, key: Buffer): string | null {
  if (app.connector?.kind !== "shopify") return null;
  try {
    return decrypt(app.connector.storefrontTokenEncrypted, key, context(app.id));
  } catch {
    return null;
  }
}

/** The connector that serves the app's content, or null when none is connected. */
export function connectorFor(app: App, key: Buffer, fetcher: typeof fetch = fetch): Connector | null {
  if (app.connector?.kind === "shopify") {
    const token = shopifyToken(app, key);
    return token ? new ShopifyConnector({ shopDomain: app.connector.shopDomain, storefrontToken: token }, fetcher) : null;
  }
  return null;
}
