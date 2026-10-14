import { decrypt, encrypt } from "../../crypto/encryption";
import type { DataStore } from "../../data/store";
import type { App, ConnectorConfig } from "../../data/types";
import type { BookingAppointment } from "../../data/types";
import { BookingsConnector } from "./bookings";
import { CatalogConnector } from "./catalog";
import { CoursesConnector } from "./courses";
import { ListingsConnector, type ListingsDeps } from "./listings";
import { platformConnector } from "./platforms";
import "./registry";
import { ShopifyConnector } from "./shopify";
import type { Connector } from "./types";

const context = (appId: string) => `app:connector:${appId}`;

export function shopifyConnectorConfig(
  appId: string,
  shopDomain: string,
  storefrontToken: string,
  key: Buffer,
  adminToken: string | null = null,
): ConnectorConfig {
  return {
    kind: "shopify",
    shopDomain,
    storefrontTokenEncrypted: encrypt(storefrontToken, key, context(appId)),
    adminTokenEncrypted: adminToken ? encrypt(adminToken, key, context(appId)) : null,
  };
}

/** The saved Admin API access token, decrypted (server only), or null. */
export function shopifyAdminToken(app: App, key: Buffer): string | null {
  if (app.connector?.kind !== "shopify" || !app.connector.adminTokenEncrypted) return null;
  try {
    return decrypt(app.connector.adminTokenEncrypted, key, context(app.id));
  } catch {
    return null;
  }
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
export function connectorFor(
  app: App,
  key: Buffer,
  deps: {
    store: DataStore;
    assetUrl: (assetId: string) => string;
    platformUrl: string;
    onBooked?: (appointment: BookingAppointment) => Promise<void>;
    onInquiry?: ListingsDeps["onInquiry"];
  },
  fetcher: typeof fetch = fetch,
): Connector | null {
  if (app.connector?.kind === "catalog") return new CatalogConnector({ ...deps, app });
  if (app.connector?.kind === "bookings") return new BookingsConnector({ ...deps, app });
  if (app.connector?.kind === "courses") return new CoursesConnector({ ...deps, app });
  if (app.connector?.kind === "listings") return new ListingsConnector({ ...deps, app });
  if (app.connector?.kind === "platform") return platformConnector(app, key, deps, fetcher);
  if (app.connector?.kind === "shopify") {
    const token = shopifyToken(app, key);
    return token
      ? new ShopifyConnector({ shopDomain: app.connector.shopDomain, storefrontToken: token, adminToken: shopifyAdminToken(app, key) }, fetcher)
      : null;
  }
  return null;
}
