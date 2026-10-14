import { membershipEnd } from "../bookings/memberships";
import { bookingSetup } from "../bookings/setup";
import { parseAnyPhone } from "../hosted/phone";
import { hostedSettings } from "../hosted/service";
import type { DataStore } from "../data/store";
import type { App, CatalogCustomer, CatalogFulfilment, CatalogOrder } from "../data/types";
import { approvePaymentItem, initializeCheckoutForm, IyzicoError, retrieveCheckoutForm } from "../payments/iyzico";
import { centsToDecimal, formatCents } from "./money";
import { optionsText } from "./options";
import { commissionOf, orderNumber, type CheckoutAccount } from "./settings";
import { emailTemplate, renderTemplate } from "../email/templates";

/** What the payment page asks for, checked; or the errors per field. */
export function readCustomer(
  app: App,
  input: Record<string, unknown>,
): { ok: true; customer: CatalogCustomer } | { ok: false; errors: Record<string, string> } {
  const text = (name: string, max: number) => (typeof input[name] === "string" ? (input[name] as string).trim().slice(0, max) : "");
  const errors: Record<string, string> = {};
  const name = text("name", 80);
  if (name.length < 3 || !name.includes(" ")) errors.name = "Enter your first and last name.";
  const phone = parseAnyPhone(text("phone", 24), hostedSettings(app).defaultCountryCode);
  if (!phone) errors.phone = "Enter a valid mobile number.";
  const email = text("email", 191);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  const city = text("city", 60);
  if (city.length < 2) errors.city = "Enter your city.";
  const address = text("address", 300);
  if (address.length < 8) errors.address = "Enter your full address.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, customer: { name, phone: phone!.e164, email, city, address } };
}

interface PaymentDeps {
  store: DataStore;
  app: App;
  /** The shop's own iyzico account, or Yallapp's with the shop as a sub-merchant. */
  account: CheckoutAccount;
  fetcher?: typeof fetch;
  /** iyzico's address in tests. */
  baseUrl?: string | null;
  now: Date;
}

