import { randomInt } from "node:crypto";
import { paymentsSetUp } from "../../catalog/settings";
import { parsePrice } from "../../catalog/money";
import type { DataStore } from "../../data/store";
import type { App, HostedUser, TravelAlert, TravelBooking, TravelFlight } from "../../data/types";
import { notifyDeps } from "../../delivery/flow";
import { checkAlerts, alertJson, priceAlert } from "../../travel/alerts";
import {
  bookingFlights,
  bookingJson,
  cancelPatch,
  changedLeg,
  changedStay,
  fitsCheck,
  newBooking,
  newReference,
  passesJson,
  passesOpen,
  priceChoice,
  quoteJson,
  readChoice,
  readExtras,
  readReview,
  refreshBooking,
  seatsPatch,
  seatsRefusalOf,
  canCancel,
  canChange,
  startsOf,
} from "../../travel/bookings";
import { allHolds, explore, flightCalendar, hotelCards, hotelJson, places, readFlightAsk, readStayAsk, searchFlights, searchHotels, seatMapJson, travelConfig, type Refusal, type TravelDeps } from "../../travel/catalog";
import { tellBooking } from "../../travel/notify";
import { travelPayLink } from "../../travel/payment";
import { dueCents, today, wallTime } from "../../travel/pricing";
import { TRAVEL_LIMITS, travelSettingsOf } from "../../travel/settings";
import { sourcesFor } from "../../travel/sources";
import { error } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface TravelConnectorDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** Travel is in the app's plan (default true). */
  travel?: boolean;
  /** Card payments are in the plan (default true). */
  cardPayments?: boolean;
  /** Signs the boarding passes' codes. */
  signingSecret?: string;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const NOT_FOUND = { Booking: "Booking not found.", Hotel: "Hotel not found.", Flight: "Flight not found.", Alert: "Alert not found.", "Seat map": "This flight has no seat map: seats are given at the airport." } as const;
const notFound = (what: keyof typeof NOT_FOUND = "Booking") => error(404, "not_found", NOT_FOUND[what]);
const refusal = (r: Refusal) => error(r.status, r.code, r.message);
const isRefusal = (v: unknown): v is Refusal => Boolean(v && typeof v === "object" && "code" in v && "status" in v && "message" in v);
const idOf = (value: string | undefined) => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

/**
 * 126 Travel apps on the hosted API (docs/api/openapi.yaml, tag Travel):
 * search hotels and flights, price a stay, a flight or both, book them in
 * the store's lock, pay on the company's payment page or at the hotel, and
 * the person's bookings, saved hotels and price alerts. The hotels and
 * flights come through lib/travel/sources.ts (the dashboard's in phase 1).
 */
export class TravelConnector implements Connector {
  constructor(private readonly deps: TravelConnectorDeps) {}

  private async context(now: Date): Promise<TravelDeps> {
    const settings = travelSettingsOf(await this.deps.store.getTravelSettings(this.deps.app.id));
    const sources = sourcesFor(this.deps.store, this.deps.app.id, settings);
    return { store: this.deps.store, app: this.deps.app, settings, hotels: sources.hotels, flights: sources.flights, assetUrl: this.deps.assetUrl, platformUrl: this.deps.platformUrl, now };
  }

