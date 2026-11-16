import type { DashKey } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { addDays, dayOf } from "../analytics/days";
import { appZone } from "../analytics/zone";
import type { AppAreas } from "../app/areas";
import { localToUtc } from "../bookings/time";
import { parseCoupon } from "../catalog/coupons";
import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type {
  App,
  CatalogCoupon,
  PrimeAlertSetting,
  StoreFlashSale,
} from "../data/types";
import { parseFlashSaleForm } from "../selling/flash-sales";
import { deliveryOf, slotLabel } from "../selling/delivery";
import { shopZone, zoneOffsetMinutes } from "../selling/zone";
import { teamCan } from "../team/permissions";
import {
  bodyObject,
  intParam,
  invalid,
  notFound,
  OwnerError,
  type OwnerContext,
  type OwnerResult,
} from "./http";
import { mainCurrency, saleEvents, type SaleEvent } from "./prime";
import { appScope, money, ownerAreas } from "./sales";
import { recordTeamActivity, type TeamAction } from "../team/activity";

/** The team's activity (Dashboard › Team) for a change made from the phone. */
function recordStaffActivity(
  ctx: OwnerContext,
  app: App,
  action: TeamAction,
  summary: string,
): Promise<void> {
  return recordTeamActivity(
    ctx.deps.store,
    {
      clientId: ctx.client.id,
      appId: app.id,
      actor: ctx.user,
      action,
      target: { type: "app", id: app.id },
      summary,
    },
    ctx.deps.now,
  );
}

/**
 * 132 Prime's second set in Yallapp Business, for the apps on a Studio plan
 * (or given Prime as a gift) and only where each makes sense: customer
 * insights (new and returning, the best customers by spend, those who
 * haven't come back in 30 or 60 days), product insights (best sellers, slow
 * movers, running low, sold out), a sales goal with Today's progress ring
 * and a push when it's reached (lib/owner/prime-jobs.ts), the weekly report
 * by email (the app's weekly summary, with Prime's parts), the ratings and
 * reviews, and quick actions from the phone (a coupon, a flash sale, a
 * restaurant's busy time, a delivery slot closed for a day). The same rules
 * as the dashboard's forms; customers' names only for those who may see
 * orders.
 */

type Period = "day" | "week" | "month";

