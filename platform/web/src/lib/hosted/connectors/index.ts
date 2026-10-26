import { decrypt, encrypt } from "../../crypto/encryption";
import type { DataStore } from "../../data/store";
import type { App, ConnectorConfig } from "../../data/types";
import type { BookingAppointment } from "../../data/types";
import { ArticlesConnector } from "./articles";
import { BookingsConnector } from "./bookings";
import { CatalogConnector, type CatalogDeps } from "./catalog";
import { CoursesConnector, type CoursesDeps, type CoursesMedia } from "./courses";
import { EventsConnector } from "./events";
import { DonationsConnector } from "./donations";
import { ListingsConnector, type ListingsDeps } from "./listings";
import { platformConnector } from "./platforms";
import "./registry";
import { ShopifyConnector } from "./shopify";
import type { Connector } from "./types";

export const context = (appId: string) => `app:connector:${appId}`;

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
    /** 63 A course question or review (pushes to the business's phones). */
    onQuestion?: CoursesDeps["onQuestion"];
    onReview?: CoursesDeps["onReview"];
    /** 13.1 Card payments in the app (dashboard products, courses and 28 tickets) are in the app's plan. */
    cardPayments?: boolean;
    /** 91.4 Loyalty points are in the app's plan. */
    loyalty?: boolean;
    /** 91.3 A customer asked to return an order. */
    onReturnRequested?: CatalogDeps["onReturnRequested"];
    /** 45 Lessons of courses managed in Yallapp may be saved for offline viewing (lib/courses/downloads.ts). */
    downloads?: boolean;
    /** 51 Lesson videos from the app's Media library (lib/media/hosted.ts). */
    media?: CoursesMedia;
    /** 28 Signs ticket QR codes (each app's key is made from it); read from the environment when left out. */
    signingSecret?: string;
  },
  fetcher: typeof fetch = fetch,
): Connector | null {
  if (app.connector?.kind === "catalog") return new CatalogConnector({ ...deps, app });
  if (app.connector?.kind === "bookings") return new BookingsConnector({ ...deps, app });
  if (app.connector?.kind === "courses") return new CoursesConnector({ ...deps, app });
  if (app.connector?.kind === "listings") return new ListingsConnector({ ...deps, app });
  if (app.connector?.kind === "articles") return new ArticlesConnector({ ...deps, app });
  if (app.connector?.kind === "events") return new EventsConnector({ ...deps, app });
  if (app.connector?.kind === "campaigns") return new DonationsConnector({ ...deps, app });
  if (app.connector?.kind === "platform") return platformConnector(app, key, deps, fetcher);
  if (app.connector?.kind === "shopify") {
    const token = shopifyToken(app, key);
    if (!token) {
      // 19 Said in the server log: the app then has no content until the owner connects the shop again.
      console.error(`[hosted] app ${app.id}: the saved Shopify token can't be decrypted, so the shop isn't connected.`);
      return null;
    }
    return new ShopifyConnector({ shopDomain: app.connector.shopDomain, storefrontToken: token, adminToken: shopifyAdminToken(app, key) }, fetcher);
  }
  return null;
}
