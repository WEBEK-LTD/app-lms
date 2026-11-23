import { morningBriefJson } from "./prime-jobs";
import { moneyLang } from "./money-lang";
import { deliverToJson, orderAmountsJson, orderCustomerJson, orderExtras, orderLinesJson, ownerDeliveryJson, type OrderExtras } from "./order-details";
import { inAppFigures } from "../analytics/sales";
import { storeBillingSource } from "../store-billing/access";
import { formatDate } from "@/i18n/format";
import { addDays, dayOf, isDay } from "../analytics/days";
import { refreshAnalytics } from "../analytics/aggregate";
import { appZone } from "../analytics/zone";
import { appAreas, type AppAreas } from "../app/areas";
import { changeAppointmentStatus, nextAppointmentStatuses } from "../bookings/appointments";
import { canReschedule, rescheduleAppointment, rescheduleTimes } from "../bookings/reschedule";
import { gymDay } from "../bookings/door";
import { BOOKING_STATUS_LABELS, bookingSetup } from "../bookings/setup";
import { notifyAppointmentConfirmed } from "../hosted/auto-notifications";
import { localToUtc, utcToLocal } from "../bookings/time";
import { FULFILMENT_LABELS } from "../catalog/fulfilment";
import { BILLING_CURRENCIES, formatCents, latinDigits } from "../catalog/money";
import { formatMinor } from "../market/currency";
import { countOpenQuestions } from "../courses/community";
import { changeOrderStatus, nextOrderStatuses } from "../catalog/order-status";
import { nextStages, parseStageInput, setOrderStage } from "../catalog/order-stages";
import { markStageRefunded, stageRefundStatus, type StageRefundDeps } from "../catalog/stage-refunds";
import { cancelOrder, cancelRefundCents, readRefundChoice } from "../catalog/cancel";
import { ownerStageHistoryJson, ownerStageJson } from "../catalog/stage-json";
import { deliveryDayLabel, deliveryOf, shopToday, slotClosed, slotLabel, slotStarted } from "../selling/delivery";
import { awaitingManualPayment } from "../catalog/manual";
import { ORDER_STATUS_LABELS, orderNumber } from "../catalog/settings";
import { parseShipment, shipmentJson, shipOrder, shippable } from "../catalog/shipping";
import type { App, BookingAppointment, CatalogCurrency, CatalogOrder, CatalogOrderStatus, Donation, License, PrimeGift } from "../data/types";
import { primeGiftActive } from "../admin/prime-gift";
import { checkIn, type CheckInAnswer } from "../events/check-in";
import { ticketKey } from "../events/codes";
import { eventSettingsOf } from "../events/service";
import { serviceAccountOf } from "../hosted/notify";
import { REFUND_REASONS } from "../payments/refund";
import { orderRefundOptions, readRefundForm, refundOrder, type RefundDeps } from "../refunds/service";
import type { AccountState } from "../license/status";
import { appStateOf, requireActive } from "./account";
import { bodyObject, intParam, invalid, iso, notAllowed, notAvailable, notFound, OwnerError, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { allowedAreas, APP_AREA_PERMISSION, teamCan } from "../team/permissions";
import { currentPlanId } from "../billing/plan-change";
import { isPlan, planFamily } from "../plans";
import { saleEvents, todayCompare } from "./prime";
import { todayGoalJson } from "./prime-plus";
import { recordAppointmentStatus, recordOrderStatus, recordRefund } from "../team/activity";

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

/** 125 Prime: the app's license is on a Studio plan (no subscription of its own, no switch). */
export function isPrimeLicense(license: Pick<License, "plan" | "nextPlan" | "nextPlanAt"> | null, now: Date): boolean {
  if (!license) return false;
  const plan = currentPlanId(license, now);
  return isPlan(plan) && planFamily(plan) === "studio";
}

/** What the app has (lib/app/areas.ts), with 125 Prime from its license, 132 or given as a gift. */
export function ownerAreas(ctx: Pick<OwnerContext, "licenses" | "deps"> & Partial<Pick<OwnerContext, "primeGifts">>, app: App): AppAreas {
  const license = ctx.licenses.find((l) => l.appId === app.id) ?? null;
  return { ...appAreas(app), prime: isPrimeLicense(license, ctx.deps.now) || primeGiftActive(primeGiftOf(ctx, app), ctx.deps.now) };
}

/** 132 The app's Prime gift, when Yallapp gave one. */
export function primeGiftOf(ctx: Partial<Pick<OwnerContext, "primeGifts">>, app: Pick<App, "id">): PrimeGift | null {
  return ctx.primeGifts?.find((g) => g.appId === app.id) ?? null;
}

/** The client's own app, or 404; with `area`, one the app has, or 404 `not_available`. */
export function appScope(ctx: OwnerContext, appId: string | undefined, area?: keyof AppAreas): AppScope {
  requireActive(ctx);
  // 60 Only the apps the person works on (a member may be limited to some).
  const app = ctx.apps.find((a) => a.id === appId);
  if (!app) throw notFound();
  const has = ownerAreas(ctx, app);
  if (area && !has[area]) throw notAvailable();
  // 60 What the app has and the person's role allows; the rest is 403 "Ask the owner".
  if (area && !teamCan(ctx.access, APP_AREA_PERMISSION[area], app.id)) throw notAllowed();
  return { app, license: ctx.licenses.find((l) => l.appId === app.id) ?? null, state: appStateOf(ctx, app), areas: allowedAreas(has, ctx.access, app.id) };
}

/**
 * `Money`: 125 a currency outside the catalog's (a marketplace's: any ISO
 * currency, 0, 2 or 3 decimals) is written with its own decimals. 135.2
 * Every amount here is in cents (a marketplace's sales too, lib/owner/prime.ts),
 * written with its currency's digits (KWD 1.250, ¥1,250).
 */
export function money(cents: number, currency: string) {
  return { amount_cents: cents, currency, formatted: formatCents(cents, currency as CatalogCurrency, moneyLang()) };
}

/**
 * 135.2 `Money` of a marketplace's amounts, kept in the currency's own minor
 * units (fils, yen; lib/market/currency.ts): written as before 135, the six
 * currencies Yallapp knew then with their sign, the others with their code.
 */
export function minorMoney(minor: number, currency: string) {
  const known = (BILLING_CURRENCIES as readonly string[]).includes(currency);
  return { amount_cents: minor, currency, formatted: known ? formatCents(minor, currency as CatalogCurrency, moneyLang()) : formatMinor(minor, currency) };
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
    // 132 Orders waiting for a bank transfer or the owner's own method: the owner marks them paid.
    const unpaid = (await store.listCatalogOrders({ appId: app.id, statuses: [], awaitingManual: true, offset: 0, limit: 1 })).total;
    if (unpaid) needs.push({ kind: "orders_awaiting_payment", count: unpaid, title: ctx.t("owner.needs.awaitingPayment", { count: unpaid }), notice_id: null });
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
  // 63 A gym's members who came in today (once a member a day).
  // The gym's own day (its booking time zone), as the door's list counts them.
  if (areas.memberCheckIn) counts.member_check_ins = await store.countMemberCheckInsOnDay(app.id, gymDay(app, now).day);
  if (areas.donations) {
    const paid = await store.sumPaidDonations(app.id, day.start, day.end);
    for (const total of paid.totals) addTo(given, total.currency, total.cents);
    counts.donations = paid.count;
  }
  // 100.6 Courses and memberships bought or renewed in the app through the stores (before their fee).
  const inApp = new Map<string, number>();
  if (storeBillingSource(app) && app.storeBilling) {
    const figures = await inAppFigures(store, app.id, day.start, day.end);
    for (const total of figures.inApp.totals) addTo(inApp, total.currency, total.cents);
    counts.in_app_purchases = figures.inApp.count;
  }
  if (areas.inquiries) {
    const unread = await store.countUnreadListingInquiries(app.id);
    if (unread) needs.push({ kind: "unanswered_messages", count: unread, title: ctx.t("owner.needs.unanswered", { count: unread }), notice_id: null });
  }
  // 63 Course questions waiting for the business.
  if (areas.questions) {
    const open = await countOpenQuestions(store, app.id);
    if (open) needs.push({ kind: "questions_to_answer", count: open, title: ctx.t("owner.needs.questions", { count: open }), notice_id: null });
  }
  if (areas.appUsers) counts.new_users = await store.countHostedUsersCreated(app.id, day.start, day.end);
  // 125 The Studio apps sell through their engines: their own orders today, and what waits.
  await engineToday(ctx, app, areas, day, { counts, sales, needs });
  // 44 Opens today, from the app's own usage statistics (counted at read, like Analytics).
  await refreshAnalytics(store, app.id, now, [], day.zone);
  const sessions = await store.listAnalyticsDaily(app.id, day.date, day.date, ["sessions"]);
  counts.app_opens = sessions.reduce((sum, row) => sum + row.value, 0);
  // The owner notices still open on the dashboard's overview for this app (60 for those with the app's settings).
  for (const notice of teamCan(ctx.access, "settings", app.id) ? await store.listOwnerNotices({ clientId: ctx.client.id, appId: app.id, open: true, limit: 10 }) : []) {
    needs.push({ kind: "notice", count: 1, title: ctx.k(notice.title), notice_id: notice.id });
  }
  // 125 A Prime app compares today with the same weekday last week.
  const compare = areas.prime
    ? {
        compare: await todayCompare(ctx, app, ownerAreas(ctx, app), day),
        morning_brief: await morningBriefJson(ctx.deps.store, app, day.zone, day.date, ctx.t),
        // 132 The person's sales goal and how far it is.
        goal: await todayGoalJson(ctx, app, ownerAreas(ctx, app)),
      }
    : {};
  return { status: 200, body: { date: day.date, time_zone: day.zone, sales: totalsJson(sales), donations: totalsJson(given), in_app_sales: totalsJson(inApp), counts, needs_you: needs, ...compare } };
}

type Need = { kind: string; count: number; title: string; notice_id: number | null };

/**
 * 125 Today for the Studio apps: a food company's orders placed today (not
 * turned down or cancelled, cash and card), a delivery company's shipments,
 * a ride company's completed rides, a marketplace's orders; `counts.orders`
 * is the engine's orders too, for the app's tiles. And what waits: new food
 * orders, shipments without a courier, rides looking for a driver,
 * complaints waiting on support, a school's excuses, reports and leave.
 */
async function engineToday(
  ctx: OwnerContext,
  app: App,
  areas: AppAreas,
  day: { start: Date; end: Date },
  out: { counts: Record<string, number | null>; sales: Map<string, number>; needs: Need[] },
): Promise<void> {
  const { store } = ctx.deps;
  const need = (kind: string, count: number, title: string) => {
    if (count > 0) out.needs.push({ kind, count, title, notice_id: null });
  };
  const sold = (events: { cents: number; currency: string }[], name: string) => {
    for (const e of events) addTo(out.sales, e.currency, e.cents);
    out.counts[name] = events.length;
    out.counts.orders = (out.counts.orders ?? 0) + events.length;
  };
  if (areas.foodOrders) {
    const placed = await saleEvents(store, app, { ...NO_SALES, foodOrders: true }, day.start, day.end);
    sold(placed, "food_orders");
    const fresh = (await store.listFoodOrders({ appId: app.id, statuses: ["placed"], order: "newest", offset: 0, limit: 1 })).total;
    need("food_orders_new", fresh, ctx.t("owner.needs.foodOrders", { count: fresh }));
  }
  if (areas.shipments) {
    if (app.connector?.kind === "deliveries") sold(await saleEvents(store, app, { ...NO_SALES, shipments: true }, day.start, day.end), "shipments");
    const waiting = (await store.listShipments({ appId: app.id, statuses: ["pending"], order: "oldest", offset: 0, limit: 1 })).total;
    need("shipments_waiting", waiting, ctx.t("owner.needs.shipments", { count: waiting }));
  }
  if (areas.rides) {
    sold(await saleEvents(store, app, { ...NO_SALES, rides: true }, day.start, day.end), "rides");
    const searching = (await store.listRides({ appId: app.id, statuses: ["searching"], order: "oldest", offset: 0, limit: 1 })).total;
    need("rides_searching", searching, ctx.t("owner.needs.rides", { count: searching }));
  }
  if (areas.market) {
    sold(await saleEvents(store, app, { ...NO_SALES, market: true }, day.start, day.end), "market_orders");
    const waiting = (await store.listMarketComplaints({ appId: app.id, statuses: ["open", "in_review"], limit: 1, offset: 0 })).total;
    need("complaints_waiting", waiting, ctx.t("owner.needs.complaints", { count: waiting }));
  }
  if (areas.school) {
    const [excuses, reports, leave] = await Promise.all([
      store.listSchoolExcuses(app.id, { statuses: ["pending"] }),
      store.listSchoolReports(app.id, { statuses: ["sent"] }),
      store.listSchoolLeave(app.id, { statuses: ["pending"] }),
    ]);
    need("school_excuses", excuses.length, ctx.t("owner.needs.excuses", { count: excuses.length }));
    need("school_reports", reports.length, ctx.t("owner.needs.reports", { count: reports.length }));
    need("school_leave", leave.length, ctx.t("owner.needs.leave", { count: leave.length }));
  }
}

const NO_SALES = { orders: false, appointments: false, donations: false, foodOrders: false, rides: false, market: false, shipments: false };

// Orders

function orderJson(ctx: OwnerContext, order: CatalogOrder, extras: OrderExtras) {
  const step = order.fulfilment ? (order.fulfilmentStatus ?? null) : null;
  // 132 Who ordered: the payment page's details, else the gift's sender, else the app's account of the person.
  const customer = orderCustomerJson(order, order.userId !== null ? extras.accounts.get(order.userId) : null);
  return {
    id: order.id,
    number: orderNumber(order),
    status: order.status,
    status_label: ctx.k(ORDER_STATUS_LABELS[order.status]),
    // 96.2 An order waiting for its payment reaches the kitchen once marked paid.
    kitchen:
      order.fulfilment && step && order.status !== "pending"
        ? { type: order.fulfilment.type, step, step_label: ctx.k(FULFILMENT_LABELS[step]), scheduled_for: order.fulfilment.scheduledFor ?? null }
        : null,
    total: money(order.totalCents, order.currency),
    refunded: order.refundedCents ? money(order.refundedCents, order.currency) : null,
    // 131 A gift add-on's line says the product it went with; 132 each line its product, total and flash sale.
    lines: orderLinesJson(order, extras),
    customer,
    // 132 Where it goes and who takes it, the place's pin; what the total is made of.
    deliver_to: deliverToJson(order, customer),
    amounts: orderAmountsJson(order),
    created_at: order.createdAt.toISOString(),
    paid_at: iso(order.paidAt),
    // 131 The delivery day and slot, the sender and the recipient, the card, and the shipping's zone and fee.
    delivery: ownerDeliveryJson(order, customer),
    // 80.4 Shipping, with any carrier.
    shippable: shippable(order),
    shipment: shipmentJson(order.shipment),
    next_statuses: nextOrderStatuses(order),
    // 132 Where its delivery is, every change of it, and where it may go next (store orders).
    stage: ownerStageJson(order, ctx.lang),
    stage_history: ownerStageHistoryJson(order, ctx.lang),
    next_stages: stagesOf(ctx, order),
    // 132 The money back after a failed delivery cancelled it.
    refund_due: stageRefundJson(ctx, order),
    // 175 What Cancel order offers to refund (the owner chooses: refund or not); null when nothing paid is left.
    cancel_refund: cancelRefundJson(order),
    // 96.2 To pay by bank transfer or the owner's own method: waiting (status pending) until marked paid.
    pay_outside: order.manualPayment
      ? { method: order.manualPayment.method, name: order.manualPayment.method === "bank_transfer" ? ctx.k("Bank transfer") : order.manualPayment.name, due_at: order.manualPayment.dueAt }
      : null,
  };
}

function refundDeps(ctx: OwnerContext): RefundDeps {
  const { deps } = ctx;
  return { store: deps.store, key: deps.encryptionKey, urls: deps.paymentUrls, now: deps.now, ip: deps.ip, actor: { id: ctx.user.id, email: ctx.user.email }, mail: deps.mail };
}

async function orderDetail(ctx: OwnerContext, app: App, order: CatalogOrder) {
  const [options, refunds, extras] = await Promise.all([
    orderRefundOptions(refundDeps(ctx), app, order),
    ctx.deps.store.listRefunds(app.id, "order", [order.id]),
    orderExtras(ctx.deps.store, app.id, [order], ctx.lang),
  ]);
  return {
    ...orderJson(ctx, order, extras),
    refund: {
      refundable: options.refundable,
      why: options.why ? ctx.k(options.why) : null,
      provider: options.provider,
      left: money(options.leftCents, order.currency),
      by_api: options.byApi,
      manual: options.manual,
      // 96.2 Paid by bank transfer or the owner's own method: paid back the same way, then recorded.
      paid_outside: options.outside === "bank_transfer" ? ctx.k("Bank transfer") : options.outside,
      reasons: Object.entries(REFUND_REASONS).map(([id, label]) => ({ id, label: ctx.k(label) })),
      can_take_back: options.revocable,
    },
    refunds: refunds.map((r) => ({ id: r.id, amount: money(r.amountCents, r.currency), reason: r.reason, method: r.method, created_at: r.createdAt.toISOString() })),
  };
}

async function ownOrder(ctx: OwnerContext, params: Record<string, string>) {
  const scope = appScope(ctx, params.app_id, "orders");
  const order = await ctx.deps.store.getCatalogOrder(scope.app.id, intParam(params.order_id));
  // Unpaid and failed checkouts aren't orders on the dashboard either; 96.2 those waiting for a bank transfer or the owner's own method are.
  if (!order || !(PAID.includes(order.status) || awaitingManualPayment(order))) throw notFound();
  return { ...scope, order };
}

/** 206 How many of the latest orders a search looks through. */
const ORDER_SEARCH_LIMIT = 500;

/** 206 An order a search finds: its number (with or without #), or its customer's name, phone (digits only) or email. */
function orderMatches(order: { number: string; customer: { name?: string | null; phone?: string | null; email?: string | null } | null }, q: string): boolean {
  const number = q.replace(/^#/, "");
  if (order.number.toLowerCase().includes(number)) return true;
  const c = order.customer;
  if (!c) return false;
  if ((c.name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length >= 4 && (c.phone ?? "").replace(/\D/g, "").includes(digits);
}

export async function listOrders(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "orders");
  const page = paging(ctx.req.query);
  const wanted = (ctx.req.query.get("status") ?? "").split(",").filter(Boolean);
  if (wanted.some((s) => !PAID.includes(s as CatalogOrderStatus) && s !== "pending")) throw invalid({ status: "The request isn't valid." });
  // 96.2 "pending": the orders waiting for a bank transfer or the owner's own method (never an unpaid card checkout); listed by default too.
  const paid = wanted.filter((s) => s !== "pending") as CatalogOrderStatus[];
  const filter = { appId: app.id, statuses: wanted.length ? paid : PAID, awaitingManual: !wanted.length || wanted.includes("pending") };
  // 206 Search: the order's number, or who ordered (name, phone, email), in the latest orders (as the dashboard's list).
  const q = latinDigits((ctx.req.query.get("q") ?? "").trim()).toLowerCase().slice(0, 100);
  if (q) {
    const recent = await ctx.deps.store.listCatalogOrders({ ...filter, offset: 0, limit: ORDER_SEARCH_LIMIT });
    const extras = await orderExtras(ctx.deps.store, app.id, recent.items, ctx.lang);
    const found = recent.items.map((o) => orderJson(ctx, o, extras)).filter((o) => orderMatches(o, q));
    return { status: 200, body: { ...pageJson(page, found.length), items: found.slice(page.offset, page.offset + page.perPage) } };
  }
  const { items, total } = await ctx.deps.store.listCatalogOrders({ ...filter, offset: page.offset, limit: page.perPage });
  const extras = await orderExtras(ctx.deps.store, app.id, items, ctx.lang);
  return { status: 200, body: { ...pageJson(page, total), items: items.map((o) => orderJson(ctx, o, extras)) } };
}

export async function getOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  return { status: 200, body: await orderDetail(ctx, app, order) };
}

/** The dashboard's buttons: completed or cancelled, or a restaurant's kitchen steps (the customer is told); 96.2 paid ("processing") or cancelled for an order waiting for a bank transfer or the owner's own method. */
export async function changeOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const body = bodyObject(ctx.req.body);
  const status = body.status;
  if (typeof status !== "string" || !status) throw invalid({ status: "The request isn't valid." });
  const { deps } = ctx;
  const moveDeps = { store: deps.store, app, now: deps.now, key: deps.encryptionKey, urls: deps.paymentUrls, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush, guestMail: deps.guestMail };
  // 175 Cancelling a paid order carries the owner's choice: `refund` true (all that's left, through its gateway) or false. Without it (an older app), only after a failed delivery (132).
  const refund = readRefundChoice(body.refund);
  if (body.refund !== undefined && refund === null) throw invalid({ refund: "The request isn't valid." });
  const moved = status === "cancelled" ? (await cancelOrder(moveDeps, stageRefundDeps(ctx, app), order, refund)).moved : await changeOrderStatus(moveDeps, order, status);
  if (!moved) throw new OwnerError(409, "invalid_status", "This order can't move to that status.");
  // 60 Who moved it, on the dashboard's Team page.
  await recordOrderStatus(deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, orderId: order.id, to: awaitingManualPayment(order) && status === "processing" ? "paid" : status }, deps.now);
  return { status: 200, body: await orderDetail(ctx, app, (await deps.store.getCatalogOrder(app.id, order.id))!) };
}

