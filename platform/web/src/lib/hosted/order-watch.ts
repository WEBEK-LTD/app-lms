import { createHash } from "node:crypto";
import { assetUrl } from "../assets";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { appUrl } from "../env";
import { notifyPlatformOrder, shopOnPlatform } from "./auto-notifications";
import { connectorFor } from "./connectors";
import type { Connector } from "./connectors/types";
import type { sendPush } from "./push";

/**
 * 91.2 Order updates from the connected platforms (Shopify, ikas, Ticimax,
 * IdeaSoft, Salla, Zid, Wix): they don't tell Yallapp when an order changes,
 * so after someone checks out from the app their orders are looked at every
 * WATCH_MINUTES for WATCH_DAYS. An order that was shipped (its tracking
 * appeared or changed), completed, cancelled or refunded since the last look
 * is told once (`order_update`, which opens the order); the first look only
 * notes what's there.
 */

export const WATCH_DAYS = 30;
export const WATCH_MINUTES = 15;
/** Watches looked at in each run of the frequent job. */
const PER_RUN = 40;

const DAY = 86_400_000;
const TOLD = new Set(["completed", "cancelled", "refunded"]);

/** The apps whose orders are watched: shops on Shopify or another connected platform. */
export const ordersWatched = shopOnPlatform;

/** Starts or extends the watch when someone checks out from the app. */
export async function watchOrdersAfterCheckout(store: DataStore, app: App, userId: number, now: Date): Promise<void> {
  if (ordersWatched(app)) await store.watchHostedOrders(app.id, userId, new Date(now.getTime() + WATCH_DAYS * DAY));
}

interface SeenOrder {
  id: number | string;
  number?: string;
  status?: string;
  shipment?: { carrier?: string | null; tracking_number?: string | null; tracking_url?: string | null } | null;
}

/** What an order looks like for telling a change: its status and its tracking. */
export function orderState(order: SeenOrder): string {
  const s = order.shipment;
  const tracking = s ? [s.carrier ?? "", s.tracking_number ?? "", s.tracking_url ?? ""].join(",") : "";
  return `${order.status ?? ""}|${tracking}`;
}

/** The change to tell between two states, or null. */
export function orderChange(before: string, after: string): "shipped" | "completed" | "cancelled" | "refunded" | null {
  if (before === after) return null;
  const [was, wasTracking] = splitState(before);
  const [now, tracking] = splitState(after);
  if (now !== was && TOLD.has(now)) return now as "completed" | "cancelled" | "refunded";
  if (tracking && tracking !== wasTracking && now !== "cancelled" && now !== "refunded") return "shipped";
  return null;
}

function splitState(state: string): [string, string] {
  const at = state.indexOf("|");
  return at < 0 ? [state, ""] : [state.slice(0, at), state.slice(at + 1)];
}

export interface OrderWatchDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  send?: typeof sendPush;
  /** How the platforms are reached (tests: a fake fetch). */
  fetcher?: typeof fetch;
  /** The app's connector (tests); connectorFor otherwise. */
  connectorOf?: (app: App) => Connector | null;
}

export interface OrderWatchReport {
  checked: number;
  told: number;
  ended: number;
}

/** One run: the watches due, oldest first. */
export async function runOrderWatches(deps: OrderWatchDeps): Promise<OrderWatchReport> {
  const { store, now } = deps;
  const report: OrderWatchReport = { checked: 0, told: 0, ended: await store.deleteEndedOrderWatches(now) };
  const due = await store.listDueOrderWatches(new Date(now.getTime() - WATCH_MINUTES * 60_000), now, PER_RUN);
  for (const watch of due) {
    // Looked at whatever happens, so a platform that fails waits for the next turn.
    let orders = watch.orders;
    try {
      const app = await store.getAppById(watch.appId);
      const user = app ? await store.getHostedUser(app.id, watch.userId) : null;
      const connector =
        app && user && ordersWatched(app) ? (deps.connectorOf ? deps.connectorOf(app) : connectorFor(app, deps.key, { store, assetUrl, platformUrl: appUrl() }, deps.fetcher)) : null;
      if (!app || !user || !connector) continue;
      const result = await connector.handle({ method: "GET", path: ["me", "orders"], query: new URLSearchParams({ per_page: "20" }), body: null, user, now, lang: null });
      if (!result || result.status !== 200) continue;
      const items = ((result.body as { items?: SeenOrder[] } | undefined)?.items ?? []).filter((o) => o && (typeof o.id === "number" || typeof o.id === "string"));
      const next: Record<string, string> = {};
      for (const order of items) {
        const id = String(order.id);
        const state = orderState(order);
        next[id] = state;
        const before = watch.orders[id];
        if (watch.checkedAt === null || before === undefined) continue;
        const change = orderChange(before, state);
        if (!change) continue;
        const s = order.shipment;
        const tracking = [s?.carrier, s?.tracking_number].filter(Boolean).join(" ");
        const ref = createHash("sha256").update(`${id}|${state}`).digest("hex").slice(0, 32);
        const sent = await notifyPlatformOrder(deps, app, user.id, { id, number: order.number ?? id, status: change, tracking: change === "shipped" ? tracking : "", ref });
        report.told += sent.people;
      }
      orders = next;
      report.checked += 1;
    } catch (e) {
      console.error(`[orders] app ${watch.appId}: the order watch failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    } finally {
      await store.saveOrderWatch(watch.appId, watch.userId, orders, now);
    }
  }
  return report;
}