/** A period's first day and its bounds in the app's zone; weeks start on Monday. */
export function periodOf(
  period: Period,
  today: string,
  zone: string,
): { key: string; start: Date; end: Date } {
  let first = today;
  let next = addDays(today, 1);
  if (period === "week") {
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    first = addDays(today, -weekday);
    next = addDays(first, 7);
  } else if (period === "month") {
    first = `${today.slice(0, 7)}-01`;
    const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
    next =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  return {
    key: first,
    start: localToUtc(first, "00:00", zone),
    end: localToUtc(next, "00:00", zone),
  };
}

const sumIn = (events: readonly SaleEvent[], currency: string) =>
  events.reduce((n, e) => n + (e.currency === currency ? e.cents : 0), 0);

/** The goal's progress now: the sales of its period so far in the app's main currency. */
export async function goalProgress(
  store: DataStore,
  app: App,
  areas: AppAreas,
  goal: PrimeAlertSetting,
  zone: string,
  now: Date,
) {
  const period = goal.period ?? "day";
  const range = periodOf(period, dayOf(now, zone), zone);
  const events = await saleEvents(store, app, areas, range.start, now);
  const currency = mainCurrency(events) ?? catalogSettings(app).currency;
  const current = sumIn(events, currency);
  const target = goal.amountCents ?? 0;
  return {
    period,
    key: range.key,
    currency,
    current,
    target,
    reached: target > 0 && current >= target,
  };
}

/** `Today.goal`: the person's goal on this Prime app, or null without one. */
export async function todayGoalJson(
  ctx: OwnerContext,
  app: App,
  areas: AppAreas,
) {
  const saved = await ctx.deps.store.getPrimeAlerts(ctx.user.id, app.id);
  const goal = saved?.alerts.find(
    (a) => a.kind === "sales_goal" && a.on && (a.amountCents ?? 0) > 0,
  );
  if (!goal) return null;
  const p = await goalProgress(
    ctx.deps.store,
    app,
    areas,
    goal,
    await appZone(ctx.deps.store, app),
    ctx.deps.now,
  );
  return {
    period: p.period,
    target: money(p.target, p.currency),
    current: money(p.current, p.currency),
    pct: Math.min(100, Math.round((p.current / p.target) * 100)),
    reached: p.reached,
    label: ctx.t(`owner.prime.goal_${p.period}` as DashKey),
  };
}

// Customers

/** Customers' names for those who may see orders (or the app's users); else only the numbers. */
const mayName = (ctx: OwnerContext, app: App) =>
  teamCan(ctx.access, "orders", app.id) ||
  teamCan(ctx.access, "app_users", app.id);

export async function getPrimeCustomers(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  const areas = ownerAreas(ctx, app);
  const period = ctx.req.query.get("period") || "month";
  if (period !== "week" && period !== "month")
    throw invalid({ period: "The request isn't valid." });
  const { store, now } = ctx.deps;
  const zone = await appZone(store, app);
  const today = dayOf(now, zone);
  const span = period === "week" ? 7 : 30;
  const start = localToUtc(addDays(today, -(span - 1)), "00:00", zone);
  const end = localToUtc(addDays(today, 1), "00:00", zone);
  // Six months back: who came before, who stopped coming.
  const all = await saleEvents(
    store,
    app,
    areas,
    localToUtc(addDays(today, -180), "00:00", zone),
    end,
  );
  const currency = mainCurrency(all) ?? catalogSettings(app).currency;
  type Person = {
    key: string;
    name: string | null;
    orders: number;
    spend: number;
    first: Date;
    last: Date;
    inPeriod: number;
    periodSpend: number;
  };
  const people = new Map<string, Person>();
  for (const e of [...all].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (!e.customer) continue;
    const p = people.get(e.customer) ?? {
      key: e.customer,
      name: null,
      orders: 0,
      spend: 0,
      first: e.at,
      last: e.at,
      inPeriod: 0,
      periodSpend: 0,
    };
    p.orders += 1;
    if (e.currency === currency) p.spend += e.cents;
    p.last = e.at;
    p.name = e.customerName ?? p.name;
    if (e.at.getTime() >= start.getTime()) {
      p.inPeriod += 1;
      if (e.currency === currency) p.periodSpend += e.cents;
    }
    people.set(e.customer, p);
  }
  const named = mayName(ctx, app);
  const inPeriod = [...people.values()].filter((p) => p.inPeriod > 0);
  const fresh = inPeriod.filter((p) => p.first.getTime() >= start.getTime());
  const day = 86_400_000;
  const away = (from: number, to: number) =>
    [...people.values()].filter(
      (p) =>
        now.getTime() - p.last.getTime() >= from * day &&
        now.getTime() - p.last.getTime() < to * day,
    );
  const person = (p: Person) => ({
    name: named ? p.name : null,
    orders: p.orders,
    spend: money(p.spend, currency),
    last_order_at: p.last.toISOString(),
  });
  const lapsed = (list: Person[]) => ({
    count: list.length,
    people: list
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)
      .map(person),
  });
  return {
    status: 200,
    body: {
      period,
      customers: inPeriod.length,
      new: fresh.length,
      returning: inPeriod.length - fresh.length,
      top: inPeriod
        .sort(
          (a, b) => b.periodSpend - a.periodSpend || b.inPeriod - a.inPeriod,
        )
        .slice(0, 10)
        .map((p) => ({
          ...person(p),
          orders: p.inPeriod,
          spend: money(p.periodSpend, currency),
        })),
      lapsed_30: lapsed(away(30, 60)),
      lapsed_60: lapsed(away(60, 181)),
      names_shown: named,
    },
  };
}

// Products

export async function getPrimeProducts(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  const areas = ownerAreas(ctx, app);
  if (!areas.products)
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  const period = ctx.req.query.get("period") || "month";
  if (period !== "week" && period !== "month")
    throw invalid({ period: "The request isn't valid." });
  const { store, now } = ctx.deps;
  const zone = await appZone(store, app);
  const today = dayOf(now, zone);
  const span = period === "week" ? 7 : 30;
  const start = localToUtc(addDays(today, -(span - 1)), "00:00", zone);
  const [events, products, saved] = await Promise.all([
    saleEvents(
      store,
      app,
      {
        ...areas,
        appointments: false,
        donations: false,
        foodOrders: false,
        rides: false,
        market: false,
        shipments: false,
      },
      start,
      now,
    ),
    store.listCatalogProducts(app.id),
    store.getPrimeAlerts(ctx.user.id, app.id),
  ]);
  const currency = catalogSettings(app).currency;
  const sold = new Map<number, { units: number; cents: number }>();
  for (const e of events)
    for (const l of e.lines ?? []) {
      const s = sold.get(l.productId) ?? { units: 0, cents: 0 };
      s.units += l.quantity;
      s.cents += l.cents;
      sold.set(l.productId, s);
    }
  const listed = products.filter((p) => p.active && !p.addon);
  const threshold =
    saved?.alerts.find((a) => a.kind === "low_stock")?.threshold ?? 3;
  const row = (p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    units: sold.get(p.id)?.units ?? 0,
    total: money(sold.get(p.id)?.cents ?? 0, currency),
    stock: p.stock,
  });
  return {
    status: 200,
    body: {
      period,
      threshold,
      best: listed
        .filter((p) => (sold.get(p.id)?.units ?? 0) > 0)
        .map(row)
        .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
        .slice(0, 10),
      // Listed for the whole period and sold least (nothing first).
      slow: listed
        .filter((p) => p.createdAt.getTime() <= start.getTime())
        .map(row)
        .sort((a, b) => a.units - b.units || a.name.localeCompare(b.name))
        .slice(0, 10),
      low_stock: listed
        .filter((p) => p.stock !== null && p.stock > 0 && p.stock <= threshold)
        .map(row),
      out_of_stock: listed.filter((p) => p.stock === 0).map(row),
    },
  };
}

