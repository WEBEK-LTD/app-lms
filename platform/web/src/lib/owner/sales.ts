import { formatDate } from "@/i18n/format";
import { addDays, dayOf, isDay } from "../analytics/days";
import { refreshAnalytics } from "../analytics/aggregate";
import { appZone } from "../analytics/zone";
import { appAreas, type AppAreas } from "../app/areas";
import { changeAppointmentStatus, nextAppointmentStatuses } from "../bookings/appointments";
import { canReschedule, rescheduleAppointment, rescheduleTimes } from "../bookings/reschedule";
import { BOOKING_STATUS_LABELS, bookingSetup } from "../bookings/setup";
import { localToUtc, utcToLocal } from "../bookings/time";
import { FULFILMENT_LABELS } from "../catalog/fulfilment";
import { formatCents } from "../catalog/money";
import { changeOrderStatus, nextOrderStatuses } from "../catalog/order-status";
import { ORDER_STATUS_LABELS, orderNumber } from "../catalog/settings";
import type { App, BookingAppointment, CatalogCurrency, CatalogOrder, CatalogOrderStatus, Donation, License } from "../data/types";
import { checkIn, type CheckInAnswer } from "../events/check-in";
import { ticketKey } from "../events/codes";
import { eventSettingsOf } from "../events/service";
import { serviceAccountOf } from "../hosted/notify";
import { REFUND_REASONS } from "../payments/refund";
import { orderRefundOptions, readRefundForm, refundOrder, type RefundDeps } from "../refunds/service";
import type { AccountState } from "../license/status";
import { appStateOf, requireActive } from "./account";
import { bodyObject, intParam, invalid, iso, notAvailable, notFound, OwnerError, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";

/**
 * 58 One app of the signed-in client, and what sells or books in it:
 * today's numbers, orders and refunds, appointments, events and check-in,
 * donations. Each answers only for the client's own apps, and only for what
 * the app has (lib/app/areas.ts, as the dashboard's menu).
 */

export interface AppScope {
  app: App;
  license: License | null;
  state: AccountState;
  areas: AppAreas;
}

/** The client's own app, or 404; with `area`, one the app has, or 404 `not_available`. */
export function appScope(ctx: OwnerContext, appId: string | undefined, area?: keyof AppAreas): AppScope {
  requireActive(ctx);
  const app = ctx.apps.find((a) => a.id === appId);
  if (!app) throw notFound();
  const areas = appAreas(app);
  if (area && !areas[area]) throw notAvailable();
  return { app, license: ctx.licenses.find((l) => l.appId === app.id) ?? null, state: appStateOf(ctx, app), areas };
}

export function money(cents: number, currency: string) {
  return { amount_cents: cents, currency, formatted: formatCents(cents, currency as CatalogCurrency) };
}

function addTo(totals: Map<string, number>, currency: string, cents: number) {
  totals.set(currency, (totals.get(currency) ?? 0) + cents);
}

const totalsJson = (totals: Map<string, number>) => [...totals].map(([currency, cents]) => money(cents, currency));

/** The app's day: its date and the instants it starts and ends, in the zone Analytics uses. */
async function todayOf(ctx: OwnerContext, app: App) {
  const zone = await appZone(ctx.deps.store, app);
  const date = dayOf(ctx.deps.now, zone);
  return { zone, date, start: localToUtc(date, "00:00", zone), end: localToUtc(addDays(date, 1), "00:00", zone) };
}

const PAID: CatalogOrderStatus[] = ["processing", "completed", "cancelled", "refunded"];

/** `GET /apps/{app_id}/today`. */
export async function today(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, areas } = appScope(ctx, params.app_id);
  const { store, now } = ctx.deps;
  const day = await todayOf(ctx, app);
  const counts: Record<string, number | null> = {};
  const sales = new Map<string, number>();
  const given = new Map<string, number>();
  const needs: { kind: string; count: number; title: string; notice_id: number | null }[] = [];

  // 61 Counted and summed by the database for the whole day, however busy.
  if (areas.orders) {
    const paid = await store.sumPaidCatalogOrders(app.id, day.start, day.end);
    for (const total of paid.totals) addTo(sales, total.currency, total.cents);
    counts.orders = paid.count;
    const waiting = (await store.listCatalogOrders({ appId: app.id, statuses: ["processing"], offset: 0, limit: 1 })).total;
    if (waiting) needs.push({ kind: "orders_in_progress", count: waiting, title: ctx.t("owner.needs.ordersInProgress", { count: waiting }), notice_id: null });
  }
  if (areas.appointments) {
    counts.appointments = (await store.listBookingAppointments({ appId: app.id, statuses: ["pending", "approved"], startFrom: day.start, startBefore: day.end, offset: 0, limit: 1 })).total;
    const pending = (await store.listBookingAppointments({ appId: app.id, statuses: ["pending"], scope: { kind: "upcoming", now }, offset: 0, limit: 1 })).total;
    if (pending) needs.push({ kind: "appointments_to_confirm", count: pending, title: ctx.t("owner.needs.toConfirm", { count: pending }), notice_id: null });
  }
  if (areas.events) {
    const tickets = await store.countTicketsInWindow(app.id, day.start, day.end);
    counts.tickets = tickets.issued;
    counts.check_ins = tickets.checkedIn;
  }
  if (areas.donations) {
    const paid = await store.sumPaidDonations(app.id, day.start, day.end);
    for (const total of paid.totals) addTo(given, total.currency, total.cents);
    counts.donations = paid.count;
  }
  if (areas.inquiries) {
    const unread = await store.countUnreadListingInquiries(app.id);
    if (unread) needs.push({ kind: "unanswered_messages", count: unread, title: ctx.t("owner.needs.unanswered", { count: unread }), notice_id: null });
  }
  if (areas.appUsers) counts.new_users = await store.countHostedUsersCreated(app.id, day.start, day.end);
  // 44 Opens today, from the app's own usage statistics (counted at read, like Analytics).
  await refreshAnalytics(store, app.id, now, [], day.zone);
  const sessions = await store.listAnalyticsDaily(app.id, day.date, day.date, ["sessions"]);
  counts.app_opens = sessions.reduce((sum, row) => sum + row.value, 0);
  // The owner notices still open on the dashboard's overview for this app.
  for (const notice of await store.listOwnerNotices({ clientId: ctx.client.id, appId: app.id, open: true, limit: 10 })) {
    needs.push({ kind: "notice", count: 1, title: ctx.k(notice.title), notice_id: notice.id });
  }
  return { status: 200, body: { date: day.date, time_zone: day.zone, sales: totalsJson(sales), donations: totalsJson(given), counts, needs_you: needs } };
}

