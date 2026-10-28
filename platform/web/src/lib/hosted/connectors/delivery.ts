import { paymentsSetUp } from "../../catalog/settings";
import type { DataStore } from "../../data/store";
import type { App, Courier, DeliverySettings, HostedUser, Shipment } from "../../data/types";
import { announceWaiting, assignShipment, forgetIdleLocation, moveShipment } from "../../delivery/flow";
import { locateMapLink } from "../../delivery/locate";
import { shipmentPayLink } from "../../delivery/payment";
import { quoteShipment } from "../../delivery/pricing";
import {
  ACTIVE_STATUSES,
  CANCELLABLE,
  COURIER_ACTIVE,
  COURIER_STEPS,
  courierJobJson,
  courierJson,
  courierWho,
  deliveryConfig,
  deliveryServiceJson,
  LIVE_STATUSES,
  readQuoteRequest,
  readShipmentRequest,
  shipmentJson,
  stage,
  type QuoteRequest,
} from "../../delivery/service";
import { courierMayHave, createSampleJob, isReviewCourier, reviewCourierFor, reviewUserId } from "../../delivery/review";
import { deliverySettingsOf, pricesSet } from "../../delivery/settings";
import { centsToDecimal, formatCents } from "../../catalog/money";
import { hitRateLimit, RATE_LIMITS } from "../../rate-limit";
import { platformSetting } from "../../settings/platform";
import { hostedSettings } from "../service";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface DeliveryDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  /** The platform's address, for payment links. */
  platformUrl: string;
  /** 13.1 Card payments are in the app's plan (default true). */
  cardPayments?: boolean;
  /** The plan has delivery apps (default true). */
  delivery?: boolean;
  /** For reading short maps links. */
  fetcher?: typeof fetch;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const notFound = () => error(404, "not_found", "Shipment not found.");
const jobNotFound = () => error(404, "not_found", "Job not found.");
const notCourier = () => error(403, "not_courier", "This account isn't one of our couriers.");
/** Couriers check their jobs often: the "done" list goes back this far. */
const DONE_DAYS = 30;
/** At most one position every this many seconds is kept. */
const LOCATION_SECONDS = 5;

/**
 * 104 Delivery and courier companies: the customer prices and sends a
 * parcel, pays cash or by card on the company's payment page, and follows
 * it; the company's couriers (people it added by number) see their jobs,
 * take waiting ones when the company lets them, move them on and send their
 * position while a parcel is on the way. Everything a courier does is
 * checked against the courier the signed-in person is.
 */
export class DeliveryConnector implements Connector {
  constructor(private readonly deps: DeliveryDeps) {}

  private async settings(): Promise<DeliverySettings> {
    return deliverySettingsOf(await this.deps.store.getDeliverySettings(this.deps.app.id));
  }

