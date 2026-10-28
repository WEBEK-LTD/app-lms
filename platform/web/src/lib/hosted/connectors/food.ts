import { paymentsSetUp } from "../../catalog/settings";
import { centsToDecimal, formatCents } from "../../catalog/money";
import type { DataStore } from "../../data/store";
import type { DeliverySettings, FoodOrder, HostedUser, Restaurant } from "../../data/types";
import { localToUtc, utcToLocal } from "../../bookings/time";
import { courierWho } from "../../delivery/service";
import { deliverySettingsOf, pricesSet } from "../../delivery/settings";
import { acceptOrder, announceOrder, cancelOrder, readyOrder, rejectOrder } from "../../food/flow";
import { foodConfig, foodOrderJson, readCart, readFoodOrder, restaurantJson, restaurantOrderJson, restaurantSummaryJson, type CartRequest, type RestaurantNear } from "../../food/json";
import { EMPTY_MENU } from "../../food/menu";
import { foodPayLink } from "../../food/payment";
import { isReviewOrder, ordersFor, reviewRestaurantFor } from "../../food/review";
import {
  commissionOf,
  DEFAULT_FOOD_TIMEZONE,
  deliveryMinutes,
  deliveryQuote,
  distanceFrom,
  FOOD_ACTIVE,
  FOOD_CANCELLABLE,
  foodLineJson,
  foodStage,
  priceCart,
  RESTAURANT_ACTIVE,
  RESTAURANT_DONE,
  RESTAURANT_NEW,
  restaurantState,
} from "../../food/service";
import { FOOD_REJECTIONS, type FoodRejection } from "../../data/types";
import { parseAnyPhone } from "../phone";
import { platformSetting } from "../../settings/platform";
import { hostedSettings } from "../service";
import { error, intParam } from "./common";
import { DeliveryConnector, type DeliveryDeps } from "./delivery";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface FoodDeps extends Omit<DeliveryDeps, "delivery"> {
  /** The plan has food delivery apps (default true). */
  food?: boolean;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const restaurantNotFound = () => error(404, "not_found", "Restaurant not found.");
const orderNotFound = () => error(404, "not_found", "Order not found.");
const notRestaurant = () => error(403, "not_restaurant", "This account doesn't work for one of our restaurants.");
const unavailable = () => error(503, "delivery_unavailable", "We aren't taking orders in the app yet. Please try again later.");
/** The restaurant's "done" list goes back this far. */
const DONE_DAYS = 2;
/** A delivered order may be rated for this long. */
const RATING_DAYS = 7;

/**
 * 105.1 Food delivery from many restaurants: customers browse the company's
 * restaurants and their menus, price a cart, order (cash, or by card on the
 * company's payment page) and follow it; a restaurant's staff (people the
 * company added to it by number) take its orders; the company's couriers
 * deliver them through the courier screens of Phase 104, which this
 * connector hands to the delivery connector. Everything a restaurant's
 * staff do is checked against the restaurant they work for.
 */
export class FoodConnector implements Connector {
  private readonly couriers: DeliveryConnector;

  constructor(private readonly deps: FoodDeps) {
    this.couriers = new DeliveryConnector({ ...deps, delivery: true });
  }

  private async settings(): Promise<DeliverySettings> {
    return deliverySettingsOf(await this.deps.store.getDeliverySettings(this.deps.app.id));
  }

  private get canTakeCards(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  private flow(now: Date) {
    return { store: this.deps.store, app: this.deps.app, now };
  }

  async config() {
    const [settings, maps] = await Promise.all([this.settings(), platformSetting(this.deps.store, "maps")]);
    return {
      food: foodConfig({ ...settings, card: settings.card && this.canTakeCards }, maps?.value ?? null),
      features: { orders: settings.card && this.canTakeCards },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const path = request.path;
    const mine = path[0] === "me" && path[1] === "food-orders";
    if (path[0] !== "food" && path[0] !== "restaurant" && path[0] !== "courier" && !mine) return null;
    if (this.deps.food === false) return error(403, "feature_disabled", "Food orders aren't available in this app right now.");
    if (path[0] === "courier") return this.couriers.handle(request);
    const route = `${request.method} /${path.join("/")}`;
    switch (route) {
      case "GET /food/restaurants":
        return this.restaurants(request);
      case "POST /food/quote":
        return this.quote(request);
      case "POST /food/orders":
        return this.order(request);
      case "GET /me/food-orders":
        return this.myOrders(request);
      case "GET /restaurant/me":
        return this.desk(request);
      case "PATCH /restaurant/me":
        return this.busy(request);
      case "GET /restaurant/orders":
        return this.restaurantOrders(request);
    }
    const id = path[2] && /^\d{1,15}$/.test(path[2]) ? Number(path[2]) : null;
    if (id !== null) {
      if (path[0] === "food" && path[1] === "restaurants" && request.method === "GET" && path.length === 3) return this.restaurant(request, id);
      if (mine) {
        if (request.method === "GET" && path.length === 3) return this.myOrder(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "cancel") return this.cancel(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "pay") return this.pay(request, id);
        if (request.method === "PUT" && path.length === 4 && path[3] === "rating") return this.rate(request, id);
      }
      if (path[0] === "restaurant" && path[1] === "orders") {
        if (request.method === "GET" && path.length === 3) return this.restaurantOrder(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "accept") return this.accept(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "reject") return this.reject(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "ready") return this.ready(request, id);
      }
    }
    return error(404, "not_found", "Not found.");
  }

  // The customer

  /** Where the customer is, from `lat` and `lng`. */
  private position(query: URLSearchParams): { lat: number; lng: number } | null {
    const lat = Number(query.get("lat"));
    const lng = Number(query.get("lng"));
    if (!query.get("lat") || !query.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  private near(r: Restaurant, settings: DeliverySettings, at: { lat: number; lng: number } | null, now: Date): RestaurantNear {
    const state = restaurantState(r, settings.timezone ?? DEFAULT_FOOD_TIMEZONE, now);
    const km = distanceFrom(r, at);
    // By area, the fee is known only once the customer chooses theirs.
    const quote = at && settings.pricing !== "zone" ? deliveryQuote(settings, r, { address: "", details: null, lat: at.lat, lng: at.lng }, null) : null;
    return {
      state,
      distanceKm: km,
      feeCents: quote?.ok ? quote.cents : settings.pricing === "fixed" ? settings.fixedCents : null,
      delivers: quote ? quote.ok : null,
      deliveryMinutes: deliveryMinutes(r.prepMinutes, km),
    };
  }

  private async restaurants(request: ConnectorRequest): Promise<ConnectorResult> {
    const q = (request.query.get("q") ?? "").trim().slice(0, 80);
    const cuisine = (request.query.get("cuisine") ?? "").slice(0, 40);
    const sort = request.query.get("sort") ?? "recommended";
    if (!["recommended", "distance", "rating", "delivery_time"].includes(sort)) return error(400, "invalid_request", "Unknown order.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const at = this.position(request.query);
    const [all, settings] = await Promise.all([this.deps.store.listRestaurants(this.deps.app.id, q ? { q } : {}), this.settings()]);
    const rows = all
      .filter((r) => r.active && (!cuisine || r.cuisines.includes(cuisine)))
      .map((r) => ({ r, near: this.near(r, settings, at, request.now) }));
    const last = Number.MAX_SAFE_INTEGER;
    const key = ({ r, near }: (typeof rows)[number]): number =>
      sort === "distance" ? (near.distanceKm ?? last) : sort === "rating" ? -(r.ratingCount ? r.ratingSum / r.ratingCount : 0) : sort === "delivery_time" ? (near.deliveryMinutes ?? r.prepMinutes) : r.position;
    rows.sort((a, b) => Number(b.near.delivers !== false) - Number(a.near.delivers !== false) || Number(b.near.state.open) - Number(a.near.state.open) || key(a) - key(b) || a.r.id - b.r.id);
    const items = rows.slice((page - 1) * perPage, page * perPage).map(({ r, near }) => restaurantSummaryJson(r, near, settings, this.deps.assetUrl));
    return { status: 200, body: { page, per_page: perPage, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / perPage)), items } };
  }

  private async restaurant(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const r = await this.deps.store.getRestaurant(this.deps.app.id, id);
    if (!r || !r.active) return restaurantNotFound();
    const [menu, settings] = await Promise.all([this.deps.store.getRestaurantMenu(this.deps.app.id, id), this.settings()]);
    return { status: 200, body: restaurantJson(r, menu ?? EMPTY_MENU, this.near(r, settings, this.position(request.query), request.now), settings, this.deps.assetUrl) };
  }

  /** The cart priced at today's prices with its delivery fee, or the error to answer with. */
  private async price(cart: CartRequest, settings: DeliverySettings, now: Date) {
    const r = await this.deps.store.getRestaurant(this.deps.app.id, cart.restaurantId);
    if (!r || !r.active) return { error: restaurantNotFound() };
    const state = restaurantState(r, settings.timezone ?? DEFAULT_FOOD_TIMEZONE, now);
    if (!state.open) {
      return { error: error(409, "restaurant_closed", state.busy ? `${r.name} is very busy right now. Please try again in a little while.` : `${r.name} is closed now.`) };
    }
    const menu = (await this.deps.store.getRestaurantMenu(this.deps.app.id, r.id)) ?? EMPTY_MENU;
    const priced = priceCart(menu, cart.lines);
    if (!priced.ok) return { error: { status: priced.code === "invalid_request" ? 400 : 409, body: { code: priced.code, message: priced.error, details: { field: priced.field } } } };
    if (priced.subtotalCents < r.minOrderCents) {
      return { error: error(409, "below_minimum", `${r.name}'s smallest order is ${formatCents(r.minOrderCents, settings.currency)}. Add a little more.`) };
    }
    const fee = deliveryQuote(settings, r, cart.dropoff, cart.zoneId);
    if (!fee.ok) return { error: error(400, "outside_delivery_area", fee.error) };
    const totalCents = priced.subtotalCents + fee.cents;
    return { restaurant: r, lines: priced.lines, subtotalCents: priced.subtotalCents, feeCents: fee.cents, totalCents, distanceKm: fee.distanceKm };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const read = readCart(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const settings = await this.settings();
    if (!pricesSet(settings)) return unavailable();
    const priced = await this.price(read.value, settings, request.now);
    if ("error" in priced) return priced.error!;
    const c = settings.currency;
    return {
      status: 200,
      body: {
        lines: priced.lines.map((l) => foodLineJson(l, c)),
        subtotal: centsToDecimal(priced.subtotalCents),
        subtotal_formatted: formatCents(priced.subtotalCents, c),
        delivery_fee: centsToDecimal(priced.feeCents),
        delivery_fee_formatted: formatCents(priced.feeCents, c),
        total: centsToDecimal(priced.totalCents),
        total_formatted: formatCents(priced.totalCents, c),
        currency: c,
        distance_km: priced.distanceKm,
        delivery_minutes: deliveryMinutes(priced.restaurant.prepMinutes, priced.distanceKm),
      },
    };
  }

  private async order(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const { store, app } = this.deps;
    const read = readFoodOrder(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const input = read.value;
    const phone = input.phone ? parseAnyPhone(input.phone, hostedSettings(app).defaultCountryCode)?.e164 : request.user.phone;
    if (!phone) return error(400, "invalid_request", "Enter your mobile number so the courier can call you.");
    const settings = await this.settings();
    if (!pricesSet(settings)) return unavailable();
    if (input.payment === "cash" && !settings.cash) return error(400, "invalid_request", "Cash isn't taken. Pay by card.");
    if (input.payment === "card" && !settings.card) return error(400, "invalid_request", "Cards aren't taken. Pay the courier in cash.");
    if (input.payment === "card" && !this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const priced = await this.price(input, settings, request.now);
    if ("error" in priced) return priced.error!;
    const status = input.payment === "cash" ? "placed" : "awaiting_payment";
    const created = await store.createFoodOrder({
      appId: app.id,
      restaurantId: priced.restaurant.id,
      restaurantName: priced.restaurant.name,
      userId: request.user.id,
      customerName: request.user.name || "Customer",
      customerPhone: phone,
      lines: priced.lines,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents: priced.feeCents,
      totalCents: priced.totalCents,
      commissionCents: commissionOf(priced.subtotalCents, priced.restaurant.commissionBp),
      currency: settings.currency,
      paymentMethod: input.payment,
      paymentStatus: "unpaid",
      orderId: null,
      status,
      dropoff: input.dropoff,
      zoneId: input.zoneId,
      distanceKm: priced.distanceKm,
      notes: input.notes,
      readyAt: null,
      rejection: null,
      shipmentId: null,
      rating: null,
      timeline: [foodStage(status, request.now, "customer")],
      lang: request.lang ?? null,
      createdAt: request.now,
      updatedAt: request.now,
    });
    let payUrl: string | null = null;
    if (input.payment === "card") payUrl = (await foodPayLink(store, app, created, this.deps.platformUrl, request.now)).url;
    else await announceOrder(this.flow(request.now), created);
    const saved = (await store.getFoodOrder(app.id, created.id)) ?? created;
    return { status: 201, body: { order: foodOrderJson(saved, { restaurant: priced.restaurant, assetUrl: this.deps.assetUrl }), pay_url: payUrl } };
  }

  private async ownOrder(request: ConnectorRequest, id: number): Promise<FoodOrder | null> {
    const order = await this.deps.store.getFoodOrder(this.deps.app.id, id);
    return order && order.userId === request.user?.id ? order : null;
  }

  /** The order as its customer sees it, with its restaurant, courier and, with live tracking, where the courier is. */
  private async customerJson(order: FoodOrder, now: Date, settings?: DeliverySettings) {
    const { store, app } = this.deps;
    const [restaurant, job] = await Promise.all([
      order.restaurantId !== null ? store.getRestaurant(app.id, order.restaurantId) : null,
      order.shipmentId !== null ? store.getShipment(app.id, order.shipmentId) : null,
    ]);
    const courier = job?.courierId != null ? await store.getCourier(app.id, job.courierId) : null;
    return foodOrderJson(order, { restaurant, job, courier, settings, now, assetUrl: this.deps.assetUrl });
  }

  private async myOrders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const active = request.query.get("active") === "true";
    const { items, total } = await this.deps.store.listFoodOrders({
      appId: this.deps.app.id,
      userId: request.user.id,
      ...(active ? { statuses: FOOD_ACTIVE } : {}),
      order: "newest",
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    const json = await Promise.all(items.map((o) => this.customerJson(o, request.now)));
    return { status: 200, body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: json } };
  }

  private async myOrder(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const order = await this.ownOrder(request, id);
    if (!order) return orderNotFound();
    return { status: 200, body: await this.customerJson(order, request.now, await this.settings()) };
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const order = await this.ownOrder(request, id);
    if (!order) return orderNotFound();
    if (order.status === "cancelled") return { status: 200, body: await this.customerJson(order, request.now) };
    const refused = () => error(409, "not_cancellable", "The restaurant already accepted this order. Please contact us to cancel it.");
    if (!FOOD_CANCELLABLE.includes(order.status)) return refused();
    const moved = await cancelOrder(this.flow(request.now), order, "customer");
    if (!moved.ok) return refused();
    return { status: 200, body: await this.customerJson(moved.order, request.now) };
  }

  private async pay(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const order = await this.ownOrder(request, id);
    if (!order) return orderNotFound();
    if (order.status !== "awaiting_payment" || order.paymentStatus !== "unpaid") return error(409, "not_payable", "This order has nothing to pay.");
    if (!this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const link = await foodPayLink(this.deps.store, this.deps.app, order, this.deps.platformUrl, request.now);
    return { status: 200, body: { url: link.url } };
  }

  private async rate(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const order = await this.ownOrder(request, id);
    if (!order) return orderNotFound();
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const stars = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
    const restaurant = stars(body.restaurant);
    if (restaurant === null) return error(400, "invalid_request", "Choose a rating from 1 to 5.");
    const courier = body.courier === null || body.courier === undefined ? null : stars(body.courier);
    if (body.courier !== null && body.courier !== undefined && courier === null) return error(400, "invalid_request", "Choose a rating from 1 to 5.");
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) || null : null;
    if (order.status !== "delivered") return error(409, "not_rateable", "You can rate an order once it's delivered.");
    if (order.rating) return error(409, "not_rateable", "You already rated this order.");
    const delivered = [...order.timeline].reverse().find((s) => s.status === "delivered");
    if (delivered && request.now.getTime() - Date.parse(delivered.at) > RATING_DAYS * 86_400_000) return error(409, "not_rateable", "Orders can be rated within 7 days.");
    const rating = { restaurant, courier, comment, at: request.now.toISOString() };
    if (!(await this.deps.store.updateFoodOrder(this.deps.app.id, order.id, { rating, updatedAt: request.now }, { statuses: ["delivered"] }))) {
      return error(409, "not_rateable", "You can rate an order once it's delivered.");
    }
    if (order.restaurantId !== null) await this.deps.store.addRestaurantRating(this.deps.app.id, order.restaurantId, restaurant);
    return { status: 200, body: await this.customerJson({ ...order, rating, updatedAt: request.now }, request.now) };
  }

  // The restaurant

  /**
   * The restaurant the signed-in person works for, or null. Paused staff and paused restaurants aren't.
   * The store review account works for the first restaurant, with its own orders only (lib/food/review.ts).
   */
  private async restaurantOf(user: HostedUser | null): Promise<Desk | null> {
    if (!user) return null;
    const staff = await this.deps.store.findRestaurantStaff(this.deps.app.id, courierWho(user));
    if (staff?.active) {
      const restaurant = await this.deps.store.getRestaurant(this.deps.app.id, staff.restaurantId);
      return restaurant?.active ? { restaurant, review: false } : null;
    }
    const review = await reviewRestaurantFor(this.deps.store, this.deps.app, user);
    return review ? { restaurant: review, review: true } : null;
  }

  private async withRestaurant(request: ConnectorRequest, then: (desk: Desk) => Promise<ConnectorResult>): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const desk = await this.restaurantOf(request.user);
    return desk ? then(desk) : notRestaurant();
  }

  private async deskJson({ restaurant: r, review }: Desk, now: Date) {
    const settings = await this.settings();
    const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
    const since = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
    const whose = await ordersFor(this.deps.store, this.deps.app, review);
    const today = !whose ? { items: [], total: 0 } : await this.deps.store.listFoodOrders({
      appId: this.deps.app.id,
      ...whose,
      restaurantId: r.id,
      statuses: ["placed", "accepted", "ready", "picked_up", "on_the_way", "delivered"],
      since,
      order: "newest",
      offset: 0,
      limit: 1000,
    });
    const state = restaurantState(r, timezone, now);
    return {
      id: r.id,
      name: r.name,
      logo_url: r.logoAssetId ? this.deps.assetUrl(r.logoAssetId) : null,
      open: state.inHours,
      busy_until: state.busy ? r.busyUntil!.toISOString() : null,
      accepting: state.open,
      today: { orders: today.total, sales_formatted: formatCents(today.items.reduce((sum, o) => sum + o.subtotalCents, 0), settings.currency) },
    };
  }

  private desk(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => ({ status: 200, body: await this.deskJson(desk, request.now) }));
  }

  private busy(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const minutes = (request.body as { busy_minutes?: unknown } | null)?.busy_minutes;
      if (typeof minutes !== "number" || !Number.isInteger(minutes) || (minutes !== 0 && (minutes < 15 || minutes > 240))) {
        return error(400, "invalid_request", "Choose from 15 minutes to 4 hours, or open again.");
      }
      const busyUntil = minutes === 0 ? null : new Date(request.now.getTime() + minutes * 60_000);
      // The reviewers' choice is shown, never kept: the restaurant is a real one.
      if (!desk.review) await this.deps.store.updateRestaurant(this.deps.app.id, desk.restaurant.id, { busyUntil }, request.now);
      return { status: 200, body: await this.deskJson({ ...desk, restaurant: { ...desk.restaurant, busyUntil } }, request.now) };
    });
  }

  private async staffJson(order: FoodOrder) {
    const job = order.shipmentId !== null ? await this.deps.store.getShipment(this.deps.app.id, order.shipmentId) : null;
    const courier = job?.courierId != null ? await this.deps.store.getCourier(this.deps.app.id, job.courierId) : null;
    return restaurantOrderJson(order, job, courier);
  }

  private restaurantOrders(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const scope = request.query.get("scope");
      if (scope !== "new" && scope !== "active" && scope !== "done") return error(400, "invalid_request", "Unknown list.");
      const page = intParam(request.query, "page", 1, 10_000);
      const perPage = intParam(request.query, "per_page", 20, 50);
      const whose = await ordersFor(this.deps.store, this.deps.app, desk.review);
      if (!whose) return { status: 200, body: { page, per_page: perPage, total: 0, total_pages: 1, items: [] } };
      const base = { appId: this.deps.app.id, restaurantId: desk.restaurant.id, ...whose };
      let items: FoodOrder[];
      let total: number;
      if (scope === "active") {
        // A kitchen has few at a time: the soonest ready first.
        const all = await this.deps.store.listFoodOrders({ ...base, statuses: RESTAURANT_ACTIVE, order: "oldest", offset: 0, limit: 500 });
        const sorted = all.items.sort((a, b) => (a.readyAt?.getTime() ?? 0) - (b.readyAt?.getTime() ?? 0) || a.id - b.id);
        items = sorted.slice((page - 1) * perPage, page * perPage);
        total = all.total;
      } else {
        const since = scope === "done" ? { updatedSince: new Date(request.now.getTime() - DONE_DAYS * 86_400_000) } : {};
        const list = await this.deps.store.listFoodOrders({
          ...base,
          ...since,
          statuses: scope === "new" ? RESTAURANT_NEW : RESTAURANT_DONE,
          order: scope === "new" ? "oldest" : "newest",
          offset: (page - 1) * perPage,
          limit: perPage,
        });
        items = list.items;
        total = list.total;
      }
      const json = await Promise.all(items.map((o) => this.staffJson(o)));
      return { status: 200, body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: json } };
    });
  }

  /** An order of the staff's own restaurant (never one still waiting for its payment); the reviewers' own only for them. */
  private async ownedBy(desk: Desk, id: number): Promise<FoodOrder | null> {
    const order = await this.deps.store.getFoodOrder(this.deps.app.id, id);
    if (!order || order.restaurantId !== desk.restaurant.id || order.status === "awaiting_payment") return null;
    return (await isReviewOrder(this.deps.store, this.deps.app, order)) === desk.review ? order : null;
  }

  private restaurantOrder(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const order = await this.ownedBy(desk, id);
      return order ? { status: 200, body: await this.staffJson(order) } : orderNotFound();
    });
  }

  private accept(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const minutes = (request.body as { prep_minutes?: unknown } | null)?.prep_minutes;
      if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 5 || minutes > 180) return error(400, "invalid_request", "Choose from 5 to 180 minutes.");
      const order = await this.ownedBy(desk, id);
      if (!order) return orderNotFound();
      const moved = await acceptOrder(this.flow(request.now), order, minutes, "restaurant");
      if (!moved.ok) return changed();
      return { status: 200, body: await this.staffJson(moved.order) };
    });
  }

  private reject(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
      const reason = FOOD_REJECTIONS.find((x) => x === body.reason) as FoodRejection | undefined;
      if (!reason) return error(400, "invalid_request", "Choose why you can't take it.");
      const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, 300) || null : null;
      const order = await this.ownedBy(desk, id);
      if (!order) return orderNotFound();
      const moved = await rejectOrder(this.flow(request.now), order, reason, note, "restaurant");
      if (!moved.ok) return changed();
      return { status: 200, body: await this.staffJson(moved.order) };
    });
  }

  private ready(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withRestaurant(request, async (desk) => {
      const order = await this.ownedBy(desk, id);
      if (!order) return orderNotFound();
      const moved = await readyOrder(this.flow(request.now), order, "restaurant");
      if (!moved.ok) return changed();
      return { status: 200, body: await this.staffJson(moved.order) };
    });
  }
}

/** Where the signed-in staff work; `review` for the store review account. */
interface Desk {
  restaurant: Restaurant;
  review: boolean;
}

function changed(): ConnectorResult {
  return error(409, "invalid_status", "This order changed meanwhile. Pull to refresh.");
}
