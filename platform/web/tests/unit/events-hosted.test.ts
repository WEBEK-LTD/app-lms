import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, EventInput, EventRecord, HostedUser, TicketType } from "@/lib/data/types";
import { checkIn } from "@/lib/events/check-in";
import { CODE_ALPHABET, formatTicketCode, isTicketCode, newTicketCode, normalizeTicketCode, qrPayload, readCheckIn, ticketKey } from "@/lib/events/codes";
import { csv, parseEventForm, parseEventSettings, parseTicketTypeForm } from "@/lib/events/forms";
import { eventChange, eventNoticeText, notifyTicketHolders, ticketHolders } from "@/lib/events/notify";
import { eventPageItems } from "@/lib/events/page-items";
import { HOLD_MINUTES, priceLabel } from "@/lib/events/service";
import { attendeesCsv } from "@/lib/events/attendees";
import { EventsConnector } from "@/lib/hosted/connectors/events";
import type { ConnectorResult } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { emailSignInPossible } from "@/lib/hosted/sign-in-methods";
import { itemSourcesFor } from "@/lib/pages/sources";
import { expectContract } from "./contract";
import { NOW, days, setupClient } from "./helpers";

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const HOUR = 3_600_000;

function eventInput(appId: string, overrides: Partial<EventInput>): EventInput {
  return {
    appId,
    title: "Event",
    description: "<p>Come along.</p>",
    category: "Concerts",
    imageAssetIds: ["img-1"],
    startAt: days(5),
    endAt: new Date(days(5).getTime() + 2 * HOUR),
    venueName: "Main Hall",
    venueAddress: "Moda Cd. 120",
    latitude: 40.98,
    longitude: 29.02,
    onlineUrl: null,
    organiser: "Kuzey Culture Centre",
    capacity: null,
    status: "published",
    publishedAt: NOW,
    ...overrides,
  };
}

