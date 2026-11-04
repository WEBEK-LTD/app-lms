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
  // Picking: a swap is named by the product's SKU or barcode, found in the vendor's own catalog.
  if (action === "lines" && Array.isArray(body.lines)) {
    const lines = [];
    for (const raw of body.lines as Record<string, unknown>[]) {
      const code = typeof raw.substitute_code === "string" ? raw.substitute_code.trim().slice(0, 64) : "";
      let substitute: number | null = null;
      if (raw.outcome === "substituted" && code) {
        const found = await store.listMarketProducts({ appId: app.id, vendorId: staff.restaurantId, code, page: 1, perPage: 1 });
        substitute = found.items[0]?.id ?? null;
        if (substitute === null) return { status: 400, body: { code: "invalid_request", message: "No product here has that SKU or barcode." } };
      }
      lines.push({ line_id: raw.line_id, outcome: raw.outcome, quantity: raw.quantity ?? null, substitute_product_id: substitute });
    }
    return vendorCall(store, app, staff, "PATCH", ["orders", String(orderId), "lines"], { lines });
  }
  return vendorCall(store, app, staff, action === "lines" ? "PATCH" : "POST", ["orders", String(orderId), action], body);
}