/** Saves the customer on the order and starts the card payment; returns iyzico's payment page. */
export async function startPayment(
  deps: PaymentDeps & { order: CatalogOrder; customer: CatalogCustomer; ip: string; callbackUrl: string },
): Promise<string> {
  const { order, customer } = deps;
  const marketplace = deps.account.marketplace;
  // Yallapp's commission is on the products; shipping goes to the shop in full.
  const share = (cents: number, commissioned: boolean) =>
    marketplace
      ? { subMerchantKey: marketplace.subMerchantKey, subMerchantPrice: centsToDecimal(cents - (commissioned ? commissionOf(cents, marketplace.commissionPercent) : 0)) }
      : {};
  const commissionCents = marketplace
    ? order.lines.reduce((sum, l) => sum + commissionOf(l.unitCents * l.quantity, marketplace.commissionPercent), 0)
    : null;
  await deps.store.updateCatalogOrder(order.appId, order.id, { customer, commissionCents, updatedAt: deps.now });
  const [first, ...rest] = customer.name.split(/\s+/);
  const address = { contactName: customer.name, city: customer.city, country: "Turkey", address: customer.address };
  const items = order.lines.map((l, i) => ({
    id: `${l.productId}-${i}`,
    name: l.name,
    category1: "Products",
    itemType: (l.digital ? "VIRTUAL" : "PHYSICAL") as "VIRTUAL" | "PHYSICAL",
    price: centsToDecimal(l.unitCents * l.quantity),
    ...share(l.unitCents * l.quantity, true),
  }));
  if (order.shippingCents > 0) {
    items.push({
      id: "shipping",
      name: "Shipping",
      category1: "Shipping",
      itemType: "VIRTUAL",
      price: centsToDecimal(order.shippingCents),
      ...share(order.shippingCents, false),
    });
  }
  const total = centsToDecimal(order.totalCents);
  const { paymentPageUrl } = await initializeCheckoutForm(
    deps.account.keys,
    {
      conversationId: `order-${orderNumber(order)}`,
      price: total,
      paidPrice: total,
      currency: order.currency,
      basketId: String(order.id),
      callbackUrl: deps.callbackUrl,
      buyer: {
        id: order.userId !== null ? `customer-${order.userId}` : `guest-${order.id}`,
        name: first!,
        surname: rest.join(" ") || first!,
        gsmNumber: customer.phone,
        email: customer.email,
        // iyzico asks for a Turkish ID number; shops that don't collect it send this placeholder.
        identityNumber: "11111111111",
        registrationAddress: customer.address,
        ip: deps.ip,
        city: customer.city,
        country: "Turkey",
      },
      billingAddress: address,
      ...(order.lines.some((l) => !l.digital) ? { shippingAddress: address } : {}),
      basketItems: items,
    },
    { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
  );
  return paymentPageUrl;
}

export type PaymentOutcome = "paid" | "already_paid" | "failed";

/**
 * Checks a payment with iyzico after its callback and marks the order paid.
 * The callback itself proves nothing: only iyzico's answer to our signed
 * request does, and only for this order's basket and total.
 */
export async function completePayment(deps: PaymentDeps & { order: CatalogOrder; iyzicoToken: string }): Promise<PaymentOutcome> {
  const { order } = deps;
  if (order.status !== "pending") return order.status === "failed" || order.status === "cancelled" ? "failed" : "already_paid";
  let result;
  try {
    result = await retrieveCheckoutForm(
      deps.account.keys,
      { token: deps.iyzicoToken, conversationId: `order-${orderNumber(order)}` },
      { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return "failed";
    throw e;
  }
  if (!result.paid || result.basketId !== String(order.id) || result.paidCents < order.totalCents || !result.paymentId) return "failed";
  const changed = await deps.store.payCatalogOrder(order.appId, order.id, result.paymentId, deps.now);
  if (changed && order.commissionCents !== null) {
    await deps.store.updateCatalogOrder(order.appId, order.id, { itemTransactionIds: result.transactionIds, updatedAt: deps.now });
  }
  return changed ? "paid" : "already_paid";
}

/**
 * Releases the shop's share of a marketplace order: iyzico pays each
 * approved item to the shop, minus Yallapp's commission. Done when the shop
 * completes the order, or by our team. True once every item is approved.
 */
export async function approvePayout(deps: PaymentDeps & { order: CatalogOrder }): Promise<boolean> {
  const { order } = deps;
  if (order.commissionCents === null || order.payoutApprovedAt || !order.itemTransactionIds?.length) return Boolean(order.payoutApprovedAt);
  try {
    for (const id of order.itemTransactionIds) {
      await approvePaymentItem(
        deps.account.keys,
        { conversationId: `order-${orderNumber(order)}`, paymentTransactionId: id },
        { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
      );
    }
  } catch (e) {
    if (e instanceof IyzicoError) return false;
    throw e;
  }
  await deps.store.updateCatalogOrder(order.appId, order.id, { payoutApprovedAt: deps.now, updatedAt: deps.now });
  return true;
}

/** 26 "Pickup at 13:30 on Tue 13 Oct", "Delivery as soon as possible: Moda Cd. 12, Moda": how a restaurant's order is collected. */
export function fulfilmentLine(fulfilment: CatalogFulfilment, timezone: string): string {
  const how = fulfilment.type === "delivery" ? "Delivery" : "Pickup";
  const at = fulfilment.scheduledFor ? scheduledText(fulfilment.scheduledFor, timezone) : "as soon as possible";
  const address = fulfilment.address ? `: ${[fulfilment.address.address, fulfilment.address.district].filter(Boolean).join(", ")}${fulfilment.address.notes ? ` (${fulfilment.address.notes})` : ""}` : "";
  return `${how} ${at}${address}`;
}

/** 26 "at 13:30 on Tue 13 Oct", in the kitchen's time zone. */
export function scheduledText(iso: string, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short", day: "numeric", month: "short" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `at ${parts.hour}:${parts.minute} on ${parts.weekday} ${parts.day} ${parts.month}`;
}

/** The values of the shop owner's "New order" email (lib/email/templates.ts) for a paid order. */
export function newOrderMailValues(order: CatalogOrder, appName: string, dashboardUrl: string, timezone = "Europe/Istanbul"): Record<string, string> {
  const money = (cents: number) => formatCents(cents, order.currency);
  const c = order.customer;
  return {
    app_name: appName,
    order_number: orderNumber(order),
    total: money(order.totalCents),
    order_lines: [
      // 26 A dish's options in brackets, and how a restaurant's order is collected.
      ...order.lines.map((l) => `${l.name}${l.options?.length ? ` (${optionsText(l)})` : ""} × ${l.quantity}: ${money(l.unitCents * l.quantity)}`),
      ...(order.shippingCents > 0 ? [`${order.fulfilment ? "Delivery fee" : "Shipping"}: ${money(order.shippingCents)}`] : []),
      ...(order.fulfilment ? ["", fulfilmentLine(order.fulfilment, timezone)] : []),
    ].join("\n"),
    customer: c ? `${[c.name, c.phone, c.email, `${c.address}, ${c.city}`].join("\n")}\n\n` : "",
    orders_url: dashboardUrl,
  };
}

/** The email telling the shop owner about a paid order, with the default template (sending uses the team's edit). */
export function newOrderMail(order: CatalogOrder, appName: string, dashboardUrl: string, timezone?: string): { subject: string; text: string } {
  const { subject, text } = renderTemplate(emailTemplate("new_order")!, newOrderMailValues(order, appName, dashboardUrl, timezone));
  return { subject, text };
}

/**
 * 27 A paid membership order starts its membership at once (apps whose
 * bookings are managed in the dashboard: their orders are memberships).
 * Plans are never deleted, only taken off sale, so the plan is still there.
 */
export async function startPaidMemberships(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<void> {
  if (app.connector?.kind !== "bookings" || order.userId === null) return;
  const { membershipPlans } = bookingSetup(app);
  const started = await store.listMemberships({ appId: app.id, userId: order.userId, limit: 500 });
  if (started.some((m) => m.orderId === order.id)) return;
  for (const line of order.lines) {
    const plan = membershipPlans.find((p) => p.id === line.productId);
    if (!plan) continue;
    await store.createMembership({
      appId: app.id,
      userId: order.userId,
      planId: plan.id,
      planName: line.name,
      period: plan.period,
      creditsLeft: plan.credits,
      status: "active",
      startsAt: now,
      endsAt: membershipEnd(plan.period, now),
      orderId: order.id,
      createdAt: now,
      updatedAt: now,
    });
  }
  // Nothing to deliver: the order is done once the membership runs.
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
}

/** A paid course order enrols its student in its courses (apps whose courses are managed in the dashboard). */
export async function enrollPaidCourses(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<void> {
  if (app.connector?.kind !== "courses" || order.userId === null) return;
  for (const line of order.lines) {
    await store.enrollInCourse({ appId: app.id, userId: order.userId, courseId: line.productId, source: "paid", enrolledAt: now });
  }
  // Nothing to deliver: the order is done once the student is in.
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
}

/**
 * 28 A paid ticket order issues its tickets: the places held when the
 * checkout link was made become valid tickets, and only now (after iyzico
 * confirmed the payment, or a demo order was placed). Apps whose events are
 * managed in the dashboard only.
 */
export async function issuePaidTickets(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<number> {
  if (app.connector?.kind !== "events") return 0;
  const issued = await store.issueOrderTickets(app.id, order.id, now);
  // Nothing to deliver: the tickets are in the buyer's app.
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
  return issued;
}

/** What a paid order delivers right away: enrolments for courses, 27 a gym's membership, 28 tickets for events. */
export async function deliverPaidOrder(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<void> {
  await enrollPaidCourses(store, app, order, now);
  await startPaidMemberships(store, app, order, now);
  await issuePaidTickets(store, app, order, now);
}