// Orders

function orderJson(ctx: OwnerContext, order: CatalogOrder) {
  const step = order.fulfilment ? (order.fulfilmentStatus ?? null) : null;
  return {
    id: order.id,
    number: orderNumber(order),
    status: order.status,
    status_label: ctx.k(ORDER_STATUS_LABELS[order.status]),
    kitchen: order.fulfilment && step ? { type: order.fulfilment.type, step, step_label: ctx.k(FULFILMENT_LABELS[step]) } : null,
    total: money(order.totalCents, order.currency),
    refunded: order.refundedCents ? money(order.refundedCents, order.currency) : null,
    lines: order.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: money(l.unitCents, order.currency), options: (l.options ?? []).map((o) => `${o.group}: ${o.name}`) })),
    customer: order.customer ? { ...order.customer } : null,
    created_at: order.createdAt.toISOString(),
    paid_at: iso(order.paidAt),
    next_statuses: nextOrderStatuses(order),
  };
}

function refundDeps(ctx: OwnerContext): RefundDeps {
  const { deps } = ctx;
  return { store: deps.store, key: deps.encryptionKey, urls: deps.paymentUrls, now: deps.now, ip: deps.ip, actor: { id: ctx.user.id, email: ctx.user.email }, mail: deps.mail };
}

async function orderDetail(ctx: OwnerContext, app: App, order: CatalogOrder) {
  const [options, refunds] = await Promise.all([orderRefundOptions(refundDeps(ctx), app, order), ctx.deps.store.listRefunds(app.id, "order", [order.id])]);
  return {
    ...orderJson(ctx, order),
    refund: {
      refundable: options.refundable,
      why: options.why ? ctx.k(options.why) : null,
      provider: options.provider,
      left: money(options.leftCents, order.currency),
      by_api: options.byApi,
      manual: options.manual,
      reasons: Object.entries(REFUND_REASONS).map(([id, label]) => ({ id, label: ctx.k(label) })),
      can_take_back: options.revocable,
    },
    refunds: refunds.map((r) => ({ id: r.id, amount: money(r.amountCents, r.currency), reason: r.reason, method: r.method, created_at: r.createdAt.toISOString() })),
  };
}

async function ownOrder(ctx: OwnerContext, params: Record<string, string>) {
  const scope = appScope(ctx, params.app_id, "orders");
  const order = await ctx.deps.store.getCatalogOrder(scope.app.id, intParam(params.order_id));
  // Unpaid and failed checkouts aren't orders on the dashboard either.
  if (!order || !PAID.includes(order.status)) throw notFound();
  return { ...scope, order };
}