/** 132 What giving the money back after a failed delivery needs: the refunds' (the person's) and the app's push. */
function stageRefundDeps(ctx: OwnerContext, app: App): StageRefundDeps {
  return { ...refundDeps(ctx), app, account: serviceAccountOf(app, ctx.deps.encryptionKey), send: ctx.deps.sendPush, baseUrl: ctx.deps.baseUrl };
}

/** 175 `Order.cancel_refund`: what's left of the payment if the order is cancelled now. */
function cancelRefundJson(order: CatalogOrder) {
  const cents = cancelRefundCents(order);
  return cents === null ? null : { amount: money(cents, order.currency) };
}

/** 132 `Order.refund_due`: the money back after a failed delivery cancelled it; null when nothing was owed. */
function stageRefundJson(ctx: OwnerContext, order: CatalogOrder) {
  const due = order.stageRefund;
  const status = stageRefundStatus(order);
  if (!due || !status) return null;
  return {
    status,
    amount: money(due.cents, order.currency),
    at: due.at,
    why: due.why ? ctx.k(due.why) : null,
    why_code: due.whyCode ?? null,
    done_at: due.doneAt,
    done_by: due.doneBy,
  };
}

/** 132 "I refunded it": the owner paid the money back themselves after a failed delivery; recorded, and the customer told. */
export async function markRefunded(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const done = await markStageRefunded(stageRefundDeps(ctx, app), order, ctx.user.name?.trim() || ctx.user.email);
  if (!done.ok) throw new OwnerError(409, "no_refund_due", done.message);
  await recordRefund(ctx.deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, kind: "order", id: order.id, amount: formatCents(order.stageRefund!.cents, order.currency) }, ctx.deps.now);
  return { status: 200, body: await orderDetail(ctx, app, done.order) };
}

