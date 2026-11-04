import { randomToken, sha256Hex } from "../../crypto/tokens";
import { paymentsSetUp } from "../../catalog/settings";
import { payUrlFor } from "../../delivery/payment";
import { courierWho } from "../../delivery/service";
import { deliverySettingsOf } from "../../delivery/settings";
import type { DataStore } from "../../data/store";
import type { App, DeliverySettings, HostedUser, MarketOrder, MarketOrderStatus, Restaurant, RestaurantMenu, RestaurantStaff, VendorRole } from "../../data/types";
import { EMPTY_MENU } from "../../food/menu";
import { distanceFrom, restaurantState } from "../../food/service";
import { platformSetting } from "../../settings/platform";
import { QUOTE_MINUTES, priceMarketCart, quoteHolds, quoteIdOf, readCart, readOrderRequest, repriceFor } from "../../market/cart";
import { complaintWindow, customerMessage, openComplaint } from "../../market/complaints";
import { pickupCode, quoteMarketDelivery, vendorDelivery } from "../../market/delivery";
import {
  CUSTOMER_CANCELLABLE,
  MARKET_ACTIVE,
  MARKET_PAY_LINE,
  VENDOR_ACTIVE,
  VENDOR_DONE,
  VENDOR_NEW,
  VENDOR_REJECTIONS,
  acceptMarketOrder,
  cancelMarketOrder,
  collectedByOf,
  deliveredByVendor,
  handOverMarketOrder,
  marketStage,
  pickMarketOrder,
  readyMarketOrder,
  rejectMarketOrder,
  syncWithJob,
  type PickedLine,
} from "../../market/flow";
import {
  clubPlanJson,
  complaintJson,
  couponJson,
  customerOrderJson,
  deskJson,
  dishJson,
  membershipJson,
  money,
  orderLineJson,
  priceLinesJson,
  productJson,
  vendorJson,
  vendorOrderJson,
  vendorSummaryJson,
  walletJson,
  type Tracking,
  type VendorNear,
} from "../../market/json";
import { cancelClub as endClub, payFromWallet, redeemCoupon } from "../../market/offers";
import { paymentChoices } from "../../market/payments";
import { marketConfigJson, marketCurrency, marketSettingsOf, marketTimezone, paymentSettingsOf } from "../../market/settings";
import { photosRequired } from "../../market/photos";
import { parseAnyPhone } from "../phone";
import { hostedSettings } from "../service";
import { error, intParam } from "./common";
import type { ConnectorRequest, ConnectorResult } from "./types";

/**
 * 115 The marketplace's routes (the contract's Market and Vendor tags), for
 * food apps grown into marketplaces: restaurants, groceries and shops in one
 * app. Customers browse, price a cart, order (cash, the wallet, or online),
 * follow it (the map with the app's courier, stages with the vendor's own
 * driver), complain from placing it until 48 hours after it arrived, see
 * their wallet and the club. A vendor's staff (people the owner or the
 * vendor added to it) take its orders. Everything a vendor's staff do is
 * checked against the vendor they work for; customers never see a vendor's
 * phone or email, vendors never see a customer's.
 */

export interface MarketDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  cardPayments?: boolean;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const vendorNotFound = () => error(404, "not_found", "This place isn't in the app any more.");
const orderNotFound = () => error(404, "not_found", "Order not found.");
const complaintNotFound = () => error(404, "not_found", "Complaint not found.");
const notVendor = () => error(403, "not_vendor", "This account doesn't work for one of the app's places.");
const refused = (message = "This order has moved on. Refresh it.") => error(409, "order_changed", message);
const RATING_DAYS = 7;

export function isMarketPath(path: string[]): boolean {
  if (path[0] === "market" || path[0] === "vendor") return true;
  return path[0] === "me" && ["market-orders", "complaints", "wallet", "club"].includes(path[1] ?? "");
}

interface Staffed {
  vendor: Restaurant;
  staff: RestaurantStaff;
  role: VendorRole;
}

export class MarketConnector {
  constructor(private readonly deps: MarketDeps) {}

  private async settings(): Promise<DeliverySettings> {
    return deliverySettingsOf(await this.deps.store.getDeliverySettings(this.deps.app.id));
  }

