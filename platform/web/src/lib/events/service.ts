import { addDays, isDate, localToUtc, utcToLocal } from "../bookings/time";
import { centsToDecimal, formatCents } from "../catalog/money";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogCurrency, EventRecord, EventSettings, EventTicket, HostedUser, TicketType } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import { itemWords, type ItemWords } from "../hosted/pages/item-words";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { fold } from "../listings/search";
import { articleBody, plainText } from "../news/html";
import { newTicketCode, qrPayload } from "./codes";

/**
 * 28 The Events endpoints of the hosted API (tag Events in
 * docs/api/openapi.yaml), for Events & tickets apps whose events are managed
 * in the dashboard: the list with filters, an event with its ticket types,
 * free tickets, the paid tickets' checkout hand-off, the user's tickets and
 * cancelling one.
 *
 * Places: a ticket holds one while it is valid or used, and a pending one
 * (bought, not paid yet) until its hold ends. The store takes places
 * atomically (`claimTickets`), so two people never get the last one.
 *
 * iOS: a ticket to an event at a venue is a physical-world service, sold on
 * both platforms; a ticket to an online-only event (no venue) is digital
 * content, which iOS apps may not sell outside the App Store, so on iOS paid
 * online-only tickets have no button and their checkout link is refused.
 */

export const DEFAULT_EVENT_SETTINGS: EventSettings = { currency: "TRY", timeZone: "Europe/Istanbul", showMap: true, allowCancelHours: 24 };

/** Most tickets in one order, whatever a ticket type allows. */
export const MAX_TICKETS_PER_ORDER = 20;

/**
 * How long places are held for an unpaid order: as long as the payment page
 * link works (PAY_LINK_MINUTES). 49 When the buyer starts paying, the hold is
 * set to when the provider's page ends (lib/events/holds.ts), and a payment
 * confirmed after the hold ended gets its tickets only if places are still free.
 */
export const HOLD_MINUTES = PAY_LINK_MINUTES;

export const NAME_MAX = 80;

/** The app's event settings as saved, or the defaults. */
export async function eventSettingsOf(store: DataStore, appId: string): Promise<EventSettings> {
  return { ...DEFAULT_EVENT_SETTINGS, ...((await store.getEventSettings(appId)) ?? {}) };
}

/** `Config.events`. */
export function eventsConfig(settings: EventSettings) {
  return { show_map: settings.showMap, allow_cancel_hours: settings.allowCancelHours, time_zone: settings.timeZone, currency: settings.currency };
}

/** A category's ID in the app's filters: its name, folded ("Talks & workshops" → "talks-workshops"). */
export function categoryId(name: string): string {
  return (
    fold(name)
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "other"
  );
}

/** Everything the endpoints need about the app's events, read once per request. */
export interface EventsData {
  app: App;
  settings: EventSettings;
  events: EventRecord[];
  types: TicketType[];
  /** Places taken per ticket type. */
  taken: Map<number, number>;
  now: Date;
}

export async function loadEvents(store: DataStore, app: App, now: Date): Promise<EventsData> {
  const [settings, events, types, counts] = await Promise.all([
    eventSettingsOf(store, app.id),
    store.listEvents(app.id),
    store.listTicketTypes(app.id),
    store.countTicketPlaces(app.id, now),
  ]);
  return { app, settings, events, types, taken: new Map(counts.map((c) => [c.ticketTypeId, c.count])), now };
}

export type EventPhase = "scheduled" | "cancelled" | "ended";

export function phaseOf(event: EventRecord, now: Date): EventPhase {
  if (event.status === "cancelled") return "cancelled";
  return event.endAt.getTime() <= now.getTime() ? "ended" : "scheduled";
}

/** Places left: of the event (null for no limit) and of each of its ticket types (the event's limit counted). */
export function placesLeft(data: Pick<EventsData, "types" | "taken">, event: EventRecord): { event: number | null; types: Map<number, number | null> } {
  const types = data.types.filter((t) => t.eventId === event.id);
  const takenOf = (t: TicketType) => data.taken.get(t.id) ?? 0;
  const eventLeft = event.capacity === null ? null : Math.max(0, event.capacity - types.reduce((sum, t) => sum + takenOf(t), 0));
  const left = new Map<number, number | null>();
  for (const t of types) {
    const own = t.capacity === null ? null : Math.max(0, t.capacity - takenOf(t));
    left.set(t.id, own === null ? eventLeft : eventLeft === null ? own : Math.min(own, eventLeft));
  }
  const capped = types.length > 0 && types.every((t) => t.capacity !== null);
  const sumOfTypes = capped ? [...left.values()].reduce<number>((sum, n) => sum + (n ?? 0), 0) : null;
  const total = eventLeft === null ? sumOfTypes : sumOfTypes === null ? eventLeft : Math.min(eventLeft, sumOfTypes);
  return { event: total, types: left };
}