  private get canTakeCards(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  async config() {
    const ctx = await this.context(new Date());
    return { travel: await travelConfig(ctx), features: { orders: false } };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const path = request.path;
    const mine = path[0] === "me" && path[1] === "travel";
    if (path[0] !== "travel" && !mine) return null;
    if (this.deps.travel === false) return error(403, "feature_disabled", "Travel isn't available in this app right now.");
    const ctx = await this.context(request.now);
    const route = `${request.method} /${path.join("/")}`;
    switch (route) {
      case "GET /travel/explore":
        return this.explore(ctx, request);
      case "GET /travel/places":
        return { status: 200, body: await places(ctx) };
      case "GET /travel/hotels":
        return this.hotels(ctx, request);
      case "GET /travel/flights":
        return this.flights(ctx, request);
      case "GET /travel/flights/calendar":
        return this.calendar(ctx, request);
      case "POST /travel/quote":
        return this.quote(ctx, request);
      case "GET /me/travel/saved":
        return this.saved(ctx, request);
      case "GET /me/travel/bookings":
        return this.bookings(ctx, request);
      case "POST /me/travel/bookings":
        return this.book(ctx, request);
      case "GET /me/travel/alerts":
        return this.alerts(ctx, request);
      case "POST /me/travel/alerts":
        return this.addAlert(ctx, request);
    }
    if (path[0] === "travel" && path[1] === "hotels" && path.length === 3 && request.method === "GET") {
      const id = idOf(path[2]);
      return id === null ? notFound("Hotel") : this.hotel(ctx, request, id);
    }
    if (path[0] === "travel" && path[1] === "flights" && path.length === 4 && path[3] === "seats" && request.method === "GET") {
      const id = idOf(path[2]);
      return id === null ? notFound("Flight") : this.seats(ctx, id);
    }
    if (mine && path[2] === "saved" && path.length === 4) {
      const id = idOf(path[3]);
      if (id === null) return notFound("Hotel");
      if (request.method === "PUT") return this.save(ctx, request, id, true);
      if (request.method === "DELETE") return this.save(ctx, request, id, false);
    }
    if (mine && path[2] === "alerts" && path.length === 4 && request.method === "DELETE") {
      const id = idOf(path[3]);
      if (!request.user) return signIn();
      const mine = id === null ? [] : await this.deps.store.listTravelAlerts(this.deps.app.id, request.user.id);
      if (id === null || !mine.some((a) => a.id === id)) return notFound("Alert");
      await this.deps.store.deleteTravelAlert(this.deps.app.id, request.user.id, id);
      return { status: 204 };
    }
    if (mine && path[2] === "bookings" && path.length >= 4) {
      const id = idOf(path[3]);
      if (id === null) return notFound();
      if (request.method === "GET" && path.length === 4) return this.booking(ctx, request, id);
      if (request.method === "POST" && path.length === 5 && path[4] === "pay") return this.pay(ctx, request, id);
      if (request.method === "POST" && path.length === 5 && path[4] === "cancel") return this.cancel(ctx, request, id);
      if (request.method === "POST" && path.length === 5 && path[4] === "change") return this.change(ctx, request, id);
      if (request.method === "PUT" && path.length === 5 && path[4] === "seats") return this.changeSeats(ctx, request, id);
      if (request.method === "GET" && path.length === 5 && path[4] === "passes") return this.passes(ctx, request, id);
      if (request.method === "POST" && path.length === 5 && path[4] === "review") return this.review(ctx, request, id);
    }
    return error(404, "not_found", "Not found.");
  }

  private member(user: HostedUser | null): boolean {
    return user !== null;
  }

  private async savedOf(user: HostedUser | null): Promise<Set<number>> {
    return user ? new Set(await this.deps.store.listTravelSaved(this.deps.app.id, user.id)) : new Set();
  }

  private hotelsOff(ctx: TravelDeps): ConnectorResult | null {
    return ctx.settings.hotels ? null : error(404, "not_found", "This app has no hotels.");
  }

  private flightsOff(ctx: TravelDeps): ConnectorResult | null {
    return ctx.settings.flights ? null : error(404, "not_found", "This app has no flights.");
  }

  // Before booking

  private async explore(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    const nights = request.query.get("nights") ? Number(request.query.get("nights")) : 4;
    const from = request.query.get("from");
    if (!Number.isInteger(nights) || nights < 1 || nights > 30) return error(400, "invalid_request", "Choose from 1 to 30 nights.");
    const body = await explore(ctx, from && /^[A-Za-z]{3}$/.test(from) ? from : null, nights, this.member(request.user), await this.savedOf(request.user));
    // The person's alert that went down most.
    let alert = null;
    if (request.user && ctx.settings.flights) {
      const alerts = await this.deps.store.listTravelAlerts(this.deps.app.id, request.user.id);
      const all = await ctx.flights.flights();
      const holds = await allHolds(ctx, all);
      let best: { drop: number; json: ReturnType<typeof alertJson> } | null = null;
      for (const a of alerts.slice(0, 10)) {
        const price = await priceAlert(ctx, a, all, holds);
        const drop = price.cents !== null && a.firstCents !== null ? a.firstCents - price.cents : 0;
        if (drop > 0 && (!best || drop > best.drop)) best = { drop, json: alertJson(ctx, a, price, all) };
      }
      alert = best?.json ?? null;
    }
    return { status: 200, body: { ...body, alert } };
  }

  private async hotels(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    const off = this.hotelsOff(ctx);
    if (off) return off;
    const ask = readStayAsk(request.query, request.now);
    if (isRefusal(ask)) return refusal(ask);
    const q = request.query;
    const minScore = q.get("min_score") ? Number(q.get("min_score")) : null;
    if (minScore !== null && !(minScore >= 0 && minScore <= 10)) return error(400, "invalid_request", "The score is from 0 to 10.");
    const sort = q.get("sort");
    const body = await searchHotels(
      ctx,
      ask,
      {
        city: q.get("city")?.trim().slice(0, 80) || null,
        theme: q.get("theme")?.trim().slice(0, 40) || null,
        freeCancellation: q.get("free_cancellation") === "true",
        payAtHotel: q.get("pay_at_hotel") === "true",
        minScore,
        amenities: (q.get("amenity") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
        sort: sort === "price" || sort === "score" || sort === "stars" ? sort : "recommended",
      },
      this.member(request.user),
      await this.savedOf(request.user),
    );
    return { status: 200, body };
  }

  private async hotel(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const off = this.hotelsOff(ctx);
    if (off) return off;
    const ask = readStayAsk(request.query, request.now);
    if (isRefusal(ask)) return refusal(ask);
    const hotel = await ctx.hotels.hotel(id);
    if (!hotel || !hotel.active) return notFound("Hotel");
    return { status: 200, body: await hotelJson(ctx, hotel, ask, this.member(request.user), await this.savedOf(request.user)) };
  }

  private async flights(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    const off = this.flightsOff(ctx);
    if (off) return off;
    const ask = readFlightAsk(request.query, request.now);
    if (isRefusal(ask)) return refusal(ask);
    return { status: 200, body: await searchFlights(ctx, ask) };
  }

  private async calendar(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    const off = this.flightsOff(ctx);
    if (off) return off;
    const q = request.query;
    const from = q.get("from") ?? "";
    const to = q.get("to") ?? "";
    const month = q.get("month") ?? "";
    const nights = q.get("nights") ? Number(q.get("nights")) : null;
    const adults = q.get("adults") ? Number(q.get("adults")) : 1;
    if (!/^[A-Za-z]{3}$/.test(from) || !/^[A-Za-z]{3}$/.test(to) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return error(400, "invalid_request", "Choose the route and the month.");
    if (nights !== null && !(Number.isInteger(nights) && nights >= 1 && nights <= 60)) return error(400, "invalid_request", "Choose from 1 to 60 nights.");
    if (!(Number.isInteger(adults) && adults >= 1 && adults <= 9)) return error(400, "invalid_request", "Choose from 1 to 9 travellers.");
    return { status: 200, body: await flightCalendar(ctx, from, to, month, nights, q.get("depart"), adults) };
  }

  private async seats(ctx: TravelDeps, id: number): Promise<ConnectorResult> {
    const off = this.flightsOff(ctx);
    if (off) return off;
    const flight = await ctx.flights.flight(id);
    if (!flight || !flight.active || !flight.seatMap) return notFound("Seat map");
    return { status: 200, body: await seatMapJson(ctx, flight) };
  }

  private async quote(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    const choice = readChoice(request.body);
    if (isRefusal(choice)) return refusal(choice);
    const priced = await priceChoice(ctx, choice, this.member(request.user));
    if (isRefusal(priced)) return refusal(priced);
    return { status: 200, body: quoteJson(ctx, { ...priced.priced, payment: { ...priced.priced.payment, now: priced.priced.payment.now && this.canTakeCards } }) };
  }

  // Saved hotels

  private async saved(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ask = readStayAsk(request.query, request.now);
    if (isRefusal(ask)) return refusal(ask);
    const ids = await this.deps.store.listTravelSaved(this.deps.app.id, request.user.id);
    return { status: 200, body: { items: ctx.settings.hotels ? await hotelCards(ctx, ids, ask, true, new Set(ids)) : [] } };
  }

  private async save(ctx: TravelDeps, request: ConnectorRequest, id: number, saved: boolean): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const hotel = await ctx.hotels.hotel(id);
    if (saved && (!hotel || !hotel.active)) return notFound("Hotel");
    // Unsaving: one the person saved (even if the hotel closed since), or one of this app's.
    if (!saved && !hotel && !(await this.deps.store.listTravelSaved(this.deps.app.id, request.user.id)).includes(id)) return notFound("Hotel");
    await this.deps.store.setTravelSaved(this.deps.app.id, request.user.id, id, saved, request.now);
    return { status: 204 };
  }

  // Bookings

  private async ownBooking(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<TravelBooking | null> {
    const booking = await this.deps.store.getTravelBooking(this.deps.app.id, id);
    if (!booking || booking.userId !== request.user?.id) return null;
    return refreshBooking(ctx, booking);
  }

  private async json(ctx: TravelDeps, booking: TravelBooking, flights?: ReadonlyMap<number, TravelFlight>) {
    const map = flights ?? (await bookingFlights(ctx, [booking]));
    const review = booking.stay ? await this.deps.store.getTravelReviewOfBooking(this.deps.app.id, booking.id) : null;
    return bookingJson(ctx, booking, map, review);
  }

  private async bookings(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = Math.max(1, Number(request.query.get("page")) || 1);
    const perPage = Math.min(50, Math.max(1, Number(request.query.get("per_page")) || 20));
    const past = request.query.get("scope") === "past";
    const { items } = await this.deps.store.listTravelBookings({ appId: this.deps.app.id, userId: request.user.id, page: 1, perPage: 500 });
    const fresh: TravelBooking[] = [];
    for (const b of items) fresh.push(await refreshBooking(ctx, b));
    const flights = await bookingFlights(ctx, fresh);
    const day = today(request.now);
    const upcoming = (b: TravelBooking) => b.status !== "cancelled" && b.status !== "completed" && startsOf(b, flights).slice(0, 10) >= day;
    const ongoing = (b: TravelBooking) => b.status === "confirmed" || b.status === "awaiting_payment";
    const shown = fresh
      .filter((b) => (past ? !(upcoming(b) || ongoing(b)) : upcoming(b) || ongoing(b)))
      .sort((a, b) => (past ? startsOf(b, flights).localeCompare(startsOf(a, flights)) : startsOf(a, flights).localeCompare(startsOf(b, flights))));
    const slice = shown.slice((page - 1) * perPage, page * perPage);
    const out = [];
    for (const b of slice) out.push(await this.json(ctx, b, flights));
    return { status: 200, body: { items: out, page, per_page: perPage, total: shown.length, total_pages: Math.max(1, Math.ceil(shown.length / perPage)) } };
  }

  private async book(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const choice = readChoice(request.body);
    if (isRefusal(choice)) return refusal(choice);
    const extras = readExtras(request.body, choice);
    if (isRefusal(extras)) return refusal(extras);
    const priced = await priceChoice(ctx, choice, true);
    if (isRefusal(priced)) return refusal(priced);
    if (extras.payment === "at_hotel" && !priced.priced.payment.atHotel) return error(409, "payment_not_offered", "This stay can't be paid at the hotel. Please pay now.");
    if (extras.payment === "now" && (!ctx.settings.payNow || !this.canTakeCards)) return error(503, "payments_unavailable", "Paying in the app isn't available right now. Please try again later.");
    const made = await this.deps.store.createTravelBooking(newBooking(ctx, request.user, priced.priced, extras, newReference((n) => randomInt(n)), request.lang ?? null), priced.check, request.now);
    if (!made.ok) return error(409, "not_available", "That's no longer free. Please choose again.");
    return { status: 201, body: await this.json(ctx, made.booking) };
  }

  private async booking(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    return booking ? { status: 200, body: await this.json(ctx, booking) } : notFound();
  }

  private async pay(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    if (dueCents(booking) <= 0) return error(409, "not_payable", "This booking has nothing to pay.");
    if (!this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const link = await travelPayLink(this.deps.store, this.deps.app, booking, this.deps.platformUrl, request.now);
    return { status: 200, body: { url: link.url } };
  }

  private async cancel(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    const flights = await bookingFlights(ctx, [booking]);
    if (!canCancel(booking, flights, request.now)) return error(409, "not_cancellable", "This booking can't be cancelled anymore.");
    const r = await this.deps.store.updateTravelBooking(this.deps.app.id, id, cancelPatch(booking, "customer", null, request.now), { statuses: ["confirmed", "awaiting_payment"] }, request.now);
    if (!r.ok) return error(409, "not_cancellable", "This booking changed meanwhile. Pull to refresh.");
    return { status: 200, body: await this.json(ctx, r.booking, flights) };
  }

  private async change(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    const flights = await bookingFlights(ctx, [booking]);
    if (!canChange(booking, flights, request.now)) return error(409, "not_changeable", "This booking can't be changed anymore.");
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    let patch: Partial<TravelBooking>;
    let room = null;
    if (body.check_in !== undefined || body.check_out !== undefined) {
      if (!booking.stay) return error(400, "invalid_request", "This booking has no stay.");
      if (typeof body.check_in !== "string" || typeof body.check_out !== "string") return error(400, "invalid_request", "Choose the new check-in and check-out days.");
      const next = await changedStay(ctx, booking, body.check_in, body.check_out, true);
      if (isRefusal(next)) return refusal(next);
      patch = next.patch;
      room = next.room;
    } else if (body.leg === "out" || body.leg === "back") {
      if (!booking.flight) return error(400, "invalid_request", "This booking has no flight.");
      const flightId = typeof body.flight_id === "number" && Number.isInteger(body.flight_id) ? body.flight_id : null;
      if (flightId === null) return error(400, "invalid_request", "Choose the new flight.");
      const next = await changedLeg(ctx, booking, body.leg, flightId, true);
      if (isRefusal(next)) return refusal(next);
      patch = next.patch;
      flights.set(next.flight.id, next.flight);
    } else return error(400, "invalid_request", "Choose new dates or a new flight.");
    if (!room && booking.stay) room = await this.deps.store.getTravelRoom(this.deps.app.id, booking.stay.roomId);
    const r = await this.deps.store.updateTravelBooking(this.deps.app.id, id, patch, { statuses: ["confirmed", "awaiting_payment"], check: fitsCheck(room, flights) }, request.now);
    if (!r.ok) return error(409, r.reason === "not_available" ? "not_available" : "not_changeable", r.reason === "not_available" ? "That's no longer free. Please choose again." : "This booking changed meanwhile. Pull to refresh.");
    return { status: 200, body: await this.json(ctx, r.booking, flights) };
  }

  private async changeSeats(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    if (!booking.flight || (body.leg !== "out" && body.leg !== "back") || (body.leg === "back" && !booking.flight.inbound)) return error(400, "invalid_request", "Choose the flight.");
    const seats = Array.isArray(body.seats) ? body.seats.map((s) => (typeof s === "string" ? s.toUpperCase() : null)) : null;
    if (!seats || seats.length > booking.flight.travellers || seats.some((s) => s !== null && !/^\d{1,2}[A-K]$/.test(s))) return error(400, "invalid_request", "Choose one seat per traveller.");
    if (booking.status !== "confirmed" && booking.status !== "awaiting_payment") return error(409, "not_changeable", "This booking can't be changed anymore.");
    const part = body.leg === "out" ? booking.flight.outbound : booking.flight.inbound!;
    const flight = await ctx.flights.flight(part.flightId);
    if (!flight || wallTime(flight.departs) <= request.now.getTime()) return error(409, "not_changeable", "This flight has left.");
    const holds = (await ctx.flights.holds([flight.id], request.now)).filter((b) => b.id !== booking.id);
    const bad = seatsRefusalOf(flight, seats, holds);
    if (bad) return refusal(bad);
    const hotel = booking.stay ? await ctx.hotels.hotel(booking.stay.hotelId) : null;
    const flights = await bookingFlights(ctx, [booking]);
    const r = await this.deps.store.updateTravelBooking(this.deps.app.id, id, seatsPatch(ctx, booking, body.leg, flight, seats, true, hotel), { statuses: ["confirmed", "awaiting_payment"], check: fitsCheck(null, flights) }, request.now);
    if (!r.ok) return error(409, "not_available", "That seat was just taken. Please choose another.");
    return { status: 200, body: await this.json(ctx, r.booking, flights) };
  }

  private async passes(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    const flights = await bookingFlights(ctx, [booking]);
    if (!passesOpen(booking, flights, request.now)) return error(409, "not_open", "Boarding passes show here once check-in opens.");
    return { status: 200, body: { items: passesJson(booking, flights, this.deps.signingSecret ?? this.deps.app.id, request.now) } };
  }

  private async review(ctx: TravelDeps, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const booking = await this.ownBooking(ctx, request, id);
    if (!booking) return notFound();
    const input = readReview(request.body);
    if (isRefusal(input)) return refusal(input);
    const json = await this.json(ctx, booking);
    if (!json.stay?.can_review) return error(409, "not_reviewable", "You can review a stay after check-out, within 30 days.");
    const made = await this.deps.store.addTravelReview({
      appId: this.deps.app.id,
      hotelId: booking.stay!.hotelId,
      bookingId: booking.id,
      userId: request.user.id,
      name: request.user.name?.trim() || booking.contact.name,
      ...input,
      stayed: booking.stay!.checkIn.slice(0, 7),
      hidden: false,
      createdAt: request.now,
    });
    if (!made) return error(409, "already_reviewed", "You already reviewed this stay.");
    return { status: 200, body: await this.json(ctx, booking) };
  }

  // Alerts

  private async alerts(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const alerts = await this.deps.store.listTravelAlerts(this.deps.app.id, request.user.id);
    const all = await ctx.flights.flights();
    const holds = await allHolds(ctx, all);
    const items = [];
    for (const a of alerts) items.push(alertJson(ctx, a, await priceAlert(ctx, a, all, holds), all));
    return { status: 200, body: { items } };
  }

  private async addAlert(ctx: TravelDeps, request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const off = this.flightsOff(ctx);
    if (off) return off;
    const b = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const kind: TravelAlert["kind"] | null = b.kind === "flight" || b.kind === "trip" || b.kind === "anywhere" ? b.kind : null;
    const from = typeof b.from === "string" && /^[A-Za-z]{3}$/.test(b.from) ? b.from.toUpperCase() : null;
    const to = typeof b.to === "string" && /^[A-Za-z]{3}$/.test(b.to) ? b.to.toUpperCase() : null;
    const month = typeof b.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(b.month) ? b.month : null;
    const travellers = b.travellers === undefined ? 1 : b.travellers;
    const nights = b.nights === undefined || b.nights === null ? null : b.nights;
    const max = typeof b.max_price === "string" ? parsePrice(b.max_price) : null;
    if (!kind || !from) return error(400, "invalid_request", "Choose the route to watch.");
    if (kind !== "anywhere" && !to) return error(400, "invalid_request", "Choose where to.");
    if (kind === "anywhere" && max === null) return error(400, "invalid_request", "Choose the most you'd pay.");
    if (kind === "trip" && !ctx.settings.hotels) return error(400, "invalid_request", "This app has no hotels.");
    if (!(typeof travellers === "number" && Number.isInteger(travellers) && travellers >= 1 && travellers <= 9)) return error(400, "invalid_request", "Choose from 1 to 9 travellers.");
    if (nights !== null && !(typeof nights === "number" && Number.isInteger(nights) && nights >= 1 && nights <= 30)) return error(400, "invalid_request", "Choose from 1 to 30 nights.");
    if ((b.month !== undefined && b.month !== null && !month) || (month && month < today(request.now).slice(0, 7))) return error(400, "invalid_request", "Choose a month ahead.");
    const existing = await this.deps.store.listTravelAlerts(this.deps.app.id, request.user.id);
    if (existing.length >= TRAVEL_LIMITS.alertsPerPerson) return error(409, "too_many_alerts", `You can watch up to ${TRAVEL_LIMITS.alertsPerPerson} prices.`);
    const draft = {
      appId: this.deps.app.id,
      userId: request.user.id,
      kind,
      from,
      to: kind === "anywhere" ? null : to,
      month,
      roundTrip: b.return !== false,
      nights: nights as number | null,
      travellers,
      maxCents: kind === "anywhere" ? max : null,
      firstCents: null,
      lastCents: null,
      createdAt: request.now,
      updatedAt: request.now,
    };
    const price = await priceAlert(ctx, { ...draft, id: 0 });
    const alert = await this.deps.store.createTravelAlert({ ...draft, firstCents: price.cents, lastCents: price.cents });
    return { status: 201, body: alertJson(ctx, alert, price, await ctx.flights.flights()) };
  }
}

/** 126 After the company changed its flights: alerts priced again, and their people told of a drop. */
export async function travelPricesChanged(store: DataStore, app: App, assetUrl: (id: string) => string, platformUrl: string, now: Date): Promise<number> {
  const settings = travelSettingsOf(await store.getTravelSettings(app.id));
  const sources = sourcesFor(store, app.id, settings);
  return checkAlerts({ store, app, settings, hotels: sources.hotels, flights: sources.flights, assetUrl, platformUrl, now }, notifyDeps({ store, app, now }));
}

/** 126 The company confirmed or cancelled a booking from the dashboard: the traveller is told. */
export async function tellTraveller(store: DataStore, app: App, booking: TravelBooking, what: "confirmed" | "cancelled", now: Date): Promise<void> {
  await tellBooking(notifyDeps({ store, app, now }), booking, what).catch(() => undefined);
}