  private get canTakeCards(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  private flow(now: Date) {
    return { store: this.deps.store, app: this.deps.app, now };
  }

  /** `Config.marketplace`. */
  async config() {
    const [settings, maps, vendors] = await Promise.all([this.settings(), platformSetting(this.deps.store, "maps"), this.deps.store.listRestaurants(this.deps.app.id)]);
    const kinds = [...new Set(vendors.filter((v) => v.active).map((v) => v.kind ?? "restaurant"))];
    return marketConfigJson(settings, { kinds, departments: [], canTakeCards: this.canTakeCards, map: maps?.value ?? null });
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult> {
    const p = request.path;
    const m = request.method;
    const id = (i: number) => (p[i] && /^\d{1,15}$/.test(p[i]!) ? Number(p[i]) : null);
    if (p[0] === "market") {
      if (m === "GET" && p.length === 2 && p[1] === "vendors") return this.vendors(request);
      if (m === "GET" && p.length === 2 && p[1] === "search") return this.search(request);
      if (m === "GET" && p.length === 2 && p[1] === "offers") return this.offers(request);
      if (m === "GET" && p.length === 2 && p[1] === "club") return this.club();
      if (m === "POST" && p.length === 2 && p[1] === "quote") return this.quote(request);
      if (m === "POST" && p.length === 2 && p[1] === "orders") return this.order(request);
      const vid = id(2);
      if (p[1] === "vendors" && vid !== null && m === "GET") {
        if (p.length === 3) return this.vendor(request, vid);
        if (p.length === 4 && p[3] === "products") return this.products(request, vid);
      }
      return error(404, "not_found", "Not found.");
    }
    if (p[0] === "me") {
      if (p[1] === "market-orders") {
        if (m === "GET" && p.length === 2) return this.myOrders(request);
        const oid = id(2);
        if (oid !== null) {
          if (m === "GET" && p.length === 3) return this.myOrder(request, oid);
          if (m === "POST" && p.length === 4 && p[3] === "cancel") return this.cancel(request, oid);
          if (m === "POST" && p.length === 4 && p[3] === "pay") return this.pay(request, oid);
          if (m === "POST" && p.length === 4 && p[3] === "rating") return this.rate(request, oid);
          if (m === "POST" && p.length === 4 && p[3] === "complaints") return this.complain(request, oid);
        }
      }
      if (p[1] === "complaints") {
        if (m === "GET" && p.length === 2) return this.myComplaints(request);
        const cid = id(2);
        if (cid !== null) {
          if (m === "GET" && p.length === 3) return this.myComplaint(request, cid);
          if (m === "POST" && p.length === 4 && p[3] === "messages") return this.complaintMessage(request, cid);
          if (m === "POST" && p.length === 4 && p[3] === "photos") return error(409, "photos_unavailable", "Photos can be added once the app is updated.");
        }
      }
      if (p[1] === "wallet" && m === "GET" && p.length === 2) return this.wallet(request);
      if (p[1] === "club") {
        if (p.length === 2 && m === "GET") return this.myClub(request);
        if (p.length === 2 && m === "POST") return this.joinClub(request);
        if (p.length === 3 && p[2] === "cancel" && m === "POST") return this.cancelClub(request);
      }
      return error(404, "not_found", "Not found.");
    }
    // The vendor.
    if (p[1] === "me" && p.length === 2) {
      if (m === "GET") return this.withVendor(request, null, (s) => this.desk(s, request.now));
      if (m === "PATCH") return this.withVendor(request, ["owner", "manager", "orders"], (s) => this.updateDesk(s, request));
    }
    if (p[1] === "orders") {
      if (m === "GET" && p.length === 2) return this.withVendor(request, null, (s) => this.vendorOrders(s, request));
      const oid = id(2);
      if (oid !== null) {
        if (m === "GET" && p.length === 3) return this.withVendor(request, null, (s) => this.vendorOrder(s, oid, request.now));
        if (m === "POST" && p.length === 4 && p[3] === "accept") return this.withVendor(request, ["owner", "manager", "orders"], (s) => this.accept(s, oid, request));
        if (m === "POST" && p.length === 4 && p[3] === "reject") return this.withVendor(request, ["owner", "manager", "orders"], (s) => this.reject(s, oid, request));
        if (m === "PATCH" && p.length === 4 && p[3] === "lines") return this.withVendor(request, null, (s) => this.pick(s, oid, request));
        if (m === "POST" && p.length === 4 && p[3] === "ready") return this.withVendor(request, null, (s) => this.ready(s, oid, request.now));
        if (m === "POST" && p.length === 4 && p[3] === "handover") return this.withVendor(request, ["owner", "manager", "orders"], (s) => this.handover(s, oid, request));
      }
    }
    if (p[1] === "products") {
      if (m === "GET" && p.length === 2) return this.withVendor(request, null, (s) => this.vendorProducts(s, request));
      const pid = id(2);
      if (m === "PATCH" && p.length === 3 && pid !== null) return this.withVendor(request, ["owner", "manager", "orders"], (s) => this.stock(s, pid, request));
    }
    return error(404, "not_found", "Not found.");
  }

  // The customer's view of vendors

  private position(query: URLSearchParams): { lat: number; lng: number } | null {
    const lat = Number(query.get("lat"));
    const lng = Number(query.get("lng"));
    if (!query.get("lat") || !query.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  private near(v: Restaurant, settings: DeliverySettings, at: { lat: number; lng: number } | null, now: Date, offer: string | null, club: string | null): VendorNear {
    const state = restaurantState(v, marketTimezone(settings), now);
    const open = state.open && !v.paused;
    const km = distanceFrom(v, at);
    let fee: number | null = null;
    let delivers: boolean | null = null;
    let minutes: number | null = null;
    if (at) {
      const q = quoteMarketDelivery(settings, { ...v, busyUntil: null, active: true }, { fulfilment: "delivery", dropoff: { address: "", details: null, lat: at.lat, lng: at.lng }, items: Number.MAX_SAFE_INTEGER / 4, itemCount: 1 }, now);
      if (q.ok) {
        fee = q.fee;
        delivers = true;
        minutes = q.minutes;
      } else if (q.refusal === "outside_area") delivers = false;
    } else if (vendorDelivery(v).by === "vendor" && vendorDelivery(v).feeKind === "fixed") fee = vendorDelivery(v).fee;
    // The fee above was quoted for a large order; the vendor's own free-delivery threshold is shown apart.
    if (fee !== null && vendorDelivery(v).by === "vendor" && at) {
      const own = quoteMarketDelivery(settings, { ...v, busyUntil: null, active: true }, { fulfilment: "delivery", dropoff: { address: "", details: null, lat: at.lat, lng: at.lng }, items: 0, itemCount: 1 }, now);
      if (own.ok) fee = own.fee;
    }
    return { open, opensAt: state.opensAt, busy: state.busy, distanceKm: km, delivers, deliveryFee: fee, minutes, offer, clubBenefit: club };
  }

  private async offerWords(currency: string): Promise<Map<number | null, string>> {
    const out = new Map<number | null, string>();
    for (const c of await this.deps.store.listMarketCoupons(this.deps.app.id, { active: true, automatic: true })) {
      const words = c.kind === "percent" ? `${c.value}% off` : c.kind === "free_delivery" ? "Free delivery" : `${couponJson(c, currency).value} off`;
      for (const v of c.vendorIds.length ? c.vendorIds : [null]) if (!out.has(v)) out.set(v, words);
    }
    return out;
  }

  private async clubWords(): Promise<string | null> {
    const plans = (await this.deps.store.listMarketClubPlans(this.deps.app.id)).filter((p) => p.active);
    const plan = plans[0];
    if (!plan) return null;
    return plan.freeDeliveryOver !== null ? "Free delivery" : plan.deliveryDiscountPercent ? `${plan.deliveryDiscountPercent}% off delivery` : null;
  }

  private async vendors(request: ConnectorRequest): Promise<ConnectorResult> {
    const q = request.query;
    const kind = q.get("kind");
    if (kind && !["restaurant", "grocery", "shop"].includes(kind)) return error(400, "invalid_request", "Unknown kind.");
    const sort = q.get("sort") ?? "recommended";
    if (!["recommended", "distance", "rating", "delivery_time", "delivery_fee"].includes(sort)) return error(400, "invalid_request", "Unknown order.");
    const page = intParam(q, "page", 1, 10_000);
    const perPage = intParam(q, "per_page", 20, 50);
    const text = (q.get("q") ?? "").trim().slice(0, 80);
    const category = (q.get("category") ?? "").slice(0, 40);
    const at = this.position(q);
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const [all, offers, club] = await Promise.all([this.deps.store.listRestaurants(this.deps.app.id, text ? { q: text } : {}), this.offerWords(currency), this.clubWords()]);
    const rows = all
      .filter((v) => v.active && (!kind || (v.kind ?? "restaurant") === kind) && (!category || v.cuisines.includes(category)))
      .map((v) => ({ v, near: this.near(v, settings, at, request.now, offers.get(v.id) ?? offers.get(null) ?? null, club) }))
      .filter(({ v, near }) => (q.get("free_delivery") !== "true" || near.deliveryFee === 0) && (q.get("offers") !== "true" || !!near.offer) && (q.get("club") !== "true" || !!near.clubBenefit) && (q.get("pickup") !== "true" || vendorDelivery(v).pickup));
    const last = Number.MAX_SAFE_INTEGER;
    const key = ({ v, near }: (typeof rows)[number]): number =>
      sort === "distance" ? (near.distanceKm ?? last) : sort === "rating" ? -(v.ratingCount ? v.ratingSum / v.ratingCount : 0) : sort === "delivery_time" ? (near.minutes ?? v.prepMinutes) : sort === "delivery_fee" ? (near.deliveryFee ?? last) : v.position;
    rows.sort((a, b) => Number(b.near.delivers !== false) - Number(a.near.delivers !== false) || Number(b.near.open) - Number(a.near.open) || key(a) - key(b) || a.v.id - b.v.id);
    const items = rows.slice((page - 1) * perPage, page * perPage).map(({ v, near }) => vendorSummaryJson(v, near, currency, this.deps.assetUrl));
    return { status: 200, body: { page, per_page: perPage, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / perPage)), items } };
  }

  private async vendor(request: ConnectorRequest, vendorId: number): Promise<ConnectorResult> {
    const v = await this.deps.store.getRestaurant(this.deps.app.id, vendorId);
    if (!v || !v.active) return vendorNotFound();
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const [menu, departments, aisles, offers, club, coupons] = await Promise.all([
      (v.kind ?? "restaurant") === "restaurant" ? this.deps.store.getRestaurantMenu(this.deps.app.id, v.id) : Promise.resolve(null),
      this.deps.store.listMarketDepartments(this.deps.app.id, v.id),
      this.deps.store.listMarketAisles(this.deps.app.id, v.id),
      this.offerWords(currency),
      this.clubWords(),
      this.deps.store.listMarketCoupons(this.deps.app.id, { active: true }),
    ]);
    const near = this.near(v, settings, this.position(request.query), request.now, offers.get(v.id) ?? offers.get(null) ?? null, club);
    const needPhoto = photosRequired(marketSettingsOf(settings));
    const visible = coupons.filter((c) => (!c.vendorIds.length || c.vendorIds.includes(v.id)) && (!c.vendorKinds.length || c.vendorKinds.includes(v.kind ?? "restaurant")) && (!c.endsAt || c.endsAt > request.now));
    const body = vendorJson(
      v,
      near,
      {
        currency,
        menu: needPhoto ? withPhotosOnly(menu ?? EMPTY_MENU) : (menu ?? EMPTY_MENU),
        departments: departments.sort((a, b) => a.position - b.position).map((d) => ({ id: d.id, name: d.name, imageAssetId: d.imageAssetId, aisles: aisles.filter((a) => a.departmentId === d.id).sort((a, b) => a.position - b.position).map((a) => ({ id: a.id, name: a.name })) })),
        offers: visible,
        pickupOrder: false,
      },
      this.deps.assetUrl,
    );
    return { status: 200, body };
  }

  private async products(request: ConnectorRequest, vendorId: number): Promise<ConnectorResult> {
    const v = await this.deps.store.getRestaurant(this.deps.app.id, vendorId);
    if (!v || !v.active) return vendorNotFound();
    const q = request.query;
    const page = intParam(q, "page", 1, 100_000);
    const perPage = intParam(q, "per_page", 20, 50);
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const needPhoto = photosRequired(marketSettingsOf(settings));
    if ((v.kind ?? "restaurant") === "restaurant") {
      const menu = (await this.deps.store.getRestaurantMenu(this.deps.app.id, v.id)) ?? EMPTY_MENU;
      const text = (q.get("q") ?? "").trim().toLowerCase();
      const dishes = menu.sections.flatMap((s) => s.dishes).filter((d) => (!text || d.name.toLowerCase().includes(text)) && (!needPhoto || d.imageAssetId));
      const items = dishes.slice((page - 1) * perPage, page * perPage).map((d) => dishJson(d, currency, this.deps.assetUrl));
      return { status: 200, body: { page, per_page: perPage, total: dishes.length, total_pages: Math.max(1, Math.ceil(dishes.length / perPage)), items } };
    }
    const department = Number(q.get("department"));
    const aisle = Number(q.get("aisle"));
    const found = await this.deps.store.listMarketProducts({
      appId: this.deps.app.id,
      vendorId: v.id,
      ...(Number.isInteger(department) && department > 0 ? { departmentId: department } : {}),
      ...(Number.isInteger(aisle) && aisle > 0 ? { aisleId: aisle } : {}),
      ...(q.get("q") ? { q: q.get("q")!.trim().slice(0, 80) } : {}),
      ...(q.get("barcode") ? { code: q.get("barcode")!.trim().slice(0, 64) } : {}),
      ...(needPhoto ? { withPhoto: true } : {}),
      page,
      perPage,
    });
    return { status: 200, body: { page, per_page: perPage, total: found.total, total_pages: Math.max(1, Math.ceil(found.total / perPage)), items: found.items.map((p) => productJson(p, currency, this.deps.assetUrl)) } };
  }

  private async search(request: ConnectorRequest): Promise<ConnectorResult> {
    const text = (request.query.get("q") ?? "").trim().slice(0, 80);
    if (text.length < 2) return error(400, "invalid_request", "Type at least 2 letters.");
    const kind = request.query.get("kind");
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const at = this.position(request.query);
    const [all, offers, club] = await Promise.all([this.deps.store.listRestaurants(this.deps.app.id), this.offerWords(currency), this.clubWords()]);
    const active = all.filter((v) => v.active && (!kind || (v.kind ?? "restaurant") === kind));
    const lower = text.toLowerCase();
    const needPhoto = photosRequired(marketSettingsOf(settings));
    const summary = (v: Restaurant) => vendorSummaryJson(v, this.near(v, settings, at, request.now, offers.get(v.id) ?? offers.get(null) ?? null, club), currency, this.deps.assetUrl);
    const vendors = active.filter((v) => v.name.toLowerCase().includes(lower)).slice(0, 20).map(summary);
    const items: { vendor: ReturnType<typeof summary>; product: unknown }[] = [];
    for (const v of active) {
      if (items.length >= 30) break;
      if ((v.kind ?? "restaurant") === "restaurant") {
        const menu = (await this.deps.store.getRestaurantMenu(this.deps.app.id, v.id)) ?? EMPTY_MENU;
        for (const d of menu.sections.flatMap((s) => s.dishes).filter((d) => d.name.toLowerCase().includes(lower) && (!needPhoto || d.imageAssetId)).slice(0, 3)) items.push({ vendor: summary(v), product: dishJson(d, currency, this.deps.assetUrl) });
      } else {
        const found = await this.deps.store.listMarketProducts({ appId: this.deps.app.id, vendorId: v.id, q: text, ...(needPhoto ? { withPhoto: true } : {}), page: 1, perPage: 3 });
        for (const p of found.items) items.push({ vendor: summary(v), product: productJson(p, currency, this.deps.assetUrl) });
      }
    }
    return { status: 200, body: { vendors, items: items.slice(0, 30) } };
  }

  private async offers(request: ConnectorRequest): Promise<ConnectorResult> {
    const currency = marketCurrency(await this.settings());
    const vendorId = Number(request.query.get("vendor_id"));
    const list = (await this.deps.store.listMarketCoupons(this.deps.app.id, { active: true })).filter(
      (c) => (!c.endsAt || c.endsAt > request.now) && (!c.startsAt || c.startsAt <= request.now) && (!Number.isInteger(vendorId) || vendorId <= 0 || !c.vendorIds.length || c.vendorIds.includes(vendorId)),
    );
    return { status: 200, body: { items: list.map((c) => couponJson(c, currency)) } };
  }

  // The cart and the order

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const read = readCart(request.body, currency);
    if (!read.ok) return { status: 400, body: { code: "invalid_request", message: read.error, details: { field: read.field } } };
    const priced = await priceMarketCart(this.deps.store, { appId: this.deps.app.id, delivery: settings, cart: read.value, userId: request.user?.id ?? null, now: request.now });
    if (!priced.ok) return { status: priced.refusal.status, body: { code: priced.refusal.code, message: priced.refusal.error, details: { field: priced.refusal.field } } };
    const pr = priced.priced;
    const expiresAt = new Date(request.now.getTime() + QUOTE_MINUTES * 60_000);
    return {
      status: 200,
      body: {
        quote_id: quoteIdOf(this.deps.app.id, read.value, pr.money.total, expiresAt),
        expires_at: expiresAt.toISOString(),
        lines: pr.lines.map((l) => orderLineJson(l, currency)),
        price: priceLinesJson(pr.money, currency, pr.settings.tax.label),
        total: money(pr.money.total, currency),
        pay_now: money(pr.money.payNow, currency),
        coupon: pr.coupon && pr.coupon.code ? { code: pr.coupon.code, title: pr.coupon.title } : pr.coupon ? { code: "", title: pr.coupon.title } : null,
        delivery_minutes: pr.delivery.minutes === null ? null : { min: Math.max(5, pr.delivery.minutes - 5), max: pr.delivery.minutes + 10 },
        warnings: pr.warnings,
      },
    };
  }

  private async order(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const { store, app } = this.deps;
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const read = readOrderRequest(request.body, currency);
    if (!read.ok) return { status: 400, body: { code: "invalid_request", message: read.error, details: { field: read.field } } };
    const input = read.value;
    const priced = await priceMarketCart(store, { appId: app.id, delivery: settings, cart: input, userId: request.user.id, now: request.now });
    if (!priced.ok) return { status: priced.refusal.status, body: { code: priced.refusal.code, message: priced.refusal.error, details: { field: priced.refusal.field } } };
    const pr = priced.priced;
    const held = quoteHolds(input.quoteId, app.id, input, pr.money.total, request.now);
    if (held !== "ok") return error(409, "price_changed", held === "expired" ? "The price was checked a while ago. Check it again." : "The price changed. Check it before ordering.");
    // How it's paid, and so who holds the money.
    const choices = paymentChoices(paymentSettingsOf(pr.settings, settings), { currency, total: pr.money.total, platform, walletBalance: pr.walletBalance });
    const choice = choices.find((c) => c.method === input.payment);
    if (!choice) return error(400, "invalid_request", "This way to pay isn't offered here.");
    if (choice.unavailable) return error(409, "payment_unavailable", choice.unavailable);
    if (input.payment === "wallet" && pr.walletBalance < pr.money.total) return error(409, "payment_unavailable", "Your wallet doesn't cover this order.");
    const online = input.payment !== "cash" && input.payment !== "wallet";
    if (online && !this.canTakeCards) return error(503, "payments_unavailable", "Online payments aren't available right now. Please try again later.");
    const fulfilment = input.fulfilment;
    const deliveryBy = fulfilment === "pickup" ? null : pr.delivery.by;
    const collectedBy = collectedByOf({ paymentMethod: input.payment, fulfilment, deliveryBy });
    const money = repriceFor(pr, { ...input, useWallet: input.useWallet || input.payment === "wallet" }, collectedBy);
    const phone = parseAnyPhone(request.user.phone ?? "", hostedSettings(app).defaultCountryCode)?.e164 ?? request.user.phone ?? "";
    const status: MarketOrderStatus = online && money.payNow > 0 ? "awaiting_payment" : input.scheduledFor ? "scheduled" : "placed";
    const created = await store.createMarketOrder({
      appId: app.id,
      vendorId: pr.vendor.id,
      vendorName: pr.vendor.name,
      vendorKind: pr.vendor.kind ?? "restaurant",
      userId: request.user.id,
      customerName: request.user.name || "Customer",
      customerPhone: phone,
      fulfilment,
      deliveryBy,
      scheduledFor: input.scheduledFor,
      lines: pr.lines,
      money,
      currency,
      paymentMethod: input.payment,
      paymentStatus: money.payNow === 0 ? "paid" : "unpaid",
      paymentRef: null,
      couponCode: pr.coupon?.code ?? null,
      status,
      dropoff: fulfilment === "delivery" ? input.dropoff : null,
      distanceKm: pr.delivery.distanceKm,
      notes: input.notes,
      pickupCode: fulfilment === "pickup" ? pickupCode() : null,
      prepMinutes: null,
      readyAt: null,
      rejection: null,
      shipmentId: null,
      rating: null,
      timeline: [marketStage(status, request.now, "customer")],
      completedAt: null,
      lang: request.lang ?? null,
      createdAt: request.now,
      updatedAt: request.now,
    });
    // The coupon's use and the wallet's part are taken now; a refused or cancelled order gives them back.
    if (pr.coupon) {
      const used = await redeemCoupon(store, pr.coupon.record, { id: created.id, userId: request.user.id }, money.coupon?.amount ?? 0, request.now);
      if (!used.ok) {
        await store.updateMarketOrder(app.id, created.id, { status: "cancelled", timeline: [...created.timeline, marketStage("cancelled", request.now, "system")], updatedAt: request.now });
        return error(409, "coupon_used_up", used.error);
      }
    }
    if (money.wallet > 0) {
      const taken = await payFromWallet(store, { appId: app.id, userId: request.user.id, orderId: created.id, amount: money.wallet }, request.now);
      if (taken < money.wallet) {
        await cancelMarketOrder(this.flow(request.now), created, "owner");
        return error(409, "price_changed", "Your wallet changed. Check the price again.");
      }
    }
    const payUrl = status === "awaiting_payment" ? (await this.payLink(created, request.now)).url : null;
    return { status: 201, body: { order: await this.customerJson(created, request.now), pay_url: payUrl } };
  }

  /** A shop order of one line for the market order (its product id is the order's id, negative), on the app's payment page. */
  private async payLink(order: MarketOrder, now: Date): Promise<{ url: string }> {
    const token = randomToken(24);
    await this.deps.store.createCatalogOrder({
      lang: order.lang,
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: order.userId,
      status: "pending",
      lines: [{ productId: MARKET_PAY_LINE(order.id), name: `${order.vendorName}: M-${1000 + order.id}`.slice(0, 200), quantity: 1, unitCents: order.money.payNow, imageAssetId: null, digital: true }],
      subtotalCents: order.money.payNow,
      shippingCents: 0,
      totalCents: order.money.payNow,
      currency: order.currency as "EGP",
      customer: null,
      paymentId: null,
      createdAt: now,
      paidAt: null,
      updatedAt: now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    return { url: payUrlFor(this.deps.platformUrl, token) };
  }

  private async ownOrder(request: ConnectorRequest, id: number): Promise<MarketOrder | null> {
    const o = await this.deps.store.getMarketOrder(this.deps.app.id, id);
    return o && request.user && o.userId === request.user.id ? o : null;
  }

  /** The order as its customer sees it: its vendor, tracking while it's on the way, and what they can do now. */
  private async customerJson(order: MarketOrder, now: Date) {
    const settings = await this.settings();
    const currency = marketCurrency(settings);
    const job = order.shipmentId !== null ? await this.deps.store.getShipment(this.deps.app.id, order.shipmentId) : null;
    const o = await syncWithJob(this.deps.store, order, job, now);
    const vendor = o.vendorId !== null ? await this.deps.store.getRestaurant(this.deps.app.id, o.vendorId) : null;
    const summary = vendor
      ? vendorSummaryJson(vendor, this.near(vendor, settings, null, now, null, null), currency, this.deps.assetUrl)
      : vendorSummaryJson({ id: 0, appId: this.deps.app.id, name: o.vendorName, description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "", details: null, lat: null, lng: null }, phone: null, hours: [], prepMinutes: 0, minOrderCents: 0, maxKm: null, commissionBp: 0, active: false, busyUntil: null, ratingSum: 0, ratingCount: 0, position: 0, kind: o.vendorKind, createdAt: o.createdAt, updatedAt: o.updatedAt }, { open: false, opensAt: null, busy: false, distanceKm: null, delivers: null, deliveryFee: null, minutes: null, offer: null, clubBenefit: null }, currency, this.deps.assetUrl);
    let tracking: Tracking | null = null;
    if (o.status === "on_the_way" || (o.deliveryBy === "app" && job && ["assigned", "picked_up", "on_the_way"].includes(job.status))) {
      const courier = job?.courierId ? await this.deps.store.getCourier(this.deps.app.id, job.courierId) : null;
      const located = courier && courier.lat !== null && courier.lng !== null;
      tracking = {
        mode: located ? "map" : "stages",
        courier: courier ? { name: courier.name.split(/\s+/)[0] ?? courier.name, photoUrl: null, vehicle: courier.vehicle } : null,
        position: located ? { lat: courier!.lat!, lng: courier!.lng! } : null,
        updatedAt: located ? courier!.locatedAt : null,
      };
    }
    const complaints = await this.deps.store.listMarketComplaints({ appId: this.deps.app.id, orderId: o.id, limit: 1, offset: 0 });
    const latest = complaints.items[0] ?? null;
    const window = complaintWindow(o, now);
    const openOne = latest && ["open", "in_review", "waiting_for_customer"].includes(latest.status);
    const eta = o.readyAt ? new Date(o.readyAt.getTime() + (o.fulfilment === "delivery" && o.distanceKm !== null ? Math.round(o.distanceKm * 3) : 0) * 60_000) : null;
    return customerOrderJson(o, {
      vendor: summary,
      taxLabel: marketSettingsOf(settings).tax.label,
      tracking,
      canCancel: CUSTOMER_CANCELLABLE.includes(o.status),
      canComplain: window.open && !openOne && !["awaiting_payment", "cancelled"].includes(o.status),
      complaintId: latest?.id ?? null,
      eta,
    });
  }

  private async myOrders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const active = request.query.get("active");
    const found = await this.deps.store.listMarketOrders({
      appId: this.deps.app.id,
      userId: request.user.id,
      ...(active === "true" ? { statuses: MARKET_ACTIVE } : active === "false" ? { statuses: ["delivered", "picked_up", "rejected", "cancelled"] as MarketOrderStatus[] } : {}),
      order: "newest",
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    const items = [];
    for (const o of found.items) items.push(await this.customerJson(o, request.now));
    return { status: 200, body: { page, per_page: perPage, total: found.total, total_pages: Math.max(1, Math.ceil(found.total / perPage)), items } };
  }

  private async myOrder(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const o = await this.ownOrder(request, id);
    return o ? { status: 200, body: await this.customerJson(o, request.now) } : orderNotFound();
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const o = await this.ownOrder(request, id);
    if (!o) return orderNotFound();
    if (!CUSTOMER_CANCELLABLE.includes(o.status)) return refused("The place has your order now. Ask the app's support to cancel it.");
    const moved = await cancelMarketOrder(this.flow(request.now), o, "customer");
    return moved.ok ? { status: 200, body: await this.customerJson(moved.order, request.now) } : refused();
  }

  private async pay(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const o = await this.ownOrder(request, id);
    if (!o) return orderNotFound();
    if (o.status !== "awaiting_payment" || o.paymentStatus !== "unpaid") return error(409, "not_payable", "This order has nothing to pay.");
    if (!this.canTakeCards) return error(503, "payments_unavailable", "Online payments aren't available right now. Please try again later.");
    return { status: 200, body: { pay_url: (await this.payLink(o, request.now)).url } };
  }

  private async rate(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const o = await this.ownOrder(request, id);
    if (!o) return orderNotFound();
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const stars = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
    const vendor = stars(body.vendor);
    if (vendor === null) return error(400, "invalid_request", "Choose a rating from 1 to 5.");
    const courier = body.courier === null || body.courier === undefined ? null : stars(body.courier);
    if (body.courier !== null && body.courier !== undefined && courier === null) return error(400, "invalid_request", "Choose a rating from 1 to 5.");
    if (o.status !== "delivered" && o.status !== "picked_up") return error(409, "not_rateable", "You can rate an order once it has arrived.");
    if (o.rating) return error(409, "not_rateable", "You already rated this order.");
    if (o.completedAt && request.now.getTime() - o.completedAt.getTime() > RATING_DAYS * 86_400_000) return error(409, "not_rateable", "Orders can be rated within 7 days.");
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) || null : null;
    const rating = { vendor, courier: o.deliveryBy === "app" ? courier : null, comment, at: request.now.toISOString() };
    if (!(await this.deps.store.updateMarketOrder(this.deps.app.id, o.id, { rating, updatedAt: request.now }, { statuses: [o.status] }))) return error(409, "not_rateable", "Refresh the order and try again.");
    if (o.vendorId !== null) await this.deps.store.addRestaurantRating(this.deps.app.id, o.vendorId, vendor);
    return { status: 200, body: await this.customerJson({ ...o, rating, updatedAt: request.now }, request.now) };
  }

  // Complaints

  private async complain(request: ConnectorRequest, orderId: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const o = await this.ownOrder(request, orderId);
    if (!o) return orderNotFound();
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const lineIds = Array.isArray(b.line_ids) ? b.line_ids.filter((x): x is number => typeof x === "number" && Number.isInteger(x)) : [];
    const made = await openComplaint(this.deps.store, o, request.user.id, { reason: typeof b.reason === "string" ? b.reason : "", text: typeof b.text === "string" ? b.text : "", lineIds, photoAssetIds: [] }, request.now);
    if (!made.ok) {
      const status = made.code === "invalid" ? 400 : 409;
      return { status, body: { code: made.code === "invalid" ? "invalid_request" : made.code, message: made.error, details: { field: made.field } } };
    }
    return { status: 201, body: complaintJson(made.complaint, o.currency, this.deps.assetUrl) };
  }

  private async myComplaints(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const found = await this.deps.store.listMarketComplaints({ appId: this.deps.app.id, userId: request.user.id, limit: perPage, offset: (page - 1) * perPage });
    const currency = marketCurrency(await this.settings());
    return { status: 200, body: { page, per_page: perPage, total: found.total, total_pages: Math.max(1, Math.ceil(found.total / perPage)), items: found.items.map((c) => complaintJson(c, currency, this.deps.assetUrl)) } };
  }

  private async ownComplaint(request: ConnectorRequest, id: number) {
    const c = await this.deps.store.getMarketComplaint(this.deps.app.id, id);
    return c && request.user && c.userId === request.user.id ? c : null;
  }

  private async myComplaint(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const c = await this.ownComplaint(request, id);
    return c ? { status: 200, body: complaintJson(c, marketCurrency(await this.settings()), this.deps.assetUrl) } : complaintNotFound();
  }

  private async complaintMessage(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const c = await this.ownComplaint(request, id);
    if (!c) return complaintNotFound();
    const text = typeof (request.body as { text?: unknown } | null)?.text === "string" ? ((request.body as { text: string }).text).trim() : "";
    if (!text) return error(400, "invalid_request", "Write your message.");
    if (text.length > 2000) return error(400, "invalid_request", "Keep it under 2000 characters.");
    const patch = customerMessage(c, text, request.now);
    if (!patch) return error(409, "complaint_closed", "This complaint is closed. Open a new one from the order if you need to.");
    await this.deps.store.updateMarketComplaint(this.deps.app.id, c.id, patch);
    return { status: 201, body: complaintJson({ ...c, ...patch }, marketCurrency(await this.settings()), this.deps.assetUrl) };
  }

  // The wallet and the club

  private async wallet(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const [balance, entries, settings] = await Promise.all([
      this.deps.store.walletBalance(this.deps.app.id, request.user.id),
      this.deps.store.listWalletEntries(this.deps.app.id, request.user.id, { limit: perPage, offset: (page - 1) * perPage }),
      this.settings(),
    ]);
    return { status: 200, body: walletJson(balance, entries.items, marketCurrency(settings), page, Math.max(1, Math.ceil(entries.total / perPage))) };
  }

  private async club(): Promise<ConnectorResult> {
    const settings = await this.settings();
    if (!marketSettingsOf(settings).club) return error(404, "not_found", "This app has no club.");
    const plans = (await this.deps.store.listMarketClubPlans(this.deps.app.id)).filter((p) => p.active).sort((a, b) => a.position - b.position);
    if (!plans.length) return error(404, "not_found", "This app has no club yet.");
    return { status: 200, body: { name: "Club", description: plans[0]!.description, plans: plans.map(clubPlanJson) } };
  }

  private async myClub(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const member = await this.deps.store.getMarketClubMember(this.deps.app.id, request.user.id);
    const plan = member?.planId ? await this.deps.store.getMarketClubPlan(this.deps.app.id, member.planId) : null;
    return { status: 200, body: { membership: membershipJson(member, plan, marketCurrency(await this.settings())) } };
  }

  private async joinClub(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const planId = (request.body as { plan_id?: unknown } | null)?.plan_id;
    if (typeof planId !== "number" || !Number.isInteger(planId)) return error(400, "invalid_request", "Choose a plan.");
    const plan = await this.deps.store.getMarketClubPlan(this.deps.app.id, planId);
    if (!plan || !plan.active) return error(404, "not_found", "This plan isn't offered any more.");
    // Paying the club goes through the app's gateway (115.11's wallet-pay); until it's set up, joining waits.
    return error(503, "payments_unavailable", "Joining the club opens once the app's payments are set up.");
  }

  private async cancelClub(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const member = await this.deps.store.getMarketClubMember(this.deps.app.id, request.user.id);
    if (!member || member.status !== "active") return error(404, "not_found", "You aren't a member.");
    const ended = await endClub(this.deps.store, member, request.now);
    const plan = ended.planId ? await this.deps.store.getMarketClubPlan(this.deps.app.id, ended.planId) : null;
    return { status: 200, body: { membership: membershipJson(ended, plan, marketCurrency(await this.settings())) } };
  }

  // The vendor

  /** The vendor the signed-in person works for, with their role; paused staff and inactive vendors aren't. */
  private async vendorOf(user: HostedUser): Promise<Staffed | null> {
    const staff = await this.deps.store.findRestaurantStaff(this.deps.app.id, courierWho(user));
    if (!staff?.active) return null;
    const vendor = await this.deps.store.getRestaurant(this.deps.app.id, staff.restaurantId);
    return vendor?.active ? { vendor, staff, role: staff.role ?? "manager" } : null;
  }

  /** 115.7 The vendors' web panel: the same vendor routes, for a staff member signed in to the panel. */
  async handleAsStaff(request: ConnectorRequest, staff: RestaurantStaff): Promise<ConnectorResult> {
    this.panelStaff = staff;
    try {
      return await this.handle({ ...request, path: ["vendor", ...request.path] });
    } finally {
      this.panelStaff = null;
    }
  }

  private panelStaff: RestaurantStaff | null = null;

  private async withVendor(request: ConnectorRequest, roles: VendorRole[] | null, then: (s: Staffed) => Promise<ConnectorResult>): Promise<ConnectorResult> {
    let staffed: Staffed | null = null;
    if (this.panelStaff) {
      const vendor = this.panelStaff.active ? await this.deps.store.getRestaurant(this.deps.app.id, this.panelStaff.restaurantId) : null;
      staffed = vendor?.active && vendor.appId === this.deps.app.id ? { vendor, staff: this.panelStaff, role: this.panelStaff.role ?? "manager" } : null;
    } else {
      if (!request.user) return signIn();
      staffed = await this.vendorOf(request.user);
    }
    if (!staffed) return notVendor();
    if (roles && !roles.includes(staffed.role)) return error(403, "not_allowed", "Your role at this place can't do this.");
    return then(staffed);
  }

  /** One of this vendor's orders, never another's. */
  private async vendorsOrder(s: Staffed, id: number): Promise<MarketOrder | null> {
    const o = await this.deps.store.getMarketOrder(this.deps.app.id, id);
    return o && o.vendorId === s.vendor.id && o.status !== "awaiting_payment" ? o : null;
  }

  private async vendorJsonOf(o: MarketOrder, now: Date) {
    const job = o.shipmentId !== null ? await this.deps.store.getShipment(this.deps.app.id, o.shipmentId) : null;
    const synced = await syncWithJob(this.deps.store, o, job, now);
    const collect = synced.paymentMethod === "cash" && synced.paymentStatus === "unpaid" && collectedByOf(synced) === "vendor" ? synced.money.payNow : null;
    return vendorOrderJson(synced, { courierName: job?.courierName ?? null, collect });
  }

  private async desk(s: Staffed, now: Date): Promise<ConnectorResult> {
    const settings = await this.settings();
    const timezone = marketTimezone(settings);
    const state = restaurantState(s.vendor, timezone, now);
    const startOfDay = new Date(now.getTime() - 24 * 3_600_000);
    const today = await this.deps.store.listMarketOrders({ appId: this.deps.app.id, vendorId: s.vendor.id, createdSince: startOfDay, limit: 1000, offset: 0 });
    const counted = today.items.filter((o) => !["awaiting_payment", "rejected", "cancelled"].includes(o.status));
    const fresh = today.items.filter((o) => o.status === "placed").length;
    const body = deskJson(
      s.vendor,
      { role: s.role, inHours: state.inHours, busy: state.busy, accepting: state.open && !s.vendor.paused, orders: counted.length, sales: counted.reduce((sum, o) => sum + o.money.items, 0), newOrders: fresh, currency: marketCurrency(settings) },
      this.deps.assetUrl,
    );
    return { status: 200, body };
  }

  private async updateDesk(s: Staffed, request: ConnectorRequest): Promise<ConnectorResult> {
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const patch: { busyUntil?: Date | null; paused?: boolean } = {};
    if ("busy_minutes" in b) {
      if (b.busy_minutes === null) patch.busyUntil = null;
      else if (typeof b.busy_minutes === "number" && Number.isInteger(b.busy_minutes) && b.busy_minutes >= 5 && b.busy_minutes <= 240) patch.busyUntil = new Date(request.now.getTime() + b.busy_minutes * 60_000);
      else return error(400, "invalid_request", "Choose 5 to 240 minutes.");
    }
    if ("paused" in b) {
      if (typeof b.paused !== "boolean") return error(400, "invalid_request", "Say whether you're taking orders.");
      patch.paused = b.paused;
    }
    await this.deps.store.updateRestaurant(this.deps.app.id, s.vendor.id, patch, request.now);
    return this.desk({ ...s, vendor: { ...s.vendor, ...patch } }, request.now);
  }

  private async vendorOrders(s: Staffed, request: ConnectorRequest): Promise<ConnectorResult> {
    const which = request.query.get("status") ?? "new";
    const statuses: Record<string, MarketOrderStatus[]> = { new: VENDOR_NEW, active: VENDOR_ACTIVE, scheduled: ["scheduled"], done: VENDOR_DONE };
    if (!statuses[which]) return error(400, "invalid_request", "Unknown list.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const found = await this.deps.store.listMarketOrders({
      appId: this.deps.app.id,
      vendorId: s.vendor.id,
      statuses: statuses[which],
      ...(which === "done" ? { createdSince: new Date(request.now.getTime() - 2 * 86_400_000) } : {}),
      order: which === "done" ? "newest" : "oldest",
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    const items = [];
    for (const o of found.items) items.push(await this.vendorJsonOf(o, request.now));
    return { status: 200, body: { page, per_page: perPage, total: found.total, total_pages: Math.max(1, Math.ceil(found.total / perPage)), items } };
  }

  private async vendorOrder(s: Staffed, id: number, now: Date): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    return o ? { status: 200, body: await this.vendorJsonOf(o, now) } : orderNotFound();
  }

  private async accept(s: Staffed, id: number, request: ConnectorRequest): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    if (!o) return orderNotFound();
    const minutes = (request.body as { prep_minutes?: unknown } | null)?.prep_minutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 5 || minutes > 180) return error(400, "invalid_request", "Choose how long it takes: 5 to 180 minutes.");
    const moved = await acceptMarketOrder(this.flow(request.now), o, minutes);
    return moved.ok ? { status: 200, body: await this.vendorJsonOf(moved.order, request.now) } : refused();
  }

