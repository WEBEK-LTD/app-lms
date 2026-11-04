import type { DataStore } from "../data/store";
import type { App, RestaurantStaff } from "../data/types";
import { assetUrl } from "../assets";
import { paymentsSetUp } from "../catalog/settings";
import { appUrl } from "../env";
import { MarketConnector } from "../hosted/connectors/market";
import type { ConnectorResult } from "../hosted/connectors/types";

/**
 * 115.7 What the vendors' web panel reads and does, through the same vendor
 * routes as the vendor app (lib/hosted/connectors/market.ts), for the staff
 * member signed in to the panel: their vendor's orders only.
 */

function connector(store: DataStore, app: App) {
  return new MarketConnector({ store, app, assetUrl, platformUrl: appUrl(), cardPayments: paymentsSetUp(app) });
}

async function vendorCall(store: DataStore, app: App, staff: RestaurantStaff, method: string, path: string[], body: unknown, query: Record<string, string> = {}): Promise<ConnectorResult> {
  return connector(store, app).handleAsStaff({ method, path, query: new URLSearchParams(query), body, user: null, now: new Date() }, staff);
}

export async function boardData(store: DataStore, app: App, staff: RestaurantStaff) {
  const [desk, fresh, active, scheduled] = await Promise.all([
    vendorCall(store, app, staff, "GET", ["me"], null),
    vendorCall(store, app, staff, "GET", ["orders"], null, { status: "new", per_page: "50" }),
    vendorCall(store, app, staff, "GET", ["orders"], null, { status: "active", per_page: "50" }),
    vendorCall(store, app, staff, "GET", ["orders"], null, { status: "scheduled", per_page: "50" }),
  ]);
  if (desk.status !== 200) return null;
  const items = (r: ConnectorResult) => (r.status === 200 ? ((r.body as { items: unknown[] }).items ?? []) : []);
  return { desk: desk.body, fresh: items(fresh), active: items(active), scheduled: items(scheduled) };
}

const ACTIONS = new Set(["accept", "reject", "ready", "handover", "lines"]);

/** One of the board's buttons: an order's step, or the vendor's busy and paused. */
export async function boardAction(store: DataStore, app: App, staff: RestaurantStaff, input: Record<string, unknown>): Promise<ConnectorResult> {
  const { action, order_id: orderId, ...body } = input;
  if (action === "desk") return vendorCall(store, app, staff, "PATCH", ["me"], body);
  if (typeof action !== "string" || !ACTIONS.has(action) || typeof orderId !== "number") return { status: 400, body: { code: "invalid_request", message: "Unknown action." } };
  return vendorCall(store, app, staff, action === "lines" ? "PATCH" : "POST", ["orders", String(orderId), action], body);
}