export async function listOrders(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "orders");
  const page = paging(ctx.req.query);
  const wanted = (ctx.req.query.get("status") ?? "").split(",").filter(Boolean);
  if (wanted.some((s) => !PAID.includes(s as CatalogOrderStatus))) throw invalid({ status: "The request isn't valid." });
  const { items, total } = await ctx.deps.store.listCatalogOrders({ appId: app.id, statuses: wanted.length ? (wanted as CatalogOrderStatus[]) : PAID, offset: page.offset, limit: page.perPage });
  return { status: 200, body: { ...pageJson(page, total), items: items.map((o) => orderJson(ctx, o)) } };
}

export async function getOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  return { status: 200, body: await orderDetail(ctx, app, order) };
}

/** The dashboard's buttons: completed or cancelled, or a restaurant's kitchen steps (the customer is told). */
export async function changeOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const status = bodyObject(ctx.req.body).status;
  if (typeof status !== "string" || !status) throw invalid({ status: "The request isn't valid." });
  const { deps } = ctx;
  const moved = await changeOrderStatus(
    { store: deps.store, app, now: deps.now, key: deps.encryptionKey, urls: deps.paymentUrls, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush },
    order,
    status,
  );
  if (!moved) throw new OwnerError(409, "invalid_status", "This order can't move to that status.");
  return { status: 200, body: await orderDetail(ctx, app, (await deps.store.getCatalogOrder(app.id, order.id))!) };
}

/** 47 A refund, all of it or part, with the dashboard's form rules. */
export async function refund(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const body = bodyObject(ctx.req.body);
  const d = refundDeps(ctx);
  const options = await orderRefundOptions(d, app, order);
  if (!options.refundable) throw new OwnerError(409, "not_refundable", options.why ?? "This can't be refunded.");
  const text = (name: string) => (typeof body[name] === "string" ? (body[name] as string) : typeof body[name] === "number" ? String(body[name]) : "");
  const ids = (name: string) => (Array.isArray(body[name]) ? (body[name] as unknown[]).map(String) : []);
  const parsed = readRefundForm(
    { amount: text("amount"), reason: text("reason"), note: text("note"), method: text("method"), reference: text("reference"), tickets: ids("tickets"), courses: ids("courses"), memberships: ids("memberships") },
    options,
  );
  if (!parsed.ok) throw invalid(parsed.errors);
  const result = await refundOrder(d, app, order, parsed.input);
  if (!result.ok) throw new OwnerError(502, "provider_error", result.message);
  return { status: 200, body: { message: ctx.k(result.message), order: await orderDetail(ctx, app, (await ctx.deps.store.getCatalogOrder(app.id, order.id))!) } };
}

// Appointments

function appointmentJson(ctx: OwnerContext, a: BookingAppointment, zone: string) {
  const local = utcToLocal(a.startAt, zone);
  return {
    id: a.id,
    status: a.status,
    status_label: ctx.k(BOOKING_STATUS_LABELS[a.status]),
    service: a.serviceName,
    staff: a.staffName,
    customer: { name: a.customerName, phone: a.customerPhone, email: a.customerEmail },
    start_at: a.startAt.toISOString(),
    end_at: a.endAt.toISOString(),
    local_date: local.date,
    local_time: local.time,
    price: money(a.priceCents, a.currency),
    notes: a.notes,
    answers: (a.answers ?? []).map((answer) => ({ label: answer.label, value: answer.value })),
    next_statuses: nextAppointmentStatuses(a),
    can_reschedule: canReschedule(a, ctx.deps.now),
  };
}

const BOOKING_STATUSES = ["pending", "approved", "rejected", "cancelled", "completed", "no_show"] as const;

export async function listAppointments(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "appointments");
  const page = paging(ctx.req.query);
  const scope = ctx.req.query.get("scope") ?? "upcoming";
  if (scope !== "today" && scope !== "upcoming" && scope !== "past") throw invalid({ scope: "The request isn't valid." });
  const statuses = (ctx.req.query.get("status") ?? "").split(",").filter(Boolean);
  if (statuses.some((s) => !(BOOKING_STATUSES as readonly string[]).includes(s))) throw invalid({ status: "The request isn't valid." });
  const zone = bookingSetup(app).rules.timezone;
  const { now } = ctx.deps;
  const date = utcToLocal(now, zone).date;
  const window =
    scope === "today"
      ? { startFrom: localToUtc(date, "00:00", zone), startBefore: localToUtc(addDays(date, 1), "00:00", zone) }
      : { scope: { kind: scope, now } as const };
  const { items, total } = await ctx.deps.store.listBookingAppointments({
    appId: app.id,
    ...window,
    ...(statuses.length ? { statuses: statuses as BookingAppointment["status"][] } : {}),
    offset: page.offset,
    limit: page.perPage,
  });
  return { status: 200, body: { ...pageJson(page, total), time_zone: zone, items: items.map((a) => appointmentJson(ctx, a, zone)) } };
}

