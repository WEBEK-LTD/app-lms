import { PAY_LINK_MINUTES, paymentsSetUp } from "../../catalog/settings";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App } from "../../data/types";
import { signingSecret } from "../../env";
import { ticketKey } from "../../events/codes";
import {
  HOLD_MINUTES,
  eventDetailJson,
  eventFilters,
  eventsConfig,
  isResult,
  listEventsResult,
  loadEvents,
  mayCancel,
  newCodes,
  onlineOnly,
  readTicketOrder,
  soldOut,
  ticketJson,
  walletOrder,
  type EventsData,
} from "../../events/service";
import { payUrl } from "./catalog";
import { error } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface EventsDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** The platform's signing secret: each app's QR signing key is made from it (lib/events/codes.ts). Read from the environment when left out. */
  signingSecret?: string;
  /** 13.1 Card payments in the app are in the app's plan (default true); without them paid tickets show no button. */
  cardPayments?: boolean;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noEvent = () => error(404, "not_found", "Event not found.");

/**
 * 28 Events & tickets apps: events, ticket types and tickets managed on the
 * dashboard's Events page, served with the Events endpoints
 * (lib/events/service.ts). Free tickets are issued in the app; paid ones are
 * held, paid on the payment page (the shop's card payment settings, like
 * paid courses) and issued once the provider confirms the payment
 * (`issuePaidTickets` in lib/catalog/payment.ts).
 */
export class EventsConnector implements Connector {
  constructor(private readonly deps: EventsDeps) {}

  private get canSell(): boolean {
    // 16 A demo app "sells" on its payment page, which charges nothing.
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  private get key(): string {
    return ticketKey(this.deps.signingSecret ?? signingSecret(), this.deps.app.id);
  }

  private load(now: Date): Promise<EventsData> {
    return loadEvents(this.deps.store, this.deps.app, now);
  }

  async config() {
    const data = await this.load(new Date());
    return { events: eventsConfig(data.settings) };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /events/filters":
        return { status: 200, body: eventFilters(await this.load(request.now)) };
      case "GET /events":
        return listEventsResult(await this.load(request.now), request, this.deps);
      case "POST /events/checkout-link":
        return this.checkoutLink(request);
      case "GET /me/tickets":
        return this.myTickets(request);
    }
    const [first, second, third, fourth] = request.path;
    if (first === "events" && second && /^\d{1,15}$/.test(second)) {
      const id = Number(second);
      if (request.method === "GET" && request.path.length === 2) return this.detail(request, id);
      if (request.method === "POST" && third === "register" && request.path.length === 3) return this.register(request, id);
    }
    if (first === "me" && second === "tickets" && third && fourth === "cancel" && request.method === "POST" && request.path.length === 4) {
      return this.cancel(request, third);
    }
    return null;
  }

  private async detail(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const data = await this.load(request.now);
    const event = data.events.find((e) => e.id === id && e.status !== "draft");
    if (!event) return noEvent();
    const mine = request.user ? await this.deps.store.listTickets({ appId: this.deps.app.id, eventId: event.id, userId: request.user.id }) : [];
    const ios = request.query.get("platform") === "ios";
    return { status: 200, body: eventDetailJson(data, event, { assetUrl: this.deps.assetUrl, ios, canSell: this.canSell, mine }) };
  }

  /** Free tickets, on every platform. */
  private async register(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const data = await this.load(request.now);
    const order = readTicketOrder(data, data.events.find((e) => e.id === id) ?? null, request.body, request.user);
    if (isResult(order)) return order;
    if (order.type.priceCents > 0) return error(403, "purchase_required", "These tickets aren't free.");
    const claim = await this.deps.store.claimTickets({
      appId: this.deps.app.id,
      eventId: order.event.id,
      ticketTypeId: order.type.id,
      userId: request.user.id,
      orderId: null,
      tickets: newCodes(order.names.length).map((code, i) => ({ code, holderName: order.names[i]! })),
      priceCents: 0,
      status: "valid",
      holdUntil: null,
      now: request.now,
    });
    if (!claim.ok) return claim.reason === "sold_out" ? soldOut() : error(409, "sales_ended", "Tickets for this aren't on sale any more.");
    const after = await this.load(request.now);
    return { status: 201, body: { tickets: claim.tickets.map((t) => ticketJson(after, t, { assetUrl: this.deps.assetUrl, key: this.key })) } };
  }