// Reviews and ratings

export async function getPrimeReviews(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  const areas = ownerAreas(ctx, app);
  if (!(areas.foodOrders || areas.market || areas.rides || areas.reviews))
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  const { store, now } = ctx.deps;
  const since = new Date(now.getTime() - 90 * 86_400_000);
  const named = mayName(ctx, app);
  const items: {
    source: string;
    id: number;
    rating: number;
    comment: string | null;
    at: string;
    name: string | null;
    about: string;
    can_reply: boolean;
    reply: string | null;
  }[] = [];
  if (areas.foodOrders) {
    for (const o of (
      await store.listFoodOrders({
        appId: app.id,
        statuses: ["delivered"],
        updatedSince: since,
        order: "newest",
        offset: 0,
        limit: 200,
      })
    ).items) {
      if (o.rating)
        items.push({
          source: "food",
          id: o.id,
          rating: o.rating.restaurant,
          comment: o.rating.comment,
          at: new Date(o.rating.at).toISOString(),
          name: named ? o.customerName : null,
          about: o.restaurantName,
          can_reply: false,
          reply: null,
        });
    }
  }
  if (areas.market) {
    for (const o of (
      await store.listMarketOrders({
        appId: app.id,
        statuses: ["delivered", "picked_up"],
        order: "newest",
        limit: 200,
        offset: 0,
      })
    ).items) {
      if (o.rating)
        items.push({
          source: "market",
          id: o.id,
          rating: o.rating.vendor,
          comment: o.rating.comment,
          at: new Date(o.rating.at).toISOString(),
          name: named ? o.customerName : null,
          about: o.vendorName,
          can_reply: false,
          reply: null,
        });
    }
  }
  if (areas.rides) {
    for (const r of (
      await store.listRides({
        appId: app.id,
        statuses: ["completed"],
        updatedSince: since,
        order: "newest",
        offset: 0,
        limit: 200,
      })
    ).items) {
      if (r.rating)
        items.push({
          source: "ride",
          id: r.id,
          rating: r.rating.driver,
          comment: r.rating.comment,
          at: new Date(r.rating.at).toISOString(),
          name: named ? r.riderName : null,
          about: r.driverName ?? r.vehicleTypeName,
          can_reply: false,
          reply: null,
        });
    }
  }
  // Course reviews: answered from the phone too (PUT …/reviews/{review_id}/reply).
  if (areas.reviews) {
    for (const v of (
      await store.listCourseReviews({ appId: app.id, offset: 0, limit: 100 })
    ).items) {
      items.push({
        source: "course",
        id: v.id,
        rating: v.rating,
        comment: v.text,
        at: v.createdAt.toISOString(),
        name: null,
        about: "",
        can_reply: true,
        reply: v.replyText ?? null,
      });
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  const average = items.length
    ? Math.round(
        (items.reduce((n, i) => n + i.rating, 0) / items.length) * 10,
      ) / 10
    : null;
  return {
    status: 200,
    body: { average, count: items.length, items: items.slice(0, 100) },
  };
}

// The weekly report

export async function getWeeklyReport(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  return {
    status: 200,
    body: {
      on: app.weeklySummary !== false,
      email: ctx.client.id ? await clientEmail(ctx) : null,
    },
  };
}

async function clientEmail(ctx: OwnerContext): Promise<string | null> {
  const owner = await ctx.deps.store.getUserById(ctx.client.userId);
  return owner?.email ?? null;
}

/** The app's weekly summary by email (Dashboard › Analytics' switch), on or off. */
export async function setWeeklyReport(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  const on = bodyObject(ctx.req.body).on;
  if (typeof on !== "boolean")
    throw invalid({ on: "The request isn't valid." });
  await ctx.deps.store.updateApp(app.id, { weeklySummary: on }, ctx.deps.now);
  await recordStaffActivity(
    ctx,
    app,
    "prime.weekly_report",
    on
      ? "Turned on the weekly summary email"
      : "Turned off the weekly summary email",
  );
  return { status: 200, body: { on, email: await clientEmail(ctx) } };
}

// Quick actions

function requireCatalog(ctx: OwnerContext, app: App) {
  if (!ownerAreas(ctx, app).products)
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  if (!teamCan(ctx.access, "catalog", app.id))
    throw new OwnerError(
      403,
      "not_allowed",
      "Your role on this team doesn't allow this. Ask the owner.",
    );
}

const text = (body: Record<string, unknown>, name: string) =>
  typeof body[name] === "string"
    ? (body[name] as string)
    : typeof body[name] === "number"
      ? String(body[name])
      : "";

function couponJson(c: CatalogCoupon, currency: string) {
  return {
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.kind === "percent" ? c.value : null,
    amount: c.kind === "amount" ? money(c.value, currency) : null,
    min_order:
      c.minOrderCents !== null ? money(c.minOrderCents, currency) : null,
    starts_at: c.startsAt?.toISOString() ?? null,
    ends_at: c.endsAt?.toISOString() ?? null,
    max_uses: c.maxUses,
    public: Boolean(c.public),
  };
}

/** A coupon, with the dashboard's rules (Store › Coupons). */
export async function createCoupon(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  requireCatalog(ctx, app);
  const body = bodyObject(ctx.req.body);
  const { store, now } = ctx.deps;
  const parsed = parseCoupon(
    {
      code: text(body, "code"),
      kind: text(body, "kind"),
      value: text(body, "value"),
      minOrder: text(body, "min_order"),
      startsOn: text(body, "starts_on"),
      endsOn: text(body, "ends_on"),
      maxUses: text(body, "max_uses"),
      public: body.public === true ? "on" : "",
    },
    now,
  );
  if (!parsed.ok)
    throw invalid(
      fieldsOf(parsed.errors, {
        minOrder: "min_order",
        startsOn: "starts_on",
        endsOn: "ends_on",
        maxUses: "max_uses",
      }),
    );
  const created = await store.createCatalogCoupon({
    appId: app.id,
    ...parsed.value,
    active: true,
    createdAt: now,
  });
  if (!created)
    throw invalid({ code: "You already have a coupon with this code." });
  await recordStaffActivity(
    ctx,
    app,
    "prime.coupon",
    `Added the coupon ${created.code}`,
  );
  return {
    status: 201,
    body: couponJson(created, catalogSettings(app).currency),
  };
}

function fieldsOf(
  errors: Record<string, string>,
  names: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [names[k] ?? k, v]),
  );
}