describe("28 events and tickets on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let user: HostedUser;
  let other: HostedUser;
  let jazz: EventRecord;
  let film: EventRecord;
  let online: EventRecord;
  let standard: TicketType;
  let front: TicketType;
  let seat: TicketType;
  let masterclass: TicketType;
  let freeOnline: TicketType;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "events"),
      backend: "hosted",
      appName: "Kuzey Culture Centre",
      websiteDoneAt: NOW,
      connector: { kind: "events" },
      catalogSettings: { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: { provider: "iyzico", apiKeyEncrypted: "x", secretKeyEncrypted: "y", sandbox: true } },
    };
    await store.createApp(app);
    user = (await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Mona Aziz", email: null, city: null, now: NOW }))!;
    other = (await store.createHostedUser({ appId: app.id, phone: "+905321234568", name: "Deniz", email: null, city: null, now: NOW }))!;
    jazz = await store.createEvent(eventInput(app.id, { title: "Autumn Jazz Night", capacity: 3 }), NOW);
    film = await store.createEvent(eventInput(app.id, { title: "Film Club", category: "Film", startAt: days(2), endAt: new Date(days(2).getTime() + HOUR), description: "Free <b>films</b>." }), NOW);
    online = await store.createEvent(
      eventInput(app.id, { title: "Online masterclass", category: "Talks", venueName: null, venueAddress: null, latitude: null, longitude: null, onlineUrl: "https://meet.test/room", startAt: days(9), endAt: new Date(days(9).getTime() + HOUR) }),
      NOW,
    );
    await store.createEvent(eventInput(app.id, { title: "Secret draft", status: "draft", publishedAt: null }), NOW);
    await store.createEvent(eventInput(app.id, { title: "Last week", startAt: days(-7), endAt: new Date(days(-7).getTime() + HOUR) }), NOW);
    const type = (eventId: number, name: string, priceCents: number, capacity: number | null, maxPerOrder = 4) =>
      store.createTicketType({ appId: app.id, eventId, name, priceCents, capacity, saleEndsAt: null, maxPerOrder, position: 0 }, NOW);
    standard = await type(jazz.id, "Standard", 35000, null);
    front = await type(jazz.id, "Front rows", 55000, 1);
    seat = await type(film.id, "Free seat", 0, 10);
    masterclass = await type(online.id, "Online place", 15000, null, 1);
    freeOnline = await type(online.id, "Listener", 0, null, 1);
  });

  const connector = (overrides: Partial<ConstructorParameters<typeof EventsConnector>[0]> = {}) =>
    new EventsConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", signingSecret: SECRET, ...overrides });

  async function call(
    method: string,
    route: string,
    options: { params?: string[]; query?: Record<string, string>; body?: unknown; as?: HostedUser | null; now?: Date; with?: EventsConnector } = {},
  ): Promise<ConnectorResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await (options.with ?? connector()).handle({
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      user: options.as === undefined ? user : options.as,
      now: options.now ?? NOW,
    });
    expect(result, `${method} ${concrete}`).not.toBeNull();
    expectContract(method, route, result!);
    return result!;
  }

  const register = (event: EventRecord, type: TicketType, quantity = 1, extra: Record<string, unknown> = {}, as: HostedUser = user) =>
    call("POST", "/events/{event_id}/register", { params: [String(event.id)], body: { ticket_type_id: type.id, quantity, ...extra }, as });

  it("sends Config.events through the hosted API's /config", async () => {
    const context: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      connector: connector(),
    };
    const config = await handleHosted(context, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1.0.0" }), body: null, token: null });
    expectContract("GET", "/config", config);
    expect((config.body as { events: unknown }).events).toEqual({ show_map: true, allow_cancel_hours: 24, time_zone: "Europe/Istanbul", currency: "TRY" });
    // Accounts are the app's own: email sign-in works, and pages list events, never blog posts.
    expect(emailSignInPossible(app)).toBe(true);
    expect(itemSourcesFor(app)).toEqual(["events"]);
  });

  it("lists upcoming published events with filters; drafts and past events never show", async () => {
    const titles = (r: ConnectorResult) => (r.body as { items: { title: string }[] }).items.map((e) => e.title);
    expect(titles(await call("GET", "/events", { as: null }))).toEqual(["Film Club", "Autumn Jazz Night", "Online masterclass"]);
    expect(titles(await call("GET", "/events", { query: { category: "film" } }))).toEqual(["Film Club"]);
    expect(titles(await call("GET", "/events", { query: { search: "MASTERCLASS" } }))).toEqual(["Online masterclass"]);
    expect(titles(await call("GET", "/events", { query: { search: "films" } }))).toEqual(["Film Club"]);
    const day = (d: Date) => d.toISOString().slice(0, 10);
    expect(titles(await call("GET", "/events", { query: { from: day(days(4)), to: day(days(6)) } }))).toEqual(["Autumn Jazz Night"]);
    expect(titles(await call("GET", "/events", { query: { from: day(days(-8)), to: day(days(-6)) } }))).toEqual(["Last week"]);
    expect((await call("GET", "/events", { query: { from: "tomorrow" } })).status).toBe(400);
    const filters = await call("GET", "/events/filters");
    expect(filters.body).toEqual({
      categories: [
        { id: "concerts", name: "Concerts", count: 1 },
        { id: "film", name: "Film", count: 1 },
        { id: "talks", name: "Talks", count: 1 },
      ],
      first_date: day(days(2)),
      last_date: day(days(9)),
    });
    const summary = (await call("GET", "/events")).body as { items: { title: string; price_label: string; spots_left: number | null; venue: unknown }[] };
    expect(summary.items.map((e) => [e.title, e.price_label, e.spots_left])).toEqual([
      ["Film Club", "Free", 10],
      ["Autumn Jazz Night", "From ₺350.00", 3],
      ["Online masterclass", "Free · from ₺150.00", null],
    ]);
    expect(summary.items[2]!.venue).toBeNull();
    // The organiser's clock (Istanbul is UTC+3): NOW is 10:00 UTC.
    expect((summary.items[0] as unknown as { starts_local: string }).starts_local).toBe(`${days(2).toISOString().slice(0, 10)}T13:00`);
  });

  // 43 (38.20) The price label in the language the app asks in, as the cards on its pages.
  it("writes the price label in Arabic and Turkish", async () => {
    const list = async (lang: string) => {
      const result = await connector().handle({ method: "GET", path: ["events"], query: new URLSearchParams(), body: undefined, user, now: NOW, lang });
      return (result!.body as { items: { price_label: string }[] }).items.map((e) => e.price_label);
    };
    expect(await list("tr")).toEqual(["Ücretsiz", "₺350.00 ve üzeri", "Ücretsiz · ₺150.00 ve üzeri"]);
    expect(await list("ar")).toEqual(["مجاني", "ابتداءً من ⁦₺350.00⁩", "مجاني · ابتداءً من ⁦₺150.00⁩"]);
    expect(await list("fr")).toEqual(["Free", "From ₺350.00", "Free · from ₺150.00"]);
  });

  it("serves an event with what each ticket's button does on each platform", async () => {
    const actions = async (event: EventRecord, platform: string, with_?: EventsConnector) => {
      const body = (await call("GET", "/events/{event_id}", { params: [String(event.id)], query: { platform }, with: with_ })).body as {
        ticket_types: { name: string; action: string }[];
      };
      return Object.fromEntries(body.ticket_types.map((t) => [t.name, t.action]));
    };
    // A ticket to an event at a venue is a physical-world service: sold on both platforms.
    expect(await actions(jazz, "android")).toEqual({ Standard: "checkout", "Front rows": "checkout" });
    expect(await actions(jazz, "ios")).toEqual({ Standard: "checkout", "Front rows": "checkout" });
    // An online-only event is digital content: no buy button on iOS; free tickets work everywhere.
    expect(await actions(online, "android")).toEqual({ "Online place": "checkout", Listener: "register" });
    expect(await actions(online, "ios")).toEqual({ "Online place": "none", Listener: "register" });
    // Without card payments (or without them in the plan) paid tickets have no button anywhere.
    expect(await actions(jazz, "android", connector({ cardPayments: false }))).toEqual({ Standard: "none", "Front rows": "none" });
    expect(await actions(film, "ios")).toEqual({ "Free seat": "register" });

    const detail = (await call("GET", "/events/{event_id}", { params: [String(film.id)], query: { platform: "android" } })).body as Record<string, unknown>;
    expect(detail).toMatchObject({ render_mode: "native", html: "<p>Free <b>films</b>.</p>", images: [{ url: ASSETS("img-1") }], organiser: "Kuzey Culture Centre", my_tickets: 0 });
    expect((await call("GET", "/events/{event_id}", { params: ["999"], query: { platform: "ios" } })).status).toBe(404);
    const drafts = (await store.listEvents(app.id)).filter((e) => e.status === "draft");
    expect((await call("GET", "/events/{event_id}", { params: [String(drafts[0]!.id)], query: { platform: "ios" } })).status).toBe(404);
  });

  it("shows the online link to ticket holders only", async () => {
    const link = async (as: HostedUser | null) =>
      ((await call("GET", "/events/{event_id}", { params: [String(online.id)], query: { platform: "ios" }, as })).body as { online_url: string | null; my_tickets: number });
    expect(await link(null)).toMatchObject({ online_url: null, my_tickets: 0 });
    expect(await link(user)).toMatchObject({ online_url: null });
    expect((await register(online, freeOnline)).status).toBe(201);
    expect(await link(user)).toMatchObject({ online_url: "https://meet.test/room", my_tickets: 1 });
    expect(await link(other)).toMatchObject({ online_url: null });
  });

  it("gives free tickets with names, codes and signed QR payloads", async () => {
    const result = await register(film, seat, 2, { attendee_names: ["  Mona   Aziz ", ""] });
    expect(result.status).toBe(201);
    const tickets = (result.body as { tickets: { code: string; qr_payload: string; holder_name: string; status: string; can_cancel: boolean; event: { title: string } }[] }).tickets;
    expect(tickets.map((t) => [t.holder_name, t.status, t.event.title, t.can_cancel])).toEqual([
      ["Mona Aziz", "valid", "Film Club", true],
      ["Mona Aziz", "valid", "Film Club", true],
    ]);
    expect(tickets[0]!.code).not.toBe(tickets[1]!.code);
    for (const t of tickets) {
      expect(isTicketCode(t.code)).toBe(true);
      expect(t.qr_payload).toBe(qrPayload(ticketKey(SECRET, app.id), app.id, t.code));
    }
    const mine = await call("GET", "/me/tickets");
    expect((mine.body as { items: unknown[] }).items).toHaveLength(2);
    expect((await call("GET", "/me/tickets", { as: null })).status).toBe(401);
    // The rules of an order.
    expect((await register(film, seat, 5)).status).toBe(400);
    expect((await register(film, seat, 0)).status).toBe(400);
    expect((await register(film, seat, 1, { attendee_names: ["a", "b"] })).status).toBe(400);
    expect((await register(jazz, standard)).body).toMatchObject({ code: "purchase_required" });
    expect((await register(film, standard)).status).toBe(404);
    expect((await call("POST", "/events/{event_id}/register", { params: [String(film.id)], body: { ticket_type_id: seat.id, quantity: 1 }, as: null })).status).toBe(401);
  });

  it("never gives the same place twice, however many ask at once", async () => {
    // Ten places, forty people at the same moment, one or two tickets each.
    const people = await Promise.all(
      Array.from({ length: 40 }, (_, i) => store.createHostedUser({ appId: app.id, phone: `+90532100${String(i).padStart(4, "0")}`, name: `Guest ${i}`, email: null, city: null, now: NOW })),
    );
    const results = await Promise.all(people.map((p, i) => register(film, seat, 1 + (i % 2), {}, p!)));
    const won = results.filter((r) => r.status === 201).flatMap((r) => (r.body as { tickets: unknown[] }).tickets);
    const lost = results.filter((r) => r.status === 409);
    expect(won.length).toBeLessThanOrEqual(10);
    expect(won.length).toBeGreaterThanOrEqual(9);
    expect(lost.length + results.filter((r) => r.status === 201).length).toBe(40);
    expect(lost.every((r) => (r.body as { code: string }).code === "sold_out")).toBe(true);
    const held = (await store.listTickets({ appId: app.id, eventId: film.id })).filter((t) => t.status === "valid");
    expect(held).toHaveLength(won.length);
    expect(new Set(held.map((t) => t.code)).size).toBe(held.length);

    // The store's own claim, straight: the event's total limit across ticket types too.
    const claims = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        store.claimTickets({
          appId: app.id,
          eventId: jazz.id,
          ticketTypeId: i % 3 === 0 ? front.id : standard.id,
          userId: user.id,
          orderId: null,
          tickets: [{ code: newTicketCode(), holderName: "X" }],
          priceCents: 0,
          status: "valid",
          holdUntil: null,
          now: NOW,
        }),
      ),
    );
    expect(claims.filter((c) => c.ok)).toHaveLength(3);
    const jazzTickets = await store.listTickets({ appId: app.id, eventId: jazz.id });
    expect(jazzTickets).toHaveLength(3);
    expect(jazzTickets.filter((t) => t.ticketTypeId === front.id).length).toBeLessThanOrEqual(1);
  });

  it("sells paid tickets on the payment page and issues them only once the payment is confirmed", async () => {
    const link = await call("POST", "/events/checkout-link", { query: { platform: "ios" }, body: { event_id: jazz.id, ticket_type_id: standard.id, quantity: 2, attendee_names: ["Mona", "Ali"] } });
    expect(link.status).toBe(200);
    expect((link.body as { url: string; open_in: string }).url).toMatch(/^https:\/\/yallapp\.test\/pay\/[\w-]+$/);
    const { items } = await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 5 });
    const order = items[0]!;
    expect(order).toMatchObject({ status: "pending", userId: user.id, totalCents: 70000, currency: "TRY" });
    expect(order.lines).toEqual([{ productId: standard.id, name: "Autumn Jazz Night: Standard", quantity: 2, unitCents: 35000, imageAssetId: "img-1", digital: true }]);
    // The places are held while they pay, but there are no tickets yet.
    expect(((await call("GET", "/events/{event_id}", { params: [String(jazz.id)], query: { platform: "ios" } })).body as { spots_left: number }).spots_left).toBe(1);
    expect((await call("GET", "/me/tickets")).body).toEqual({ items: [] });
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { event_id: jazz.id, ticket_type_id: standard.id, quantity: 2 } })).body).toMatchObject({ code: "sold_out" });

    // Paid: the held places become tickets, and the order is done.
    await deliverPaidOrder(store, app, order, NOW);
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "completed" });
    const tickets = (await call("GET", "/me/tickets")).body as { items: { holder_name: string; status: string; price: { formatted: string }; can_cancel: boolean }[] };
    expect(tickets.items.map((t) => [t.holder_name, t.status, t.price.formatted, t.can_cancel])).toEqual([
      ["Mona", "valid", "₺350.00", false],
      ["Ali", "valid", "₺350.00", false],
    ]);

    // An order that's never paid lets its place go once the hold ends.
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { event_id: jazz.id, ticket_type_id: front.id, quantity: 1 } })).status).toBe(200);
    const later = new Date(NOW.getTime() + (HOLD_MINUTES + 1) * 60_000);
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { event_id: jazz.id, ticket_type_id: front.id, quantity: 1 } })).body).toMatchObject({ code: "sold_out" });
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { event_id: jazz.id, ticket_type_id: front.id, quantity: 1 }, now: later })).status).toBe(200);
  });

  it("refuses paid tickets to online-only events on iOS, and without card payments", async () => {
    const body = { event_id: online.id, ticket_type_id: masterclass.id, quantity: 1 };
    expect((await call("POST", "/events/checkout-link", { query: { platform: "ios" }, body })).body).toMatchObject({ code: "purchase_not_allowed" });
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body })).status).toBe(200);
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { ...body, event_id: jazz.id, ticket_type_id: standard.id }, with: connector({ cardPayments: false }) })).body).toMatchObject({
      code: "purchase_not_allowed",
    });
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body: { event_id: film.id, ticket_type_id: seat.id, quantity: 1 } })).status).toBe(403);
    expect((await call("POST", "/events/checkout-link", { query: { platform: "android" }, body, as: null })).status).toBe(401);
    // No order is left behind for the refused ones.
    expect((await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 10 })).total).toBe(1);
  });

  it("ends sales at the start or the sale end, and for a cancelled event", async () => {
    await store.updateTicketType(app.id, seat.id, { saleEndsAt: days(1) });
    expect((await call("POST", "/events/{event_id}/register", { params: [String(film.id)], body: { ticket_type_id: seat.id, quantity: 1 }, now: days(1.5) })).body).toMatchObject({ code: "sales_ended" });
    expect((await call("POST", "/events/{event_id}/register", { params: [String(online.id)], body: { ticket_type_id: freeOnline.id, quantity: 1 }, now: days(9.01) })).body).toMatchObject({ code: "sales_ended" });
    await store.updateEvent(app.id, online.id, { status: "cancelled" }, NOW);
    expect((await register(online, freeOnline)).body).toMatchObject({ code: "event_cancelled" });
    const cancelled = (await call("GET", "/events")).body as { items: { title: string; status: string }[] };
    expect(cancelled.items.find((e) => e.title === "Online masterclass")?.status).toBe("cancelled");
  });

  it("lets people cancel free tickets until the organiser's limit; the place goes back", async () => {
    const [ticket] = (((await register(film, seat)).body as { tickets: { code: string }[] }).tickets);
    const cancel = (code: string, now = NOW, as: HostedUser = user) => call("POST", "/me/tickets/{ticket_code}/cancel", { params: [code], now, as });
    expect((await cancel(ticket!.code, NOW, other)).status).toBe(404);
    // The film starts in two days: too late within 24 hours of it.
    expect((await cancel(ticket!.code, new Date(days(2).getTime() - 23 * HOUR))).body).toMatchObject({ code: "cancel_not_allowed" });
    const done = await cancel(ticket!.code);
    expect(done.body).toMatchObject({ status: "cancelled", can_cancel: false, code: ticket!.code });
    expect((await cancel(ticket!.code)).status).toBe(409);
    expect(((await call("GET", "/events/{event_id}", { params: [String(film.id)], query: { platform: "android" } })).body as { spots_left: number }).spots_left).toBe(10);
    // The organiser can turn cancelling off.
    await store.saveEventSettings(app.id, { currency: "TRY", timeZone: "Europe/Istanbul", showMap: true, allowCancelHours: null }, NOW);
    const [second] = (((await register(film, seat)).body as { tickets: { code: string; can_cancel: boolean }[] }).tickets);
    expect(second!.can_cancel).toBe(false);
    expect((await cancel(second!.code)).body).toMatchObject({ code: "cancel_not_allowed" });
  });

  it("checks tickets in once, refuses forged QR codes and tickets of other events", async () => {
    const [ticket] = (((await register(film, seat)).body as { tickets: { code: string; qr_payload: string }[] }).tickets);
    const key = ticketKey(SECRET, app.id);
    const scan = (scanned: string, eventId: number | null = film.id, now = NOW) => checkIn({ store, app, key, scanned, eventId, now });
    expect((await scan(ticket!.qr_payload, jazz.id)).outcome).toBe("other_event");
    const first = await scan(ticket!.qr_payload);
    expect(first).toMatchObject({ outcome: "admitted", ticket: { holderName: "Mona Aziz", typeName: "Free seat", eventTitle: "Film Club" } });
    const again = await scan(formatTicketCode(ticket!.code).toLowerCase(), null, new Date(NOW.getTime() + 60_000));
    expect(again.outcome).toBe("used");
    expect(again.ticket?.usedAt?.toISOString()).toBe(NOW.toISOString());
    // A QR code with a made-up signature, or signed for another app, never gets in.
    expect((await scan(`YT1.${ticket!.code}.AAAAAAAAAAAAAAAAAAAAAA`)).outcome).toBe("forged");
    expect((await scan(qrPayload(ticketKey(SECRET, "another-app"), "another-app", ticket!.code))).outcome).toBe("forged");
    expect((await scan("hello")).outcome).toBe("not_a_code");
    expect((await scan(newTicketCode())).outcome).toBe("not_found");
    // Two phones scanning one ticket at once let it in once.
    const [next] = (((await register(film, seat)).body as { tickets: { qr_payload: string }[] }).tickets);
    const both = await Promise.all([scan(next!.qr_payload), scan(next!.qr_payload)]);
    expect(both.map((b) => b.outcome).sort()).toEqual(["admitted", "used"]);
    const mine = (await call("GET", "/me/tickets")).body as { items: { status: string; used_at: string | null }[] };
    expect(mine.items.map((t) => t.status)).toEqual(["used", "used"]);
  });

  it("tells ticket holders when their event changes or is cancelled", async () => {
    await register(online, freeOnline);
    await register(online, freeOnline, 1, {}, other);
    await store.createHostedDevice({
      id: "d1",
      appId: app.id,
      userId: user.id,
      deviceId: "install-1",
      platform: "android",
      name: "Pixel",
      appVersion: "1.0.0",
      pushToken: "fcm-1",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    const moved = { ...online, startAt: days(10), endAt: new Date(days(10).getTime() + HOUR) };
    expect(eventChange(online, moved)).toBe("time");
    expect(eventChange(online, { ...online, onlineUrl: "https://meet.test/new" })).toBe("link");
    expect(eventChange(online, { ...online, title: "Renamed" })).toBeNull();
    const pushed: { tokens: unknown[]; data: Record<string, string> }[] = [];
    const holders = await ticketHolders(store, app, online.id);
    expect(holders.sort()).toEqual([user.id, other.id].sort());
    const result = await notifyTicketHolders({
      store,
      app,
      event: moved,
      userIds: holders,
      ...eventNoticeText(moved, "time", "Europe/Istanbul"),
      account: { project_id: "p", client_email: "push@p.iam", private_key: "k" },
      now: NOW,
      send: async (_account, tokens, message) => {
        pushed.push({ tokens, data: message.data ?? {} });
        return { sent: tokens.length, invalidTokens: [] };
      },
    });
    expect(result).toEqual({ notified: 2, pushed: 1 });
    expect(pushed).toEqual([{ tokens: ["fcm-1"], data: { type: "event", event_id: String(online.id) } }]);
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: user.id, since: days(-1), page: 1, perPage: 10 });
    expect(inbox.items[0]).toMatchObject({ title: "Changed: Online masterclass", eventId: online.id });
    expect(inbox.items[0]!.body).toContain("Your ticket still works");
    expect(eventNoticeText(online, "cancelled", "Europe/Istanbul").title).toBe("Cancelled: Online masterclass");
    // Cancelling the event cancels its tickets.
    expect(await store.cancelTickets(app.id, { eventId: online.id }, NOW)).toBe(2);
    expect((await store.listTickets({ appId: app.id, eventId: online.id })).every((t) => t.status === "cancelled")).toBe(true);
  });

  it("fills page list blocks with upcoming events, and exports attendees", async () => {
    await register(film, seat, 2, { attendee_names: ["=SUM(A1)", "Ali, Jr"] });
    const items = await eventPageItems(app.id, { limit: 10 }, { store, assetUrl: ASSETS, now: NOW });
    expect(items.map((i) => [i.title, i.price_label, i.badge])).toEqual([
      ["Film Club", "Free", "8 left"],
      ["Autumn Jazz Night", "From ₺350.00", "3 left"],
      ["Online masterclass", "Free · from ₺150.00", null],
    ]);
    expect(items[0]!.subtitle).toMatch(/^\w{3} \d{1,2} \w{3}, \d{2}:\d{2} · Main Hall$/);
    expect(items[0]!.action).toEqual({ type: "item", item: { source: "events", id: String(film.id) } });
    expect(await eventPageItems(app.id, { limit: 10, category_id: "talks" }, { store, assetUrl: ASSETS, now: NOW })).toHaveLength(1);
    const file = await attendeesCsv(store, app, film);
    const lines = file.trim().split("\r\n");
    expect(lines[0]).toBe("Ticket code,Name on ticket,Ticket type,Price,Status,Got by,Phone or email,Order,Got on,Checked in at");
    // A cell that looks like a formula is never run by a spreadsheet; commas are quoted.
    expect(lines[1]).toContain(",'=SUM(A1),Free seat,Free,Valid,Mona Aziz,'+905321234567,,");
    expect(lines[2]).toContain(',"Ali, Jr",');
  });
});

