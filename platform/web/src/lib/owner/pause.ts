import type { App, Restaurant } from "../data/types";
import { appPause, pauseApp, pauseJson, pausePlace, placePause, readPause, reopen } from "../shop/pause";
import { bodyObject, invalid, notAllowed, notAvailable, notFound, type OwnerContext, type OwnerResult } from "./http";
import { appScope, ownerAreas } from "./sales";
import { teamCan } from "../team/permissions";

/**
 * 214 Yallapp Business's "Pause the shop" (lib/shop/pause.ts): a shop (a
 * catalog app) pauses as a whole; a food app's restaurants and a
 * marketplace's places one by one, or all at once. Those who may move its
 * orders may pause it.
 *
 *   GET    apps/:app_id/pause                   the shop's and each place's pause
 *   PUT    apps/:app_id/pause                   { minutes: 15 | 30 | 60 | null, reason?, place_id?: id | "all" }
 *   DELETE apps/:app_id/pause?place_id=id|all   reopens now
 */

type Kind = "shop" | "places";

function scope(ctx: OwnerContext, appId: string | undefined): { app: App; kind: Kind } {
  const { app } = appScope(ctx, appId);
  const has = ownerAreas(ctx, app);
  const kind: Kind | null = has.orders ? "shop" : has.restaurants || has.market ? "places" : null;
  if (!kind) throw notAvailable();
  if (!teamCan(ctx.access, "orders", app.id)) throw notAllowed();
  return { app, kind };
}

async function bodyJson(ctx: OwnerContext, app: App, kind: Kind) {
  const { store, now } = ctx.deps;
  // The app as it is now (a pause just saved is on the stored app).
  const current = (await store.getAppById(app.id)) ?? app;
  const places: Restaurant[] = kind === "places" ? [...(await store.listRestaurants(app.id))].filter((r) => r.active).sort((a, b) => a.position - b.position || a.id - b.id) : [];
  return {
    kind,
    shop: kind === "shop" ? pauseJson(appPause(current, now)) : null,
    places: places.map((r) => ({ id: r.id, name: r.name, paused: pauseJson(placePause(current, r.id, now)) })),
    minutes: [15, 30, 60, null],
  };
}

export async function getPause(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, kind } = scope(ctx, params.app_id);
  return { status: 200, body: await bodyJson(ctx, app, kind) };
}

async function placesOf(ctx: OwnerContext, app: App, which: unknown): Promise<Restaurant[]> {
  const all = (await ctx.deps.store.listRestaurants(app.id)).filter((r) => r.active);
  if (which === "all") return all;
  const id = typeof which === "number" ? which : Number(which);
  const place = all.find((r) => r.id === id);
  if (!place) throw notFound();
  return [place];
}

export async function setPause(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, kind } = scope(ctx, params.app_id);
  const body = bodyObject(ctx.req.body);
  const read = readPause(body);
  if (!read.ok) throw invalid({ [read.field]: read.error });
  const { store, now } = ctx.deps;
  if (kind === "shop") await pauseApp(store, app, read, now);
  else {
    if (body.place_id === undefined || body.place_id === null) throw invalid({ place_id: "Choose the place to pause, or all." });
    let current = app;
    for (const place of await placesOf(ctx, app, body.place_id)) {
      await pausePlace(store, current, place, read, now);
      current = (await store.getAppById(app.id)) ?? current;
    }
  }
  return { status: 200, body: await bodyJson(ctx, app, kind) };
}

export async function deletePause(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, kind } = scope(ctx, params.app_id);
  const { store, now } = ctx.deps;
  if (kind === "shop") await reopen(store, app, null, now);
  else {
    const which = ctx.req.query.get("place_id");
    if (!which) throw invalid({ place_id: "Choose the place to reopen, or all." });
    let current = app;
    for (const place of await placesOf(ctx, app, which)) {
      await reopen(store, current, place.id, now);
      current = (await store.getAppById(app.id)) ?? current;
    }
  }
  return { status: 200, body: await bodyJson(ctx, app, kind) };
}