/** Why a ticket type can't be had now, or null when it can. */
export function notOnSale(event: EventRecord, type: TicketType, left: number | null, now: Date): "event_cancelled" | "sales_ended" | "sold_out" | null {
  if (event.status !== "published") return event.status === "cancelled" ? "event_cancelled" : "sales_ended";
  // Sales end when the event starts, or earlier when the organiser said so.
  if (now.getTime() >= event.startAt.getTime() || (type.saleEndsAt && now.getTime() >= type.saleEndsAt.getTime())) return "sales_ended";
  if (left !== null && left <= 0) return "sold_out";
  return null;
}

/** Whether an event is online only: no venue, so its tickets are digital content on iOS. */
export function onlineOnly(event: Pick<EventRecord, "venueName">): boolean {
  return !event.venueName;
}

export function price(cents: number, currency: CatalogCurrency) {
  if (cents === 0) return { is_free: true, amount: null, sale_amount: null, currency: null, formatted: null };
  return { is_free: false, amount: centsToDecimal(cents), sale_amount: null, currency, formatted: formatCents(cents, currency) };
}

/**
 * "Free", "₺150", "From ₺150", "Free · from ₺150", or null without ticket
 * types. Display text only, 38 in the app's language ([words]).
 */
export function priceLabel(types: TicketType[], currency: CatalogCurrency, words: ItemWords = itemWords("en")): string | null {
  if (types.length === 0) return null;
  const paid = types.filter((t) => t.priceCents > 0).map((t) => t.priceCents);
  if (paid.length === 0) return words.free;
  const lowest = formatCents(Math.min(...paid), currency);
  if (paid.length < types.length) return words.freeFrom(lowest);
  return new Set(paid).size === 1 ? lowest : words.from(lowest);
}

/** "2026-10-20T20:30": an instant on the clock of the time zone. */
export function localClock(at: Date, timeZone: string): string {
  const local = utcToLocal(at, timeZone);
  return `${local.date}T${local.time}`;
}

export interface JsonDeps {
  assetUrl: (assetId: string) => string;
  /** 43 The language the app asks in, for the price label ("Free", "From ₺150"); English when missing. */
  lang?: string | null;
}

export function eventSummaryJson(data: EventsData, event: EventRecord, deps: JsonDeps) {
  const types = data.types.filter((t) => t.eventId === event.id);
  const left = placesLeft(data, event);
  const phase = phaseOf(event, data.now);
  return {
    id: event.id,
    title: event.title,
    category: event.category ? { id: categoryId(event.category), name: event.category } : null,
    image_url: event.imageAssetIds[0] ? deps.assetUrl(event.imageAssetIds[0]) : null,
    starts_at: event.startAt.toISOString(),
    ends_at: event.endAt.toISOString(),
    // The organiser's clock: apps carry no time zone database.
    starts_local: localClock(event.startAt, data.settings.timeZone),
    ends_local: localClock(event.endAt, data.settings.timeZone),
    time_zone: data.settings.timeZone,
    venue: event.venueName
      ? { name: event.venueName, address: event.venueAddress, latitude: event.latitude, longitude: event.longitude }
      : null,
    online: Boolean(event.onlineUrl),
    price_label: priceLabel(types, data.settings.currency, itemWords(deps.lang)),
    status: phase,
    spots_left: left.event,
    sold_out: types.length > 0 && types.every((t) => left.types.get(t.id) === 0),
  };
}

export type TicketAction = "register" | "checkout" | "none";

/** What a ticket type's button does on this platform. */
export function ticketAction(input: { event: EventRecord; type: TicketType; onSale: boolean; ios: boolean; canSell: boolean }): TicketAction {
  if (!input.onSale) return "none";
  if (input.type.priceCents === 0) return "register";
  if (!input.canSell) return "none";
  // Online-only events are digital content: never sold in an iOS app.
  if (input.ios && onlineOnly(input.event)) return "none";
  return "checkout";
}