describe("28 ticket codes and dashboard forms", () => {
  it("makes random codes from 32 characters that can't be confused", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => newTicketCode()));
    expect(codes.size).toBe(2000);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(formatTicketCode("K7QM4XP2HD9W")).toBe("K7QM-4XP2-HD9W");
    expect(normalizeTicketCode(" k7qm-4xp2 hd9w ")).toBe("K7QM4XP2HD9W");
    expect(normalizeTicketCode("K7QM4XP2HD90")).toBeNull();
    const key = ticketKey("secret-a-0123456789abcdef0123456789", "app-1");
    expect(key).not.toBe(ticketKey("secret-a-0123456789abcdef0123456789", "app-2"));
    expect(readCheckIn(key, "app-1", qrPayload(key, "app-1", "K7QM4XP2HD9W"))).toEqual({ code: "K7QM4XP2HD9W" });
    expect(readCheckIn(key, "app-2", qrPayload(key, "app-1", "K7QM4XP2HD9W"))).toEqual({ error: "bad_signature" });
  });

  it("checks the event, ticket type and settings forms", () => {
    const ok = parseEventForm(
      { title: " Jazz ", description: "Music.", startAt: "2026-11-01T20:30", endAt: "2026-11-01T22:30", venueName: "Main Hall", latitude: "40,98", longitude: "29.02", capacity: "1,000" },
      "Europe/Istanbul",
    );
    expect(ok).toMatchObject({ ok: true, value: { title: "Jazz", startAt: new Date("2026-11-01T17:30:00Z"), latitude: 40.98, capacity: 1000, onlineUrl: null } });
    const bad = parseEventForm({ title: "", description: "", startAt: "2026-11-01T20:30", endAt: "2026-11-01T19:00", onlineUrl: "http://meet.test" }, "Europe/Istanbul");
    expect(bad).toEqual({
      ok: false,
      errors: { title: "Enter a title.", description: "Describe the event.", endAt: "It must end after it starts.", onlineUrl: "Paste the full https:// link to join." },
    });
    expect(parseEventForm({ title: "T", description: "x", startAt: "2026-11-01T20:30", endAt: "2026-11-01T21:30" }, "UTC")).toEqual({
      ok: false,
      errors: { venueName: "Give the venue, or an online link for an online event." },
    });
    expect(parseEventForm({ title: "Talk", description: "x", startAt: "2026-11-01T20:30", endAt: "2026-11-01T21:30", onlineUrl: "https://meet.test/x" }, "UTC")).toMatchObject({
      ok: true,
      value: { venueName: null, onlineUrl: "https://meet.test/x" },
    });
    expect(parseTicketTypeForm({ name: "Standard", price: "350", capacity: "", maxPerOrder: "4" }, "UTC")).toEqual({
      ok: true,
      value: { name: "Standard", priceCents: 35000, capacity: null, saleEndsAt: null, maxPerOrder: 4 },
    });
    expect(parseTicketTypeForm({ name: "Free", price: "" }, "UTC")).toMatchObject({ ok: true, value: { priceCents: 0, maxPerOrder: 10 } });
    expect(parseTicketTypeForm({ name: "", price: "0.5", maxPerOrder: "50" }, "UTC")).toMatchObject({ ok: false, errors: { name: expect.any(String), price: expect.any(String), maxPerOrder: expect.any(String) } });
    expect(parseEventSettings({ currency: "EUR", timeZone: "Europe/Berlin", showMap: "on", allowCancel: "on", allowCancelHours: "48" })).toEqual({
      ok: true,
      value: { currency: "EUR", timeZone: "Europe/Berlin", showMap: true, allowCancelHours: 48 },
    });
    expect(parseEventSettings({ currency: "GBP", timeZone: "Mars/Base" })).toMatchObject({ ok: false });
    expect(parseEventSettings({ currency: "TRY", timeZone: "UTC" })).toMatchObject({ ok: true, value: { showMap: false, allowCancelHours: null } });
    expect(csv([["a", "b,c", '"q"', "+1", null, 3]])).toBe('a,"b,c","""q""",\'+1,,3\r\n');
    expect(priceLabel([], "TRY")).toBeNull();
  });
});