  private get canTakeCards(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  async config() {
    const [settings, maps] = await Promise.all([this.settings(), platformSetting(this.deps.store, "maps")]);
    return {
      delivery: deliveryConfig({ ...settings, card: settings.card && this.canTakeCards }, maps?.value ?? null),
      features: { orders: settings.card && this.canTakeCards },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const path = request.path;
    const route = `${request.method} /${path.join("/")}`;
    const mine = path[0] === "me" && path[1] === "shipments";
    if (path[0] !== "delivery" && path[0] !== "courier" && !mine) return null;
    if (this.deps.delivery === false) return error(403, "feature_disabled", "Deliveries aren't available in this app right now.");
    switch (route) {
      case "GET /delivery/services":
        return this.services();
      case "POST /delivery/quote":
        return this.quote(request);
      case "POST /delivery/locate":
        return this.locate(request);
      case "POST /delivery/shipments":
        return this.send(request);
      case "GET /me/shipments":
        return this.myShipments(request);
      case "GET /courier/me":
        return this.courierMe(request);
      case "PATCH /courier/me":
        return this.duty(request);
      case "GET /courier/jobs":
        return this.jobs(request);
      case "PUT /courier/location":
        return this.location(request);
    }
    const id = path[2] && /^\d{1,15}$/.test(path[2]) ? Number(path[2]) : null;
    if (mine && id !== null) {
      if (request.method === "GET" && path.length === 3) return this.myShipment(request, id);
      if (request.method === "POST" && path.length === 4 && path[3] === "cancel") return this.cancel(request, id);
      if (request.method === "POST" && path.length === 4 && path[3] === "pay") return this.pay(request, id);
    }
    if (path[0] === "courier" && path[1] === "jobs" && id !== null) {
      if (request.method === "GET" && path.length === 3) return this.job(request, id);
      if (request.method === "POST" && path.length === 4 && path[3] === "accept") return this.accept(request, id);
      if (request.method === "POST" && path.length === 4 && path[3] === "status") return this.step(request, id);
    }
    return error(404, "not_found", "Not found.");
  }

  // The customer

  private async services(): Promise<ConnectorResult> {
    const [services, settings] = await Promise.all([this.deps.store.listDeliveryServices(this.deps.app.id), this.settings()]);
    return { status: 200, body: { items: services.filter((s) => s.active).map((s) => deliveryServiceJson(s, settings.currency, this.deps.assetUrl)) } };
  }

  /** The price, or the error to answer with. */
  private async price(input: QuoteRequest, settings: DeliverySettings) {
    const services = (await this.deps.store.listDeliveryServices(this.deps.app.id)).filter((s) => s.active);
    const service = input.serviceId === null ? null : (services.find((s) => s.id === input.serviceId) ?? null);
    if (input.serviceId !== null && !service) return { error: error(400, "invalid_request", "That service isn't offered any more. Choose another one.") };
    if (input.serviceId === null && services.length > 0) return { error: error(400, "invalid_request", "Choose a service.") };
    const quote = quoteShipment(settings, { pickup: input.pickup, dropoff: input.dropoff, zoneId: input.zoneId, service });
    if (!quote.ok) return { error: error(400, "invalid_request", quote.error) };
    return { quote, service };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const read = readQuoteRequest(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const settings = await this.settings();
    if (!pricesSet(settings)) return unavailable();
    const priced = await this.price(read.value, settings);
    if ("error" in priced) return priced.error!;
    const { quote } = priced;
    return {
      status: 200,
      body: { price: centsToDecimal(quote.cents), price_formatted: formatCents(quote.cents, settings.currency), currency: settings.currency, distance_km: quote.distanceKm },
    };
  }

  private async locate(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const url = (request.body as { url?: unknown } | null)?.url;
    if (typeof url !== "string" || !url.trim() || url.length > 500) return error(400, "invalid_request", "Paste a maps link.");
    const limit = await hitRateLimit(this.deps.store, RATE_LIMITS.mapLink, `${this.deps.app.id}:${request.user.id}`, request.now);
    if (!limit.allowed) return error(429, "rate_limited", "Too many links. Please wait a few minutes and try again.");
    const found = await locateMapLink(url, this.deps.fetcher);
    if (!found) return error(400, "invalid_request", "We couldn't find a place in this link. Set it on the map instead.");
    return { status: 200, body: found };
  }

  private async send(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const { store, app } = this.deps;
    const read = readShipmentRequest(request.body, hostedSettings(app).defaultCountryCode);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const settings = await this.settings();
    if (!pricesSet(settings)) return unavailable();
    const input = read.value;
    if (input.payment === "cash" && !settings.cash) return error(400, "invalid_request", "Cash isn't taken for deliveries. Pay by card.");
    if (input.payment === "card" && !settings.card) return error(400, "invalid_request", "Cards aren't taken for deliveries. Pay the courier in cash.");
    if (input.payment === "card" && !this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const priced = await this.price(input, settings);
    if ("error" in priced) return priced.error!;
    const { quote, service } = priced;
    const status = input.payment === "cash" ? "pending" : "awaiting_payment";
    const created = await store.createShipment({
      appId: app.id,
      userId: request.user.id,
      senderName: request.user.name,
      senderPhone: request.user.phone,
      serviceId: service?.id ?? null,
      serviceName: service?.name ?? null,
      pickup: input.pickup,
      dropoff: input.dropoff,
      zoneId: quote.zone?.id ?? null,
      zoneName: quote.zone?.name ?? null,
      distanceKm: quote.distanceKm,
      packageSize: input.packageSize,
      packageDescription: input.packageDescription,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      notes: input.notes,
      priceCents: quote.cents,
      currency: settings.currency,
      paymentMethod: input.payment,
      paymentStatus: "unpaid",
      orderId: null,
      status,
      courierId: null,
      courierName: null,
      timeline: [stage(status, request.now, "customer")],
      lang: request.lang ?? null,
      createdAt: request.now,
      updatedAt: request.now,
    });
    let payUrl: string | null = null;
    if (input.payment === "card") {
      payUrl = (await shipmentPayLink(store, app, created, this.deps.platformUrl, request.now)).url;
    } else {
      await announceWaiting({ store, app, now: request.now }, created);
    }
    const saved = (await store.getShipment(app.id, created.id)) ?? created;
    return { status: 201, body: { shipment: shipmentJson(saved), pay_url: payUrl } };
  }

  private async ownShipment(request: ConnectorRequest, id: number): Promise<Shipment | null> {
    const shipment = await this.deps.store.getShipment(this.deps.app.id, id);
    return shipment && shipment.userId === request.user?.id ? shipment : null;
  }

  private async myShipments(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const active = request.query.get("active") === "true";
    const { items, total } = await this.deps.store.listShipments({
      appId: this.deps.app.id,
      userId: request.user.id,
      ...(active ? { statuses: ACTIVE_STATUSES } : {}),
      order: "newest",
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    return { status: 200, body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: items.map((s) => shipmentJson(s)) } };
  }

  private async myShipment(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const shipment = await this.ownShipment(request, id);
    if (!shipment) return notFound();
    const [settings, courier] = await Promise.all([this.settings(), shipment.courierId !== null ? this.deps.store.getCourier(this.deps.app.id, shipment.courierId) : null]);
    return { status: 200, body: shipmentJson(shipment, { courier, settings, now: request.now }) };
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const shipment = await this.ownShipment(request, id);
    if (!shipment) return notFound();
    if (shipment.status === "cancelled") return { status: 200, body: shipmentJson(shipment) };
    if (!CANCELLABLE.includes(shipment.status)) return error(409, "not_cancellable", "A courier already has this shipment. Please contact us to cancel it.");
    const moved = await moveShipment({ store: this.deps.store, app: this.deps.app, now: request.now }, shipment, "cancelled", "customer");
    if (!moved.ok) return error(409, "not_cancellable", "A courier already has this shipment. Please contact us to cancel it.");
    return { status: 200, body: shipmentJson(moved.shipment) };
  }

  private async pay(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const shipment = await this.ownShipment(request, id);
    if (!shipment) return notFound();
    if (shipment.status !== "awaiting_payment" || shipment.paymentStatus !== "unpaid") return error(409, "not_payable", "This shipment has nothing to pay.");
    if (!this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const link = await shipmentPayLink(this.deps.store, this.deps.app, shipment, this.deps.platformUrl, request.now);
    return { status: 200, body: { url: link.url } };
  }

  // The courier

  /** The courier the signed-in person is, or null. Paused couriers aren't. 104.7 The store review account is a courier too. */
  private async courierOf(user: HostedUser | null, now: Date): Promise<Courier | null> {
    if (!user) return null;
    const courier = (await this.deps.store.findCourier(this.deps.app.id, courierWho(user))) ?? (await reviewCourierFor(this.deps.store, this.deps.app, user, now));
    return courier && courier.active ? courier : null;
  }

  /** 104.7 Whether the courier may have this shipment (the review account's go to the review courier only). */
  private async mayHave(courier: Courier, shipment: Shipment): Promise<boolean> {
    return courierMayHave(this.deps.app, courier, shipment, await reviewUserId(this.deps.store, this.deps.app));
  }

  private async withCourier(request: ConnectorRequest, then: (courier: Courier) => Promise<ConnectorResult>): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const courier = await this.courierOf(request.user, request.now);
    return courier ? then(courier) : notCourier();
  }

  private async deliveredToday(courier: Courier, now: Date): Promise<number> {
    const since = new Date(now.getTime() - 24 * 3600_000);
    const done = await this.deps.store.listShipments({ appId: this.deps.app.id, courierId: courier.id, statuses: ["delivered"], updatedSince: since, order: "newest", offset: 0, limit: 1 });
    return done.total;
  }

  private courierMe(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => ({
      status: 200,
      body: courierJson(courier, await this.settings(), await this.deliveredToday(courier, request.now)),
    }));
  }

  private duty(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const onDuty = (request.body as { on_duty?: unknown } | null)?.on_duty;
      if (typeof onDuty !== "boolean") return error(400, "invalid_request", "Say whether you're on duty.");
      await this.deps.store.updateCourier(this.deps.app.id, courier.id, { onDuty }, request.now);
      return { status: 200, body: courierJson({ ...courier, onDuty }, await this.settings(), await this.deliveredToday(courier, request.now)) };
    });
  }

  private jobs(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const scope = request.query.get("scope");
      if (scope !== "active" && scope !== "available" && scope !== "done") return error(400, "invalid_request", "Unknown list.");
      const page = intParam(request.query, "page", 1, 10_000);
      const perPage = intParam(request.query, "per_page", 20, 50);
      const base = { appId: this.deps.app.id, offset: (page - 1) * perPage, limit: perPage };
      let result: { items: Shipment[]; total: number };
      // 104.7 The review account's parcels are the review courier's only.
      const reviewId = await reviewUserId(this.deps.store, this.deps.app);
      const review = isReviewCourier(this.deps.app, courier);
      if (scope === "available") {
        const settings = await this.settings();
        const whose = review ? (reviewId === null ? null : { userId: reviewId }) : reviewId === null ? {} : { notUserId: reviewId };
        result =
          settings.assignment === "open" && courier.onDuty && whose
            ? await this.deps.store.listShipments({ ...base, ...whose, statuses: ["pending"], unassigned: true, order: "oldest" })
            : { items: [], total: 0 };
      } else if (scope === "active") {
        result = await this.deps.store.listShipments({ ...base, courierId: courier.id, statuses: COURIER_ACTIVE, order: "oldest" });
        // 104.7 A reviewer with no job gets a sample one, so the courier app can be reviewed on its own.
        if (review && result.total === 0 && page === 1 && request.user) {
          const sample = await createSampleJob(this.deps.store, this.deps.app, await this.settings(), courier, request.user, request.now);
          result = { items: [sample], total: 1 };
        }
      } else {
        const since = new Date(request.now.getTime() - DONE_DAYS * 86_400_000);
        result = await this.deps.store.listShipments({ ...base, courierId: courier.id, statuses: ["delivered", "failed", "cancelled"], updatedSince: since, order: "newest" });
      }
      return {
        status: 200,
        body: {
          page,
          per_page: perPage,
          total: result.total,
          total_pages: Math.max(1, Math.ceil(result.total / perPage)),
          items: result.items.map((s) => courierJobJson(s, s.courierId === courier.id)),
        },
      };
    });
  }