function flashJson(s: StoreFlashSale, currency: string) {
  return {
    id: s.id,
    title: s.title,
    product_ids: s.productIds,
    category_id: s.categoryId,
    percent: s.discount.kind === "percent" ? s.discount.percent : null,
    price:
      s.discount.kind === "price" ? money(s.discount.cents, currency) : null,
    starts_at: s.startsAt.toISOString(),
    ends_at: s.endsAt.toISOString(),
    limit: s.limit,
    sold: s.sold,
    active: s.active,
  };
}

/** A flash sale, with the dashboard's rules (Store › Delivery & offers), its times in the shop's zone. */
export async function createFlashSale(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  requireCatalog(ctx, app);
  const body = bodyObject(ctx.req.body);
  const { store, now } = ctx.deps;
  const ids = Array.isArray(body.product_ids)
    ? (body.product_ids as unknown[]).map(String).join(",")
    : "";
  const parsed = parseFlashSaleForm(
    {
      title: text(body, "title"),
      productIds: ids,
      categoryId: text(body, "category_id"),
      kind: text(body, "kind"),
      value: text(body, "value"),
      startsAt: text(body, "starts_at"),
      endsAt: text(body, "ends_at"),
      limit: text(body, "limit"),
      platformCode: "",
    },
    zoneOffsetMinutes(shopZone(app), now),
  );
  if (!parsed.ok)
    throw invalid(
      fieldsOf(parsed.errors, {
        productIds: "product_ids",
        categoryId: "category_id",
        startsAt: "starts_at",
        endsAt: "ends_at",
      }),
    );
  // Only the shop's own products.
  const own = new Set(
    (await store.listCatalogProducts(app.id)).map((p) => p.id),
  );
  if (parsed.value.productIds.some((id) => !own.has(id)))
    throw invalid({
      product_ids: "Choose the products on sale, or a category.",
    });
  const sale = await store.createFlashSale({
    appId: app.id,
    ...parsed.value,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  await recordStaffActivity(
    ctx,
    app,
    "prime.flash_sale",
    `Saved the flash sale “${sale.title}”`,
  );
  return { status: 201, body: flashJson(sale, catalogSettings(app).currency) };
}

const BUSY_CHOICES = [0, 15, 30, 45, 60, 90];

/** A restaurant takes no new orders for a while (busy mode), or again now; as its own desk does. */
export async function setRestaurantBusy(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "restaurants");
  if (!ownerAreas(ctx, app).prime)
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  const minutes = bodyObject(ctx.req.body).minutes;
  if (typeof minutes !== "number" || !BUSY_CHOICES.includes(minutes))
    throw invalid({ minutes: `Choose ${BUSY_CHOICES.join(", ")} minutes.` });
  const { store, now } = ctx.deps;
  const restaurant = await store.getRestaurant(
    app.id,
    intParam(params.restaurant_id),
  );
  if (!restaurant) throw notFound();
  const busyUntil =
    minutes === 0 ? null : new Date(now.getTime() + minutes * 60_000);
  await store.updateRestaurant(app.id, restaurant.id, { busyUntil }, now);
  await recordStaffActivity(
    ctx,
    app,
    "restaurant.busy",
    minutes === 0
      ? `Opened ${restaurant.name} for new orders`
      : `Made ${restaurant.name} busy for ${minutes} minutes`,
  );
  return {
    status: 200,
    body: { id: restaurant.id, busy_until: busyUntil?.toISOString() ?? null },
  };
}

/** The delivery slots of a day, each open or closed by the owner. */
export async function getDeliverySlots(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  requireCatalog(ctx, app);
  const settings = deliveryOf(app);
  if (!settings)
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  const date =
    ctx.req.query.get("date") || dayOf(ctx.deps.now, settings.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw invalid({ date: "The request isn't valid." });
  const closed = new Set(
    (settings.closedSlots ?? [])
      .filter((c) => c.date === date)
      .map((c) => c.slotId),
  );
  return {
    status: 200,
    body: {
      date,
      date_label: formatDate(ctx.lang, new Date(`${date}T12:00:00Z`), {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
      slots: settings.slots.map((s) => ({
        id: s.id,
        label: slotLabel(s),
        closed: closed.has(s.id),
      })),
    },
  };
}

/** Closes a delivery slot for a day (the checkout stops offering it), or opens it again. */
export async function setSlotClosed(
  ctx: OwnerContext,
  params: Record<string, string>,
): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  requireCatalog(ctx, app);
  const settings = deliveryOf(app);
  if (!settings)
    throw new OwnerError(404, "not_available", "Your app doesn't have this.");
  const body = bodyObject(ctx.req.body);
  const { store, now } = ctx.deps;
  const date = typeof body.date === "string" ? body.date : "";
  const today = dayOf(now, settings.timezone);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < today ||
    date > addDays(today, 60)
  )
    throw invalid({ date: "Choose a day from today on." });
  if (typeof body.closed !== "boolean")
    throw invalid({ closed: "The request isn't valid." });
  const slot = settings.slots.find((s) => s.id === params.slot_id);
  if (!slot) throw notFound();
  // Past days are let go; at most 200 closures kept.
  const kept = (settings.closedSlots ?? []).filter(
    (c) => c.date >= today && !(c.date === date && c.slotId === slot.id),
  );
  const closedSlots = body.closed
    ? [...kept, { date, slotId: slot.id }].slice(-200)
    : kept;
  const saved = catalogSettings(app);
  await store.updateApp(
    app.id,
    {
      catalogSettings: {
        ...saved,
        delivery: { ...(saved.delivery ?? settings), closedSlots },
      },
    },
    now,
  );
  await recordStaffActivity(
    ctx,
    app,
    "prime.slot",
    `${body.closed ? "Closed" : "Opened"} the delivery time ${slotLabel(slot)} on ${date}`,
  );
  return getDeliverySlots(
    {
      ...ctx,
      req: { ...ctx.req, query: new URLSearchParams({ date }) },
      apps: ctx.apps.map((a) =>
        a.id === app.id
          ? {
              ...a,
              catalogSettings: {
                ...saved,
                delivery: { ...(saved.delivery ?? settings), closedSlots },
              },
            }
          : a,
      ),
    },
    params,
  );
}
