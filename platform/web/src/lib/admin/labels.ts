import type { App, AppBackend } from "../data/types";
import { platformDefinition } from "../hosted/connectors/registry";

const BACKEND_NAMES: Record<AppBackend, string> = {
  wordpress: "Their WordPress site",
  custom_api: "Their own API",
  setup_requested: "Asked us to set up WordPress",
  hosted: "Yallapp hosted API",
};

/** Where an app's content comes from, as the admin shows it. */
export function contentSource(app: App): string {
  const connector = app.connector;
  if (connector?.kind === "shopify") return `Their Shopify store (${connector.shopDomain})`;
  if (connector?.kind === "platform") {
    const account = Object.values(connector.settings).find(Boolean);
    return `Their ${platformDefinition(connector.platform)?.name ?? connector.platform} account${account ? ` (${account})` : ""}`;
  }
  if (connector?.kind === "courses") return "No website: courses in the dashboard";
  if (connector?.kind === "bookings") return "No website: services and hours in the dashboard";
  if (connector?.kind === "catalog") {
    return `No website: products in the dashboard${app.catalogSettings?.payment?.provider === "yallapp" ? ", sells through Yallapp" : ""}`;
  }
  return BACKEND_NAMES[app.backend];
}