export function eventDetailJson(
  data: EventsData,
  event: EventRecord,
  deps: JsonDeps & { ios: boolean; canSell: boolean; mine: EventTicket[] },
) {
  const left = placesLeft(data, event);
  const holder = deps.mine.some((t) => t.status === "valid" || t.status === "used");
  return {
    ...eventSummaryJson(data, event, deps),
    ...articleBody(event.description),
    images: event.imageAssetIds.map((id) => ({ url: deps.assetUrl(id) })),
    organiser: event.organiser,
    online_url: holder && event.status !== "cancelled" ? event.onlineUrl : null,
    ticket_types: data.types
      .filter((t) => t.eventId === event.id)
      .map((t) => {
        const remaining = left.types.get(t.id) ?? null;
        const onSale = notOnSale(event, t, remaining, data.now) === null;
        return {
          id: t.id,
          name: t.name,
          price: price(t.priceCents, data.settings.currency),
          remaining,
          sale_ends_at: t.saleEndsAt ? t.saleEndsAt.toISOString() : null,
          max_per_order: Math.min(t.maxPerOrder, MAX_TICKETS_PER_ORDER),
          on_sale: onSale,
          action: ticketAction({ event, type: t, onSale, ios: deps.ios, canSell: deps.canSell }),
        };
      }),
    my_tickets: deps.mine.filter((t) => t.status === "valid" || t.status === "used").length,
  };
}

/** Whether the holder may cancel this ticket in the app now. */
export function mayCancel(ticket: EventTicket, event: EventRecord, settings: EventSettings, now: Date): boolean {
  if (ticket.status !== "valid" || ticket.priceCents > 0 || settings.allowCancelHours === null || event.status !== "published") return false;
  return now.getTime() <= event.startAt.getTime() - settings.allowCancelHours * 3_600_000;
}

export function ticketJson(data: EventsData, ticket: EventTicket, deps: JsonDeps & { key: string }) {
  const event = data.events.find((e) => e.id === ticket.eventId)!;
  const type = data.types.find((t) => t.id === ticket.ticketTypeId);
  // A ticket of a cancelled event is cancelled, whatever happened to it.
  const status = ticket.status === "used" ? "used" : ticket.status === "cancelled" || event.status === "cancelled" ? "cancelled" : "valid";
  return {
    code: ticket.code,
    qr_payload: qrPayload(deps.key, data.app.id, ticket.code),
    status,
    holder_name: ticket.holderName,
    event: eventSummaryJson(data, event, deps),
    ticket_type: { id: ticket.ticketTypeId, name: type?.name ?? "Ticket" },
    price: price(ticket.priceCents, data.settings.currency),
    online_url: status === "cancelled" ? null : event.onlineUrl,
    used_at: ticket.usedAt ? ticket.usedAt.toISOString() : null,
    can_cancel: mayCancel(ticket, event, data.settings, data.now),
    // 47 Refunded by the organiser: cancelled (never a new status, which older apps would read as valid).
    refunded: Boolean(ticket.refundedAt),
    created_at: ticket.createdAt.toISOString(),
  };
}

/** Published (and cancelled) events, as the app may see them. */
function visible(data: EventsData): EventRecord[] {
  return data.events.filter((e) => e.status !== "draft");
}

/** GET /events/filters */
export function eventFilters(data: EventsData) {
  const upcoming = visible(data).filter((e) => e.status === "published" && e.endAt.getTime() > data.now.getTime());
  const categories = new Map<string, { id: string; name: string; count: number }>();
  for (const e of upcoming) {
    if (!e.category) continue;
    const id = categoryId(e.category);
    const row = categories.get(id) ?? { id, name: e.category, count: 0 };
    row.count++;
    categories.set(id, row);
  }
  const days = upcoming.map((e) => utcToLocal(e.startAt, data.settings.timeZone).date).sort();
  return {
    categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name)),
    first_date: days[0] ?? null,
    last_date: days[days.length - 1] ?? null,
  };
}

/** The events GET /events asks for, soonest first, or why the request isn't valid. */
export function filterEvents(data: EventsData, query: URLSearchParams): EventRecord[] | { error: string } {
  const search = (query.get("search") ?? "").trim();
  if (search.length > 100) return { error: "Search for up to 100 characters." };
  const from = (query.get("from") ?? "").trim();
  const to = (query.get("to") ?? "").trim();
  if ((from && !isDate(from)) || (to && !isDate(to))) return { error: "Days are written like 2026-10-19." };
  if (from && to && to < from) return { error: "The last day is before the first." };
  const tz = data.settings.timeZone;
  const after = from ? localToUtc(from, "00:00", tz) : data.now;
  const before = to ? localToUtc(addDays(to, 1), "00:00", tz) : null;
  const category = (query.get("category") ?? "").trim();
  const words = fold(search).split(/\s+/).filter(Boolean);
  return visible(data).filter(
    (e) =>
      e.endAt.getTime() > after.getTime() - (from ? 1 : 0) &&
      (before === null || e.startAt.getTime() < before.getTime()) &&
      (!category || (e.category !== null && categoryId(e.category) === category)) &&
      (words.length === 0 ||
        words.every((w) => fold(`${e.title} ${plainText(e.description)} ${e.venueName ?? ""} ${e.venueAddress ?? ""} ${e.organiser ?? ""}`).includes(w))),
  );
}