export async function changeAppointment(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "appointments");
  const { store, now } = ctx.deps;
  const appointment = await store.getBookingAppointment(app.id, intParam(params.appointment_id));
  if (!appointment) throw notFound();
  const status = bodyObject(ctx.req.body).status;
  if (typeof status !== "string" || !status) throw invalid({ status: "The request isn't valid." });
  if (!(await changeAppointmentStatus(store, appointment, status, now))) throw new OwnerError(409, "invalid_status", "This appointment can't move to that status.");
  return { status: 200, body: appointmentJson(ctx, (await store.getBookingAppointment(app.id, appointment.id))!, bookingSetup(app).rules.timezone) };
}

/** 61 The appointment of this app, or 404. */
async function ownAppointment(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "appointments");
  const appointment = await ctx.deps.store.getBookingAppointment(app.id, intParam(params.appointment_id));
  if (!appointment) throw notFound();
  return { app, appointment };
}

/** 61 `GET …/times`: the free times booking would offer, for moving it. */
export async function listRescheduleTimes(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, appointment } = await ownAppointment(ctx, params);
  const q = ctx.req.query;
  const from = q.get("from");
  if (from !== null && !isDay(from)) throw invalid({ from: "The request isn't valid." });
  const days = q.get("days") === null ? 7 : Number(q.get("days"));
  if (!Number.isSafeInteger(days) || days < 1 || days > 14) throw invalid({ days: "The request isn't valid." });
  const staffId = q.get("staff_id") === null ? null : Number(q.get("staff_id"));
  if (staffId !== null && !Number.isSafeInteger(staffId)) throw invalid({ staff_id: "The request isn't valid." });
  if (!canReschedule(appointment, ctx.deps.now)) throw new OwnerError(409, "invalid_status", "This appointment can't be moved.");
  const times = await rescheduleTimes({ store: ctx.deps.store, app, now: ctx.deps.now }, appointment, { from, days, staffId });
  if (!times) throw new OwnerError(409, "not_bookable", "This service can't be booked any more, so the appointment can't be moved.");
  return {
    status: 200,
    body: {
      time_zone: times.timeZone,
      staff: times.staff,
      days: times.days.map((d) => ({ date: d.date, slots: d.slots.map((x) => ({ start: x.start.toISOString(), end: x.end.toISOString(), local_time: x.localTime, staff_ids: x.staffIds })) })),
    },
  };
}

/** 61 `POST …/reschedule`: the dashboard's Change time (lib/bookings/reschedule.ts); the customer is told. */
export async function rescheduleOne(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, appointment } = await ownAppointment(ctx, params);
  const body = bodyObject(ctx.req.body);
  const start = typeof body.start === "string" ? new Date(body.start) : null;
  if (!start || Number.isNaN(start.getTime())) throw invalid({ start: "Choose a time." });
  const staffId = body.staff_id === undefined || body.staff_id === null ? null : Number(body.staff_id);
  if (staffId !== null && !Number.isSafeInteger(staffId)) throw invalid({ staff_id: "The request isn't valid." });
  const { deps } = ctx;
  const result = await rescheduleAppointment({ store: deps.store, app, now: deps.now, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush }, appointment, { start, staffId });
  if (!result.ok) {
    if (result.code === "invalid_request") throw invalid({ staff_id: result.message }, result.message);
    throw new OwnerError(409, result.code, result.message);
  }
  return { status: 200, body: appointmentJson(ctx, result.appointment, bookingSetup(app).rules.timezone) };
}

// Events and the door

