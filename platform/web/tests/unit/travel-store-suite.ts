import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import type { DataStore } from "@/lib/data/store";
import type { App, TravelBookingInput } from "@/lib/data/types";
import { sha256Hex } from "@/lib/crypto/tokens";
import { cancelPatch, refundedPatch, settledPayment } from "@/lib/travel/bookings";
import { markTravelPaid, payTravelBooking, travelPayLink } from "@/lib/travel/payment";
import { dueCents, freeUnits } from "@/lib/travel/pricing";
import { DEFAULT_TRAVEL_SETTINGS } from "@/lib/travel/settings";
import { flightInput, hotelInput, roomInput } from "./travel-fixtures";

/**
 * 126 The travel rows in either store: settings, hotels, rooms, flights,
 * bookings with their holds (the last room and a seat go to one booking
 * only), reviews, saved hotels and alerts; a hotel's rooms, reviews and
 * saves go with it; nothing of another app is touched.
 */

const NOW = new Date("2026-11-02T08:00:00.000Z");

export function travelStoreSuite(storeOf: () => DataStore) {
  async function travelApp(): Promise<{ app: App; hotelId: number; roomId: number; flightId: number; userId: number }> {
    const store = storeOf();
    const { client } = await registerClient(store, { name: "Safra", email: `travel-${randomUUID()}@travel.test`, whatsapp: "+201000000188", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "travel"), backend: "hosted", appName: "Safra", connector: { kind: "travel" } };
    await store.createApp(app);
    const hotel = await store.createTravelHotel(hotelInput(app.id), NOW);
    const room = await store.createTravelRoom(roomInput(app.id, hotel.id, { units: 1 }), NOW);
    const flight = await store.createTravelFlight(flightInput(app.id), NOW);
    const user = await store.createHostedUser({ appId: app.id, phone: `+2010${Math.floor(Math.random() * 1e8)}`, name: "Layla", email: null, city: null, now: NOW });
    return { app, hotelId: hotel.id, roomId: room.id, flightId: flight.id, userId: user!.id };
  }

  function booking(appId: string, userId: number, roomId: number, flightId: number, patch: Partial<TravelBookingInput> = {}): TravelBookingInput {
    return {
      appId,
      userId,
      reference: `T-${randomUUID().slice(0, 6).toUpperCase()}`,
      kind: "trip",
      status: "confirmed",
      stay: { hotelId: 1, hotelName: "Nile Garden Resort", roomId, roomName: "Deluxe", rateId: "bb", rateName: "Breakfast", board: "breakfast", checkIn: "2026-11-14", checkOut: "2026-11-16", guests: 2, rooms: 1, nights: [{ date: "2026-11-14", cents: 168_00 }, { date: "2026-11-15", cents: 168_00 }], refundable: true, freeCancelUntil: "2026-11-12", taxBp: 1750 },
      flight: {
        outbound: { flightId, number: "SF 691", fareId: "standard", fareName: "Classic", cents: 150_00, seats: ["14A", null], seatCents: 0 },
        inbound: null,
        travellers: 2,
        bags: 0,
        meals: 0,
        bagCents: 0,
        mealCents: 0,
        changeable: true,
        changeFeeCents: 40_00,
        refundable: true,
        refundFeeCents: 50_00,
      },
      transfer: null,
      travellers: [
        { firstName: "Layla", lastName: "Hassan" },
        { firstName: "Omar", lastName: "Hassan" },
      ],
      contact: { name: "Layla Hassan", email: null, phone: null },
      requests: ["late_arrival"],
      note: null,
      currency: "USD",
      lines: [{ kind: "fare", count: 2, unitCents: 150_00, cents: 300_00 }],
      totalCents: 300_00,
      paymentMethod: "now",
      paymentStatus: "paid",
      paidCents: 300_00,
      refundCents: 0,
      orderId: null,
      holdUntil: null,
      cancellation: null,
      changes: [],
      lang: "en",
      sample: false,
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    };
  }

  it("keeps the settings, hotels, rooms and flights as saved, and a hotel's rooms, reviews and saves go with it", async () => {
    const store = storeOf();
    const t = await travelApp();
    await store.saveTravelSettings(t.app.id, { ...DEFAULT_TRAVEL_SETTINGS, flights: false, transfer: { cents: 48_00, note: "Driver" } }, NOW);
    expect(await store.getTravelSettings(t.app.id)).toMatchObject({ flights: false, transfer: { cents: 48_00, note: "Driver" } });
    expect(await store.getTravelHotel(t.app.id, t.hotelId)).toMatchObject({ ...hotelInput(t.app.id), id: t.hotelId });
    await store.updateTravelHotel(t.app.id, t.hotelId, { name: "Nile Lodge", position: 3, featured: false }, NOW);
    expect(await store.getTravelHotel(t.app.id, t.hotelId)).toMatchObject({ name: "Nile Lodge", position: 3, featured: false, city: "Luxor" });
    await store.updateTravelRoom(t.app.id, t.roomId, { prices: { "2026-11-15": 200_00 }, closed: ["2026-11-20"] }, NOW);
    expect((await store.listTravelRooms(t.app.id, t.hotelId))[0]).toMatchObject({ id: t.roomId, hotelId: t.hotelId, prices: { "2026-11-15": 200_00 }, closed: ["2026-11-20"], rates: roomInput(t.app.id, t.hotelId).rates });
    await store.updateTravelFlight(t.app.id, t.flightId, { status: "delayed", gate: "B12", departs: "2026-11-14T11:00" }, NOW);
    expect(await store.getTravelFlight(t.app.id, t.flightId)).toMatchObject({ status: "delayed", gate: "B12", departs: "2026-11-14T11:00", seatMap: flightInput(t.app.id).seatMap });
    expect(await store.addTravelReview({ appId: t.app.id, hotelId: t.hotelId, bookingId: 7, userId: t.userId, name: "Layla", score: 9, staff: 9, clean: null, location: null, value: null, trip: "couple", text: "Lovely", stayed: "2026-10", hidden: false, createdAt: NOW })).toMatchObject({ score: 9 });
    expect(await store.addTravelReview({ appId: t.app.id, hotelId: t.hotelId, bookingId: 7, userId: t.userId, name: "Layla", score: 5, staff: null, clean: null, location: null, value: null, trip: null, text: null, stayed: "2026-10", hidden: false, createdAt: NOW })).toBeNull();
    const [review] = await store.listTravelReviews(t.app.id, t.hotelId);
    await store.setTravelReviewHidden(t.app.id, review!.id, true);
    expect((await store.getTravelReviewOfBooking(t.app.id, 7))?.hidden).toBe(true);
    await store.setTravelSaved(t.app.id, t.userId, t.hotelId, true, NOW);
    await store.setTravelSaved(t.app.id, t.userId, t.hotelId, true, NOW);
    expect(await store.listTravelSaved(t.app.id, t.userId)).toEqual([t.hotelId]);
    await store.deleteTravelHotel(t.app.id, t.hotelId);
    expect(await store.listTravelRooms(t.app.id)).toEqual([]);
    expect(await store.listTravelReviews(t.app.id)).toEqual([]);
    expect(await store.listTravelSaved(t.app.id, t.userId)).toEqual([]);
  });

  it("books the last room and a seat once, holds unpaid ones until their hold ends, and changes a booking only from the statuses given", async () => {
    const store = storeOf();
    const t = await travelApp();
    const room = (await store.getTravelRoom(t.app.id, t.roomId))!;
    const fits = (others: { stay: unknown }[]) => (freeUnits(room, others as never, "2026-11-14", "2026-11-16") < 1 ? "not_available" : null);
    const first = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId), fits, NOW);
    expect(first.ok).toBe(true);
    const second = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId), fits, NOW);
    expect(second).toEqual({ ok: false, reason: "not_available" });
    if (!first.ok) return;
    expect(await store.getTravelBooking(t.app.id, first.booking.id)).toEqual(first.booking);
    // The holds: by the room's nights, and by the flight.
    expect((await store.listTravelHolds(t.app.id, { roomId: t.roomId, from: "2026-11-15", to: "2026-11-17" }, NOW)).map((b) => b.id)).toEqual([first.booking.id]);
    expect(await store.listTravelHolds(t.app.id, { roomId: t.roomId, from: "2026-11-16", to: "2026-11-17" }, NOW)).toEqual([]);
    expect((await store.listTravelHolds(t.app.id, { flightIds: [t.flightId] }, NOW)).map((b) => b.id)).toEqual([first.booking.id]);
    // Unpaid and past its hold: holds nothing.
    const unpaid = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId, { status: "awaiting_payment", holdUntil: new Date(NOW.getTime() + 30 * 60_000), stay: null }), () => null, NOW);
    expect((await store.listTravelHolds(t.app.id, { flightIds: [t.flightId] }, NOW)).length).toBe(2);
    expect((await store.listTravelHolds(t.app.id, { flightIds: [t.flightId] }, new Date(NOW.getTime() + 31 * 60_000))).length).toBe(1);
    // Changed from the statuses given only, and only when it still fits.
    const cancelled = await store.updateTravelBooking(t.app.id, first.booking.id, { status: "cancelled", refundCents: 250_00 }, { statuses: ["confirmed"] }, NOW);
    expect(cancelled).toMatchObject({ ok: true, booking: { status: "cancelled", refundCents: 250_00, stay: { roomId: t.roomId } } });
    expect(await store.updateTravelBooking(t.app.id, first.booking.id, { status: "confirmed" }, { statuses: ["confirmed"] }, NOW)).toEqual({ ok: false, reason: "invalid_status" });
    if (!unpaid.ok) return;
    const refused = await store.updateTravelBooking(t.app.id, unpaid.booking.id, { status: "confirmed" }, { statuses: ["awaiting_payment"], check: () => "not_available" }, NOW);
    expect(refused).toEqual({ ok: false, reason: "not_available" });
    const list = await store.listTravelBookings({ appId: t.app.id, userId: t.userId, page: 1, perPage: 1 });
    expect(list.total).toBe(2);
    expect(list.items).toHaveLength(1);
    expect((await store.listTravelBookings({ appId: t.app.id, flightId: t.flightId, statuses: ["cancelled"], page: 1, perPage: 10 })).items.map((b) => b.id)).toEqual([first.booking.id]);
    expect((await store.listTravelBookings({ appId: t.app.id, search: first.booking.reference, page: 1, perPage: 10 })).total).toBe(1);
    // Another app sees none of it.
    const other = await travelApp();
    expect((await store.listTravelBookings({ appId: other.app.id, page: 1, perPage: 10 })).total).toBe(0);
    expect(await store.getTravelBooking(other.app.id, first.booking.id)).toBeNull();
  });

  it("126.10 refunds only what is paid over the total, and a refund marked done is no longer paid (a later full cancel refunds the rest only)", async () => {
    const store = storeOf();
    const t = await travelApp();
    // 500 paid, the total lowered to 100, then raised again to 500: nothing is due back anymore.
    expect(settledPayment({ paidCents: 500_00, paymentStatus: "paid" }, 100_00)).toEqual({ refundCents: 400_00, paymentStatus: "refund_due" });
    expect(settledPayment({ paidCents: 500_00, paymentStatus: "refund_due" }, 500_00)).toEqual({ refundCents: 0, paymentStatus: "paid" });
    expect(settledPayment({ paidCents: 500_00, paymentStatus: "refund_due" }, 700_00)).toEqual({ refundCents: 0, paymentStatus: "unpaid" });
    const made = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId, { paidCents: 500_00, refundCents: 200_00, paymentStatus: "refund_due" }), () => null, NOW);
    if (!made.ok) throw new Error("not booked");
    const refunded = await store.updateTravelBooking(t.app.id, made.booking.id, refundedPatch(made.booking, NOW), { statuses: [made.booking.status] }, NOW);
    expect(refunded).toMatchObject({ ok: true, booking: { paymentStatus: "refunded", paidCents: 300_00, refundCents: 0, changes: [{ what: "Refunded 200 USD" }] } });
    if (!refunded.ok) return;
    const cancelled = await store.updateTravelBooking(t.app.id, made.booking.id, cancelPatch(refunded.booking, "company", null, NOW, "Europe/Istanbul", true), { statuses: ["confirmed"] }, NOW);
    expect(cancelled).toMatchObject({ ok: true, booking: { status: "cancelled", refundCents: 300_00, paymentStatus: "refund_due" } });
  });

  it("126.10 keeps a booking paid for less than it costs now awaiting the rest, with its hold, and confirms it once all is paid", async () => {
    const store = storeOf();
    const t = await travelApp();
    const made = await store.createTravelBooking(
      booking(t.app.id, t.userId, t.roomId, t.flightId, { status: "awaiting_payment", paymentStatus: "unpaid", paidCents: 0, holdUntil: new Date(NOW.getTime() + 30 * 60_000) }),
      () => null,
      NOW,
    );
    if (!made.ok) throw new Error("not booked");
    const first = await travelPayLink(store, t.app, made.booking, "https://yallapp.test", NOW, "test-signing");
    expect(first.order.totalCents).toBe(300_00);
    // The dates changed while the payment page was open: it costs 500 now.
    await store.updateTravelBooking(t.app.id, made.booking.id, { totalCents: 500_00, lines: [{ kind: "fare", count: 2, unitCents: 250_00, cents: 500_00 }] }, { statuses: ["awaiting_payment"] }, NOW);
    const later = new Date(NOW.getTime() + 5 * 60_000);
    const part = await payTravelBooking(store, t.app, { ...first.order, status: "processing" }, later);
    expect(part).toMatchObject({ status: "awaiting_payment", paidCents: 300_00, paymentStatus: "unpaid", refundCents: 0 });
    expect(part!.holdUntil).not.toBeNull();
    expect(dueCents(part!)).toBe(200_00);
    // Still held: nobody else gets the room meanwhile.
    expect((await store.listTravelHolds(t.app.id, { roomId: t.roomId, from: "2026-11-14", to: "2026-11-16" }, later)).map((b) => b.id)).toEqual([made.booking.id]);
    const rest = await travelPayLink(store, t.app, part!, "https://yallapp.test", later, "test-signing");
    expect(rest.order.totalCents).toBe(200_00);
    expect(await payTravelBooking(store, t.app, { ...rest.order, status: "processing" }, later)).toMatchObject({ status: "confirmed", holdUntil: null, paidCents: 500_00, paymentStatus: "paid", refundCents: 0 });
  });

  it("126.10 reuses the open pay link's order, and holds the rooms at most HOLD + PAY_LINK minutes after booking", async () => {
    const store = storeOf();
    const t = await travelApp();
    const made = await store.createTravelBooking(
      booking(t.app.id, t.userId, t.roomId, t.flightId, { status: "awaiting_payment", paymentStatus: "unpaid", paidCents: 0, holdUntil: new Date(NOW.getTime() + 30 * 60_000) }),
      () => null,
      NOW,
    );
    if (!made.ok) throw new Error("not booked");
    const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
    const pay = async (minutes: number) => travelPayLink(store, t.app, (await store.getTravelBooking(t.app.id, made.booking.id))!, "https://yallapp.test", at(minutes), "test-signing");
    const first = await pay(0);
    expect((await store.getTravelBooking(t.app.id, made.booking.id))!.holdUntil).toEqual(at(60));
    const again = await pay(10);
    expect(again.order.id).toBe(first.order.id);
    expect(again.url).toBe(first.url);
    expect(again.expiresAt).toEqual(at(60));
    await pay(59);
    const cap = at(30 + 60);
    expect((await store.getTravelBooking(t.app.id, made.booking.id))!.holdUntil).toEqual(cap);
    // The first link has expired: another order, the hold no longer.
    const third = await pay(80);
    expect(third.order.id).not.toBe(first.order.id);
    expect(third.url).not.toBe(first.url);
    expect((await store.getTravelBooking(t.app.id, made.booking.id))!).toMatchObject({ holdUntil: cap, orderId: third.order.id });
    expect(await store.getCatalogOrderByToken(sha256Hex(third.url.split("/").pop()!))).toMatchObject({ id: third.order.id });
  });

  it("126.10 marks paid a booking whose hold ended only while its room and seats are still free", async () => {
    const store = storeOf();
    const t = await travelApp();
    const expired = { status: "awaiting_payment" as const, paymentStatus: "unpaid" as const, paidCents: 0, holdUntil: new Date(NOW.getTime() - 60_000) };
    const lapsed = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId, expired), () => null, NOW);
    if (!lapsed.ok) throw new Error("not booked");
    // Someone else booked the last room meanwhile.
    const other = await store.createTravelBooking(booking(t.app.id, t.userId, t.roomId, t.flightId, { flight: null }), () => null, NOW);
    expect(other.ok).toBe(true);
    expect(await markTravelPaid(store, t.app, lapsed.booking, NOW)).toEqual({ ok: false, reason: "not_available" });
    expect((await store.getTravelBooking(t.app.id, lapsed.booking.id))!.status).toBe("awaiting_payment");
    const free = await travelApp();
    const fine = await store.createTravelBooking(booking(free.app.id, free.userId, free.roomId, free.flightId, expired), () => null, NOW);
    if (!fine.ok) throw new Error("not booked");
    expect(await markTravelPaid(store, free.app, fine.booking, NOW)).toMatchObject({ ok: true, booking: { status: "confirmed", paymentStatus: "paid", paidCents: 300_00, holdUntil: null } });
  });

  it("keeps a person's alerts and their last price", async () => {
    const store = storeOf();
    const t = await travelApp();
    const alert = await store.createTravelAlert({ appId: t.app.id, userId: t.userId, kind: "flight", from: "CAI", to: "LXR", month: "2026-11", roundTrip: true, nights: 4, travellers: 2, maxCents: null, firstCents: 240_00, lastCents: 240_00, createdAt: NOW, updatedAt: NOW });
    await store.updateTravelAlert(t.app.id, alert.id, { lastCents: 220_00, updatedAt: NOW });
    expect(await store.listTravelAlerts(t.app.id, t.userId)).toEqual([{ ...alert, lastCents: 220_00 }]);
    await store.deleteTravelAlert(t.app.id, t.userId + 1, alert.id);
    expect(await store.listTravelAlerts(t.app.id)).toHaveLength(1);
    await store.deleteTravelAlert(t.app.id, t.userId, alert.id);
    expect(await store.listTravelAlerts(t.app.id)).toEqual([]);
  });
}
