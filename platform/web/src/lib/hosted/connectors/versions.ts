import type { App, ConnectorConfig } from "../../data/types";
import { SHOPIFY_API_VERSION } from "./shopify";
import type { PlatformId } from "./platforms";

/**
 * 83.4 Every connector of the hosted API with its version and the outside
 * API it reads, in one place (docs/CONNECTORS.md lists the same). A
 * connector's version goes up with each change to what it sends the app:
 * the third number for a fix, the second for something new (more fields, a
 * new list), the first when the app must change too. Versions started at
 * 1.0.0 with 83.4. The admin shows them on the client's page.
 */

export type ConnectorId = Exclude<ConnectorConfig["kind"], "platform"> | PlatformId;

export interface ConnectorVersion {
  name: string;
  version: string;
  /** The outside API it reads, or "Yallapp" for content kept on the platform. */
  api: string;
}

export const CONNECTOR_VERSIONS: Record<ConnectorId, ConnectorVersion> = {
  // Content kept on Yallapp (no website).
  catalog: { name: "Products (no website)", version: "1.0.0", api: "Yallapp" },
  bookings: { name: "Services and appointments (no website)", version: "1.0.0", api: "Yallapp" },
  courses: { name: "Courses (no website)", version: "1.0.0", api: "Yallapp" },
  listings: { name: "Listings (real estate)", version: "1.0.0", api: "Yallapp" },
  articles: { name: "Articles (news and blog)", version: "1.0.0", api: "Yallapp" },
  events: { name: "Events and tickets", version: "1.0.0", api: "Yallapp" },
  campaigns: { name: "Campaigns and donations", version: "1.0.0", api: "Yallapp" },
  // Platforms.
  shopify: { name: "Shopify", version: "1.0.0", api: `Storefront API and Admin API (GraphQL, ${SHOPIFY_API_VERSION})` },
  ikas: { name: "ikas", version: "1.0.0", api: "ikas Admin API (GraphQL, v1)" },
  ticimax: { name: "Ticimax", version: "1.0.0", api: "Ticimax web services (SOAP)" },
  ideasoft: { name: "IdeaSoft", version: "1.0.0", api: "IdeaSoft Admin API (REST, OAuth 2)" },
  wix: { name: "Wix", version: "1.0.0", api: "Wix REST APIs (Stores, Bookings)" },
  salla: { name: "Salla", version: "1.0.0", api: "Salla Admin API v2 (OAuth 2)" },
  zid: { name: "Zid", version: "1.0.0", api: "Zid API v1 (OAuth 2)" },
  teachable: { name: "Teachable", version: "1.1.0", api: "Teachable API v1" },
  thinkific: { name: "Thinkific", version: "1.1.0", api: "Thinkific Public API v1" },
  simplybook: { name: "SimplyBook.me", version: "1.0.0", api: "SimplyBook.me API v2 (REST)" },
  rss: { name: "RSS feed", version: "1.0.0", api: "RSS 2.0 and Atom feeds" },
};

/** The app's connector and its version, or null without one (a WordPress app reads its site through the plugin). */
export function connectorOfApp(app: Pick<App, "connector">): (ConnectorVersion & { id: ConnectorId }) | null {
  const connector = app.connector;
  if (!connector) return null;
  const id = (connector.kind === "platform" ? connector.platform : connector.kind) as ConnectorId;
  const known = CONNECTOR_VERSIONS[id];
  return known ? { id, ...known } : null;
}
