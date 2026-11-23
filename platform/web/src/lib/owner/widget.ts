import { appAreas } from "../app/areas";
import { teamCan } from "../team/permissions";
import { authenticateRequest } from "./auth";
import { type OwnerContext, type OwnerDeps, type OwnerRequest, type OwnerResult } from "./http";
import { today } from "./sales";
import { inMoneyLang } from "./money-lang";
import { createWidgetToken, widgetKey } from "./tokens";

/**
 * 214 The home-screen widget (Android's AppWidget, iOS's WidgetKit): the
 * shop's day at a glance, read with the widget's own token (lib/owner/tokens.ts
 * `yw1.`), never the app's.
 *
 *   POST /me/widget-token     (the app, signed in) → { token, expires_at }
 *   GET  /widget?app_id=…     (the widget) → the apps to choose from, and the
 *                              chosen one's sales today, orders today and new
 *                              orders waiting; the first app when none is chosen.
 */

/** What counts as new orders waiting on the widget. */
const WAITING = new Set(["orders_in_progress", "food_orders_new", "shipments_waiting", "rides_searching"]);

export async function widgetToken(ctx: OwnerContext): Promise<OwnerResult> {
  const { token, expiresAt } = createWidgetToken(ctx.device.id, widgetKey(ctx.deps.signingSecret), ctx.deps.now);
  return { status: 200, body: { token, expires_at: expiresAt.toISOString() } };
}

/** The apps the widget may show: those whose orders or sales the person sees. */
function widgetApps(ctx: OwnerContext) {
  return ctx.apps.filter((a) => {
    const areas = appAreas(a);
    const sells = areas.orders || areas.foodOrders || areas.market || areas.rides || areas.shipments || areas.donations || areas.appointments;
    return sells && teamCan(ctx.access, "orders", a.id);
  });
}

export async function widgetBody(deps: OwnerDeps, req: OwnerRequest): Promise<OwnerResult> {
  const ctx = await authenticateRequest(deps, req, true);
  // Amounts as the person reads them (Latin digits in every language).
  return inMoneyLang(ctx.lang, () => widgetFor(ctx, deps, req));
}

async function widgetFor(ctx: OwnerContext, deps: OwnerDeps, req: OwnerRequest): Promise<OwnerResult> {
  const apps = widgetApps(ctx);
  const wanted = req.query.get("app_id");
  const app = apps.find((a) => a.id === wanted) ?? apps[0];
  const list = apps.map((a) => ({ id: a.id, name: a.appName?.trim() || ctx.k("Untitled app") }));
  if (!app) return { status: 200, body: { apps: list, app: null, updated_at: deps.now.toISOString() } };
  const day = (await today(ctx, { app_id: app.id })).body as {
    date: string;
    sales: { amount_cents: number; currency: string; formatted: string }[];
    counts: Record<string, number | null>;
    needs_you: { kind: string; count: number }[];
  };
  const sales = [...day.sales].sort((a, b) => b.amount_cents - a.amount_cents)[0] ?? null;
  const orders = (day.counts.orders ?? 0) + (day.counts.donations ?? 0) + (day.counts.appointments ?? 0);
  return {
    status: 200,
    body: {
      apps: list,
      app: {
        id: app.id,
        name: list.find((a) => a.id === app.id)!.name,
        date: day.date,
        sales: sales ? { amount_cents: sales.amount_cents, currency: sales.currency, formatted: sales.formatted } : null,
        orders,
        waiting: day.needs_you.filter((n) => WAITING.has(n.kind)).reduce((sum, n) => sum + n.count, 0),
      },
      updated_at: deps.now.toISOString(),
    },
  };
}