export async function listEvents(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "events");
  const { store, now } = ctx.deps;
  const scope = ctx.req.query.get("scope") ?? "open";
  if (scope !== "open" && scope !== "all") throw invalid({ scope: "The request isn't valid." });
  const [events, settings, tickets] = await Promise.all([store.listEvents(app.id), eventSettingsOf(store, app.id), store.listTickets({ appId: app.id })]);
  // As the dashboard's Check-in page: events still on, or over in the last 12 hours for late arrivals, soonest first.
  const listed =
    scope === "open"
      ? events.filter((e) => e.status === "published" && e.endAt.getTime() > now.getTime() - 12 * 3_600_000).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      : [...events].sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return {
    status: 200,
    body: {
      time_zone: settings.timeZone,
      items: listed.slice(0, 100).map((e) => {
        const own = tickets.filter((t) => t.eventId === e.id);
        return {
          id: e.id,
          title: e.title,
          status: e.status,
          start_at: e.startAt.toISOString(),
          end_at: e.endAt.toISOString(),
          venue: e.venueName,
          tickets: { valid: own.filter((t) => t.status === "valid").length, used: own.filter((t) => t.status === "used").length, capacity: e.capacity },
        };
      }),
    },
  };
}

/** What the dashboard's check-in says for each outcome. */
function checkInMessage(ctx: OwnerContext, answer: CheckInAnswer, zone: string): string {
  const ticket = answer.ticket;
  switch (answer.outcome) {
    case "admitted":
      return ctx.t("events.admitted");
    case "used":
      return ticket?.usedAt
        ? ctx.t("events.usedAt", {
            time: formatDate(ctx.lang, ticket.usedAt, { hour: "2-digit", minute: "2-digit", timeZone: zone }),
            date: formatDate(ctx.lang, ticket.usedAt, { day: "numeric", month: "short", timeZone: zone }),
          })
        : ctx.t("events.usedTicket");
    case "cancelled":
      return ctx.t("events.cancelledTicket");
    case "not_paid":
      return ctx.t("events.notPaid");
    case "forged":
      return ctx.t("events.forged");
    case "other_event":
      return ticket ? ctx.t("events.otherEventNamed", { event: ticket.eventTitle }) : ctx.t("events.otherEvent");
    case "not_found":
      return ctx.t("events.notFound");
    default:
      return ctx.t("events.notACode");
  }
}

/** 28 The door: the same check as the dashboard's (signed QR codes, once only, atomic). */
export async function checkInTicket(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "checkIn");
  const body = bodyObject(ctx.req.body);
  const scanned = typeof body.code === "string" ? body.code.trim() : "";
  if (!scanned || scanned.length > 300) throw invalid({ code: "Scan a ticket or type its code." });
  const eventId = body.event_id === undefined || body.event_id === null ? null : Number(body.event_id);
  if (eventId !== null && !Number.isSafeInteger(eventId)) throw invalid({ event_id: "The request isn't valid." });
  const { store, now, signingSecret } = ctx.deps;
  const answer = await checkIn({ store, app, key: ticketKey(signingSecret, app.id), scanned, eventId, now });
  const zone = (await eventSettingsOf(store, app.id)).timeZone;
  const ticket = answer.ticket;
  return {
    status: 200,
    body: {
      outcome: answer.outcome,
      admitted: answer.outcome === "admitted",
      message: checkInMessage(ctx, answer, zone),
      ticket: ticket ? { code: ticket.code, holder_name: ticket.holderName, type_name: ticket.typeName, event_id: ticket.eventId, event_title: ticket.eventTitle, used_at: iso(ticket.usedAt) } : null,
    },
  };
}

// Donations

function donationJson(d: Donation) {
  return {
    id: d.id,
    amount: money(d.amountCents, d.currency),
    refunded: d.refundedCents ? money(d.refundedCents, d.currency) : null,
    status: d.status,
    donor_name: d.anonymous ? null : d.donorName,
    message: d.message,
    campaign_id: d.campaignId,
    campaign_title: d.campaignTitle,
    paid_at: iso(d.paidAt),
  };
}

export async function listDonations(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "donations");
  const page = paging(ctx.req.query);
  const raw = ctx.req.query.get("campaign_id");
  const campaignId = raw ? Number(raw) : undefined;
  if (campaignId !== undefined && !Number.isSafeInteger(campaignId)) throw invalid({ campaign_id: "The request isn't valid." });
  const { store } = ctx.deps;
  const [{ items, total }, campaigns, settings] = await Promise.all([
    store.listDonations({ appId: app.id, ...(campaignId !== undefined ? { campaignId } : {}), statuses: ["paid", "refunded"], offset: page.offset, limit: page.perPage }),
    store.listCampaigns(app.id),
    store.getDonationSettings(app.id),
  ]);
  const currency = settings?.currency ?? items[0]?.currency ?? "TRY";
  return {
    status: 200,
    body: {
      ...pageJson(page, total),
      items: items.map(donationJson),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        raised: money(c.raisedCents, currency),
        donors: c.donorCount,
        goal: c.goalCents ? money(c.goalCents, currency) : null,
      })),
    },
  };
}