/** 132 The stages an order's delivery may move to, for the person (the orders permission of its app). */
function stagesOf(ctx: OwnerContext, order: CatalogOrder): string[] {
  const app = ctx.apps.find((a) => a.id === order.appId);
  return app ? nextStages(app, order) : [];
}

/**
 * 132 Moves a store order's delivery to another stage: shipped (the courier,
 * a tracking link), postponed (why, the new day and slot), a failed attempt
 * (why, what's next), returned to shop, delivered (completes it). The
 * customer is told; the change is kept with who made it.
 */
export async function setStage(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const parsed = parseStageInput(bodyObject(ctx.req.body));
  if (!parsed.ok) throw invalid(parsed.errors);
  const { deps } = ctx;
  const done = await setOrderStage(
    { store: deps.store, app, now: deps.now, key: deps.encryptionKey, urls: deps.paymentUrls, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush, guestMail: deps.guestMail },
    order,
    parsed.input,
    { userId: ctx.user.id, name: ctx.user.name?.trim() || ctx.user.email, via: "business" },
    stageRefundDeps(ctx, app),
  );
  if (!done.ok) {
    if (done.errors) throw invalid(done.errors);
    throw new OwnerError(done.status, done.code, done.message);
  }
  await recordOrderStatus(deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, orderId: order.id, to: parsed.input.stage }, deps.now);
  return { status: 200, body: await orderDetail(ctx, app, done.order) };
}