  /** Paid tickets: the places are held and the payment page opens; paying issues the tickets. */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const data = await this.load(request.now);
    const event = data.events.find((e) => e.id === Number(body.event_id)) ?? null;
    const order = readTicketOrder(data, event, body, request.user);
    if (isResult(order)) return order;
    if (order.type.priceCents === 0) return error(403, "feature_disabled", "These tickets are free: get them in the app.");
    // Online-only events are digital content: never sold in an iOS app.
    if (platform === "ios" && onlineOnly(order.event)) return error(403, "purchase_not_allowed", "Tickets to online events can't be bought in the iPhone app.");
    if (!this.canSell) return error(403, "purchase_not_allowed", "These tickets can't be bought in the app right now.");
    const { store, app } = this.deps;
    const quantity = order.names.length;
    const token = randomToken(24);
    const created = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex(token),
      userId: request.user.id,
      status: "pending",
      lines: [
        {
          productId: order.type.id,
          name: `${order.event.title}: ${order.type.name}`.slice(0, 200),
          quantity,
          unitCents: order.type.priceCents,
          imageAssetId: order.event.imageAssetIds[0] ?? null,
          // Nothing is shipped: a ticket is a code.
          digital: true,
        },
      ],
      subtotalCents: order.type.priceCents * quantity,
      shippingCents: 0,
      totalCents: order.type.priceCents * quantity,
      currency: data.settings.currency,
      customer: null,
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    const claim = await store.claimTickets({
      appId: app.id,
      eventId: order.event.id,
      ticketTypeId: order.type.id,
      userId: request.user.id,
      orderId: created.id,
      tickets: newCodes(quantity).map((code, i) => ({ code, holderName: order.names[i]! })),
      priceCents: order.type.priceCents,
      status: "pending",
      holdUntil: new Date(request.now.getTime() + HOLD_MINUTES * 60_000),
      now: request.now,
    });
    if (!claim.ok) {
      await store.updateCatalogOrder(app.id, created.id, { status: "cancelled", updatedAt: request.now });
      return claim.reason === "sold_out" ? soldOut() : error(409, "sales_ended", "Tickets for this aren't on sale any more.");
    }
    return {
      status: 200,
      body: { url: payUrl(this.deps.platformUrl, token), expires_at: new Date(request.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(), open_in: "in_app" },
    };
  }

  private async myTickets(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const [data, tickets] = await Promise.all([this.load(request.now), this.deps.store.listTickets({ appId: this.deps.app.id, userId: request.user.id })]);
    const deps = { assetUrl: this.deps.assetUrl, key: this.key };
    return { status: 200, body: { items: walletOrder(data, tickets).map((t) => ticketJson(data, t, deps)) } };
  }

  private async cancel(request: ConnectorRequest, code: string): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const { store, app } = this.deps;
    const ticket = /^[A-Z0-9]{1,16}$/.test(code) ? await store.getTicketByCode(app.id, code) : null;
    if (!ticket || ticket.userId !== request.user.id || ticket.status === "pending") return error(404, "not_found", "Ticket not found.");
    const data = await this.load(request.now);
    const event = data.events.find((e) => e.id === ticket.eventId);
    if (!event) return error(404, "not_found", "Ticket not found.");
    if (ticket.status !== "valid" || event.status === "cancelled") return error(409, "conflict", "This ticket is already used or cancelled.");
    if (!mayCancel(ticket, event, data.settings, request.now)) {
      const why =
        ticket.priceCents > 0
          ? "Paid tickets are refunded by the organiser: please contact them."
          : data.settings.allowCancelHours === null
            ? "Tickets to this event can't be cancelled in the app."
            : `Tickets can be cancelled until ${data.settings.allowCancelHours} hours before the event.`;
      return error(403, "cancel_not_allowed", why);
    }
    await store.cancelTickets(app.id, { ids: [ticket.id] }, request.now);
    const after = await this.load(request.now);
    const saved = (await store.getTicketByCode(app.id, ticket.code))!;
    return { status: 200, body: ticketJson(after, saved, { assetUrl: this.deps.assetUrl, key: this.key }) };
  }
}