// Ordering tickets

export interface TicketOrder {
  event: EventRecord;
  type: TicketType;
  /** One per ticket. */
  names: string[];
}

/** The ticket order a request asks for (`TicketOrderInput`), checked against the event; or the error to answer. */
export function readTicketOrder(data: EventsData, event: EventRecord | null, body: unknown, user: HostedUser): TicketOrder | ConnectorResult {
  if (!event || event.status === "draft") return error(404, "not_found", "Event not found.");
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const type = data.types.find((t) => t.id === Number(input.ticket_type_id) && t.eventId === event.id);
  if (!type) return error(404, "not_found", "This ticket type isn't available.");
  const quantity = Number(input.quantity);
  const most = Math.min(type.maxPerOrder, MAX_TICKETS_PER_ORDER);
  if (!Number.isInteger(quantity) || quantity < 1) return error(400, "invalid_request", "Choose how many tickets.");
  // 43 Two whole sentences, so the hosted API can answer them in the app's language.
  if (quantity > most) return error(400, "invalid_request", most === 1 ? "You can get up to 1 ticket at a time." : `You can get up to ${most} tickets at a time.`);
  const raw = input.attendee_names ?? [];
  if (!Array.isArray(raw) || raw.length > quantity || raw.some((n) => typeof n !== "string" || n.length > NAME_MAX)) {
    return error(400, "invalid_request", `Give a name of up to ${NAME_MAX} characters for each ticket.`);
  }
  const fallback = user.name.trim().slice(0, NAME_MAX) || "Guest";
  const names = Array.from({ length: quantity }, (_, i) => ((raw[i] as string | undefined) ?? "").trim().replace(/\s+/g, " ") || fallback);
  const left = placesLeft(data, event).types.get(type.id) ?? null;
  const why = notOnSale(event, type, left, data.now);
  if (why === "event_cancelled") return error(409, "event_cancelled", "This event is cancelled.");
  if (why === "sales_ended") return error(409, "sales_ended", "Tickets for this aren't on sale any more.");
  if (left !== null && left < quantity) {
    return error(409, "sold_out", left === 0 ? "Sold out." : `Only ${left} ${left === 1 ? "ticket is" : "tickets are"} left.`);
  }
  return { event, type, names };
}

/** Codes for new tickets. */
export function newCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(newTicketCode());
  return [...codes];
}

/** The answer for a claim that found no room. */
export const soldOut = () => error(409, "sold_out", "Sorry, those places were just taken.");

export function isResult(value: TicketOrder | ConnectorResult): value is ConnectorResult {
  return "status" in value;
}

/** GET /events: a page of events. */
export function listEventsResult(data: EventsData, request: ConnectorRequest, deps: JsonDeps): ConnectorResult {
  const found = filterEvents(data, request.query);
  if ("error" in found) return error(400, "invalid_request", found.error);
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 50);
  return {
    status: 200,
    body: {
      page,
      per_page: perPage,
      total: found.length,
      total_pages: Math.max(1, Math.ceil(found.length / perPage)),
      items: found.slice((page - 1) * perPage, page * perPage).map((e) => eventSummaryJson(data, e, { ...deps, lang: request.lang })),
    },
  };
}

/** The user's tickets in the order the wallet shows them: upcoming soonest first, then past ones, latest first. */
export function walletOrder(data: EventsData, tickets: EventTicket[]): EventTicket[] {
  const byId = new Map(data.events.map((e) => [e.id, e]));
  const now = data.now.getTime();
  return tickets
    .filter((t) => t.status !== "pending" && byId.has(t.eventId))
    .sort((a, b) => {
      const ea = byId.get(a.eventId)!;
      const eb = byId.get(b.eventId)!;
      const pa = ea.endAt.getTime() > now ? 0 : 1;
      const pb = eb.endAt.getTime() > now ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const order = pa === 0 ? ea.startAt.getTime() - eb.startAt.getTime() : eb.startAt.getTime() - ea.startAt.getTime();
      return order || a.id - b.id;
    });
}