/** 132 A day's delivery slots for postponing an order: each with whether it's taken, full or closed. */
export async function stageSlots(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "orders");
  if (app.connector?.kind !== "catalog") throw notAvailable();
  const settings = deliveryOf(app, true);
  const zone = settings?.timezone ?? "Europe/Istanbul";
  const date = ctx.req.query.get("date") || shopToday({ timezone: zone }, ctx.deps.now).date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw invalid({ date: "The request isn't valid." });
  const counts = await ctx.deps.store.countCatalogDeliveries(app.id, date, new Date(ctx.deps.now.getTime() - 30 * 60_000));
  const own = deliveryOf(app);
  return {
    status: 200,
    body: {
      date,
      date_label: deliveryDayLabel(date, ctx.lang),
      // The shop's own slots when it has delivery days on, else the gift checkout's.
      slots: (own ?? settings!).slots.map((s) => {
        const used = counts[s.id] ?? 0;
        return {
          id: s.id,
          label: slotLabel(s),
          start: s.start,
          end: s.end,
          orders: used,
          full: s.capacity !== null && used >= s.capacity,
          closed: slotClosed(own ?? settings!, s, date),
          started: slotStarted(own ?? settings!, s, date, ctx.deps.now),
        };
      }),
    },
  };
}

/** 80.4 Marks an order shipped, or changes its tracking: any carrier, no carrier account; the customer is told. */
export async function shipOne(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownOrder(ctx, params);
  const body = bodyObject(ctx.req.body);
  const { deps } = ctx;
  const parsed = parseShipment({ carrier: body.carrier, trackingNumber: body.tracking_number, trackingUrl: body.tracking_url, waybill: body.waybill }, deps.now);
  if (!parsed.ok) {
    throw new OwnerError(400, "invalid_shipment", "Enter the tracking link, the tracking number or the waybill.", {
      errors: Object.fromEntries(Object.entries(parsed.errors).map(([field, message]) => [field === "trackingNumber" ? "tracking_number" : field === "trackingUrl" ? "tracking_url" : field, ctx.k(message)])),
    });
  }
  const shipped = await shipOrder({
    store: deps.store,
    app,
    order,
    shipment: parsed.shipment,
    account: serviceAccountOf(app, deps.encryptionKey),
    now: deps.now,
    send: deps.sendPush,
    mail: (to, values) => deps.mail("order_shipped", to, values, app),
  });
  if (!shipped) throw new OwnerError(409, "not_shippable", "This order has nothing to ship.");
  await recordOrderStatus(deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, orderId: order.id, to: "shipped" }, deps.now);
  return { status: 200, body: await orderDetail(ctx, app, shipped.order) };
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
  await recordRefund(ctx.deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, kind: "order", id: order.id, amount: formatCents(parsed.input.cents, order.currency) }, ctx.deps.now);
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
  await recordAppointmentStatus(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, appointmentId: appointment.id, to: status }, now);
  // 85.3 Confirmed after waiting: the customer hears of it.
  if (appointment.status === "pending" && status === "approved") {
    await notifyAppointmentConfirmed({ store, key: ctx.deps.encryptionKey, now, send: ctx.deps.sendPush }, app, { ...appointment, status: "approved" }, bookingSetup(app).rules.timezone).catch(() => undefined);
  }
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