  /** A job the courier may see: theirs, or one waiting that they could take. */
  private async visibleJob(courier: Courier, id: number): Promise<Shipment | null> {
    const shipment = await this.deps.store.getShipment(this.deps.app.id, id);
    if (!shipment) return null;
    if (shipment.courierId === courier.id) return shipment;
    if (shipment.status === "pending" && shipment.courierId === null && courier.onDuty && (await this.settings()).assignment === "open" && (await this.mayHave(courier, shipment))) return shipment;
    return null;
  }

  private job(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const shipment = await this.visibleJob(courier, id);
      return shipment ? { status: 200, body: courierJobJson(shipment, shipment.courierId === courier.id) } : jobNotFound();
    });
  }

  private accept(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const settings = await this.settings();
      if (settings.assignment !== "open") return error(403, "feature_disabled", "Jobs are given to couriers by the company.");
      if (!courier.onDuty) return error(403, "off_duty", "Go on duty to take jobs.");
      const shipment = await this.deps.store.getShipment(this.deps.app.id, id);
      if (!shipment) return jobNotFound();
      if (shipment.courierId === courier.id) return { status: 200, body: courierJobJson(shipment, true) };
      if (shipment.status !== "pending" || shipment.courierId !== null) return error(409, "job_taken", "Another courier took this job.");
      if (!(await this.mayHave(courier, shipment))) return jobNotFound();
      const moved = await assignShipment({ store: this.deps.store, app: this.deps.app, now: request.now }, shipment, courier, "courier");
      if (!moved.ok) return error(409, "job_taken", "Another courier took this job.");
      return { status: 200, body: courierJobJson(moved.shipment, true) };
    });
  }

  private step(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
      const status = body.status;
      const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, 300) || null : null;
      if (status !== "picked_up" && status !== "on_the_way" && status !== "delivered" && status !== "failed" && status !== "released") {
        return error(400, "invalid_request", "Unknown stage.");
      }
      if (status === "failed" && !note) return error(400, "invalid_request", "Say why it couldn't be delivered.");
      const shipment = await this.deps.store.getShipment(this.deps.app.id, id);
      if (!shipment || shipment.courierId !== courier.id) return jobNotFound();
      if (!(COURIER_STEPS[shipment.status] ?? []).includes(status)) return error(409, "invalid_status", "This job can't move to that stage now.");
      const deps = { store: this.deps.store, app: this.deps.app, now: request.now };
      const moved = await moveShipment(deps, shipment, status === "released" ? "pending" : status, "courier", note);
      if (!moved.ok) return error(409, "invalid_status", "This job changed meanwhile. Pull to refresh.");
      return { status: 200, body: courierJobJson(moved.shipment, status !== "released") };
    });
  }

  private location(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withCourier(request, async (courier) => {
      const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
      const { lat, lng } = body;
      if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return error(400, "invalid_request", "The position isn't valid.");
      }
      if (courier.locatedAt && request.now.getTime() - courier.locatedAt.getTime() < LOCATION_SECONDS * 1000) return { status: 204 };
      const live = await this.deps.store.listShipments({ appId: this.deps.app.id, courierId: courier.id, statuses: LIVE_STATUSES, order: "oldest", offset: 0, limit: 1 });
      if (live.total === 0) {
        // No parcel on the way: nothing is kept (and an old position goes).
        await forgetIdleLocation(this.deps.store, this.deps.app.id, courier.id, request.now);
        return { status: 204 };
      }
      const round = (n: number) => Math.round(n * 1e6) / 1e6;
      await this.deps.store.updateCourier(this.deps.app.id, courier.id, { lat: round(lat), lng: round(lng), locatedAt: request.now }, request.now);
      return { status: 204 };
    });
  }
}

function unavailable(): ConnectorResult {
  return error(503, "delivery_unavailable", "We aren't taking shipments in the app yet. Please try again later.");
}