  private async reject(s: Staffed, id: number, request: ConnectorRequest): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    if (!o) return orderNotFound();
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    if (!(VENDOR_REJECTIONS as readonly unknown[]).includes(b.reason)) return error(400, "invalid_request", "Choose why.");
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 300) || null : null;
    const moved = await rejectMarketOrder(this.flow(request.now), o, b.reason as (typeof VENDOR_REJECTIONS)[number], note);
    return moved.ok ? { status: 200, body: await this.vendorJsonOf(moved.order, request.now) } : refused();
  }

  private async pick(s: Staffed, id: number, request: ConnectorRequest): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    if (!o) return orderNotFound();
    if (o.vendorKind === "restaurant") return error(409, "not_picked", "Restaurants' orders aren't picked.");
    const raw = (request.body as { lines?: unknown } | null)?.lines;
    if (!Array.isArray(raw) || !raw.length) return error(400, "invalid_request", "Send the picked lines.");
    const picked: PickedLine[] = [];
    for (const r of raw) {
      const l = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      if (typeof l.line_id !== "number" || !["picked", "substituted", "missing"].includes(l.outcome as string)) return error(400, "invalid_request", "One of the lines isn't valid.");
      const quantity = typeof l.quantity === "number" && l.quantity > 0 ? l.quantity : null;
      const sub = typeof l.substitute_product_id === "number" ? l.substitute_product_id : null;
      picked.push({ lineId: l.line_id, outcome: l.outcome as PickedLine["outcome"], pickedQuantity: quantity, substitute: sub !== null ? { productId: sub, quantity: quantity ?? 1 } : null });
    }
    const settings = marketSettingsOf(await this.settings());
    const rate = s.vendor.taxRateBp !== null && s.vendor.taxRateBp !== undefined ? s.vendor.taxRateBp / 100 : settings.tax.ratePercent;
    const tax = rate > 0 ? { ratePercent: rate, included: settings.tax.included, onDelivery: settings.tax.onDelivery, label: settings.tax.label } : null;
    const moved = await pickMarketOrder(this.deps.store, o, picked, settings.weightTolerancePercent, tax, request.now);
    if (!moved.ok) return moved.reason === "invalid" ? error(400, "invalid_request", moved.error ?? "One of the lines isn't valid.") : refused();
    return { status: 200, body: await this.vendorJsonOf(moved.order, request.now) };
  }

  private async ready(s: Staffed, id: number, now: Date): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    if (!o) return orderNotFound();
    if (o.vendorKind !== "restaurant" && o.lines.some((l) => l.outcome === null)) return error(409, "not_picked", "Pick every line first.");
    const moved = await readyMarketOrder(this.flow(now), o);
    return moved.ok ? { status: 200, body: await this.vendorJsonOf(moved.order, now) } : refused();
  }

  private async handover(s: Staffed, id: number, request: ConnectorRequest): Promise<ConnectorResult> {
    const o = await this.vendorsOrder(s, id);
    if (!o) return orderNotFound();
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const to = b.to;
    let moved;
    if (to === "customer") moved = await handOverMarketOrder(this.flow(request.now), o, typeof b.pickup_code === "string" ? b.pickup_code : null);
    else if (to === "driver") moved = await handOverMarketOrder(this.flow(request.now), o, null);
    else if (to === "delivered") moved = await deliveredByVendor(this.flow(request.now), o);
    else return error(400, "invalid_request", "Say who took the order.");
    if (!moved.ok) return moved.reason === "invalid" ? error(400, "invalid_request", moved.error ?? "That can't be done for this order.") : refused();
    return { status: 200, body: await this.vendorJsonOf(moved.order, request.now) };
  }

  private async vendorProducts(s: Staffed, request: ConnectorRequest): Promise<ConnectorResult> {
    const q = request.query;
    const page = intParam(q, "page", 1, 100_000);
    const perPage = intParam(q, "per_page", 20, 50);
    const currency = marketCurrency(await this.settings());
    if ((s.vendor.kind ?? "restaurant") === "restaurant") {
      const menu = (await this.deps.store.getRestaurantMenu(this.deps.app.id, s.vendor.id)) ?? EMPTY_MENU;
      const text = (q.get("q") ?? "").trim().toLowerCase();
      const dishes = menu.sections.flatMap((x) => x.dishes).filter((d) => (!text || d.name.toLowerCase().includes(text)) && (q.get("out_of_stock") !== "true" || !d.available));
      return { status: 200, body: { page, per_page: perPage, total: dishes.length, total_pages: Math.max(1, Math.ceil(dishes.length / perPage)), items: dishes.slice((page - 1) * perPage, page * perPage).map((d) => dishJson(d, currency, this.deps.assetUrl)) } };
    }
    const found = await this.deps.store.listMarketProducts({
      appId: this.deps.app.id,
      vendorId: s.vendor.id,
      ...(q.get("q") ? { q: q.get("q")!.trim().slice(0, 80) } : {}),
      ...(q.get("barcode") ? { code: q.get("barcode")!.trim().slice(0, 64) } : {}),
      ...(q.get("out_of_stock") === "true" ? { outOfStock: true } : {}),
      page,
      perPage,
    });
    return { status: 200, body: { page, per_page: perPage, total: found.total, total_pages: Math.max(1, Math.ceil(found.total / perPage)), items: found.items.map((p) => productJson(p, currency, this.deps.assetUrl)) } };
  }

  private async stock(s: Staffed, productId: number, request: ConnectorRequest): Promise<ConnectorResult> {
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    if (b.in_stock !== undefined && typeof b.in_stock !== "boolean") return error(400, "invalid_request", "Say whether it's in stock.");
    if (b.stock !== undefined && b.stock !== null && !(typeof b.stock === "number" && Number.isInteger(b.stock) && b.stock >= 0)) return error(400, "invalid_request", "Enter the stock as a whole number.");
    const currency = marketCurrency(await this.settings());
    if ((s.vendor.kind ?? "restaurant") === "restaurant") {
      const menu = (await this.deps.store.getRestaurantMenu(this.deps.app.id, s.vendor.id)) ?? EMPTY_MENU;
      const dish = menu.sections.flatMap((x) => x.dishes).find((d) => d.id === productId);
      if (!dish) return error(404, "not_found", "Item not found.");
      if (typeof b.in_stock === "boolean") dish.available = b.in_stock;
      await this.deps.store.saveRestaurantMenu(this.deps.app.id, s.vendor.id, menu, request.now);
      return { status: 200, body: dishJson(dish, currency, this.deps.assetUrl) };
    }
    const product = await this.deps.store.getMarketProduct(this.deps.app.id, productId);
    if (!product || product.vendorId !== s.vendor.id) return error(404, "not_found", "Item not found.");
    const patch: { inStock?: boolean; stock?: number | null } = {};
    if (typeof b.in_stock === "boolean") patch.inStock = b.in_stock;
    if (b.stock !== undefined) {
      patch.stock = b.stock as number | null;
      if (b.stock === 0) patch.inStock = false;
    }
    await this.deps.store.updateMarketProduct(this.deps.app.id, product.id, patch, request.now);
    return { status: 200, body: productJson({ ...product, ...patch }, currency, this.deps.assetUrl) };
  }
}

/** 115 The menu as customers see it while photos are required: dishes without their photo left out. */
function withPhotosOnly(menu: RestaurantMenu): RestaurantMenu {
  return { ...menu, sections: menu.sections.map((sec) => ({ ...sec, dishes: sec.dishes.filter((d) => d.imageAssetId) })).filter((sec) => sec.dishes.length > 0) };
}
