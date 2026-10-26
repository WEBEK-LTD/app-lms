import { membershipEnd } from "../bookings/memberships";
import { spendOrderPoints } from "./loyalty";
import { taxLabel } from "./tax";
import { bookingSetup } from "../bookings/setup";
import { parseAnyPhone } from "../hosted/phone";
import { hostedSettings } from "../hosted/service";
import type { DataStore } from "../data/store";
import type { App, CatalogCustomer, CatalogFulfilment, CatalogOrder } from "../data/types";
import { PaymentError } from "../payments/errors";
import { approvePaymentItem, IyzicoError } from "../payments/iyzico";
import { confirmCheckout, startCheckout, type CheckoutLine, type ProviderUrls } from "../payments/provider";
import { spreadDiscount } from "./coupons";
import { formatCents } from "./money";
import { getDashT } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { optionsText } from "./options";
import { orderNumber, type CheckoutAccount } from "./settings";
import { emailTemplate, renderTemplate } from "../email/templates";
import { checkTicketHold, holdForPayment, noticeRefundDue, providerPageExpiry } from "../events/holds";
import { noteAppError } from "../watch/app-errors";

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
  /** The shop's own account (37 iyzico, Kashier, Fawaterk, Stripe or PayPal); 72 for an old marketplace order, the account it started with. */
  account: CheckoutAccount;
  fetcher?: typeof fetch;
  /** The providers' addresses in tests. */
  urls?: ProviderUrls;
  now: Date;
}

/** Saves the customer on the order and starts the card payment; returns the provider's payment page. */
export async function startPayment(
  deps: PaymentDeps & {
    order: CatalogOrder;
    customer: CatalogCustomer;
    ip: string;
    /** Where the provider sends the customer back, and posts its webhook (lib/payments/routes.ts). */
    callbackUrls: { returnUrl: string; webhookUrl: string | null };
  },
): Promise<string> {
  const { order, customer } = deps;
  const { account } = deps.account;
  // 72 Yallapp never collects payments for its clients: a sale is always paid into the shop's own account.
  if (deps.account.marketplace) throw new Error("A sale is never paid into Yallapp's account.");
  // 49 Tickets: never start a payment for places already released.
  await checkTicketHold(deps.store, deps.app, order, deps.now);
  const tickets = deps.app.connector?.kind === "events";
  // 91.1 A coupon's discount (91.4 and the points') comes off the products, so the lines add up to what is charged.
  const lineCents = spreadDiscount(
    order.lines.map((l) => l.unitCents * l.quantity),
    (order.discountCents ?? 0) + (order.points?.discountCents ?? 0),
  );
  const lines: CheckoutLine[] = order.lines.map((l, i) => ({
    id: `${l.productId}-${i}`,
    name: l.quantity > 1 && account.provider !== "iyzico" ? `${l.name} × ${l.quantity}` : l.name,
    cents: lineCents[i]!,
    category: "Products",
    digital: l.digital,
  }));
  if (order.shippingCents > 0) {
    lines.push({ id: "shipping", name: "Shipping", cents: order.shippingCents, category: "Shipping", digital: true });
  }
  // 91.5 An added tax is its own line, so the lines add up to what is charged.
  if (order.tax && !order.tax.included && order.tax.cents > 0) {
    lines.push({ id: "tax", name: order.tax.label, cents: order.tax.cents, category: "Tax", digital: true });
  }
  const started = await startCheckout(
    account,
    {
      reference: `order-${order.id}`,
      amountCents: order.totalCents,
      currency: order.currency,
      description: `Order ${orderNumber(order)}${deps.app.appName ? ` from ${deps.app.appName}` : ""}`,
      lines,
      customer: {
        id: order.userId !== null ? `customer-${order.userId}` : `guest-${order.id}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        address: customer.address,
        ip: deps.ip,
      },
      returnUrl: deps.callbackUrls.returnUrl,
      webhookUrl: deps.callbackUrls.webhookUrl,
      iyzico: { conversationId: `order-${orderNumber(order)}`, basketId: String(order.id), shipping: order.lines.some((l) => !l.digital) },
      ...(tickets ? { pageExpiresAt: providerPageExpiry(deps.now) } : {}),
    },
    { fetcher: deps.fetcher, urls: deps.urls },
  );
  // 49 The places are held exactly as long as the provider's page takes the payment.
  if (tickets) await holdForPayment(deps.store, deps.app, order, started.expiresAt, deps.now);
  // 37 The provider and its reference stay on the order: the payment is read back from that provider.
  await deps.store.updateCatalogOrder(order.appId, order.id, {
    customer,
    commissionCents: null,
    paymentProvider: account.provider,
    providerRef: started.providerRef.slice(0, 191),
    updatedAt: deps.now,
  });
  return started.url;
}

/** 37 "pending": Kashier or Fawaterk haven't confirmed it (yet); their webhook may still do. */
export type PaymentOutcome = "paid" | "already_paid" | "pending" | "failed";

/**
 * Reads the payment back from the provider after its callback, redirect or
 * webhook, and marks the order paid. The trigger itself proves nothing:
 * only the provider's answer to our own authenticated request does, and
 * only for this order's reference, total and currency. payCatalogOrder only
 * changes a pending order, so the order is paid (and delivered) once.
 */
export async function completePayment(
  deps: PaymentDeps & {
    order: CatalogOrder;
    /** iyzico: the token its callback posted. */
    iyzicoToken?: string;
    /** 37 Kashier's session or Fawaterk's invoice named by a webhook; the one kept on the order otherwise. */
    providerRef?: string | null;
  },
): Promise<PaymentOutcome> {
  const { order } = deps;
  if (order.status !== "pending") return order.status === "failed" || order.status === "cancelled" ? "failed" : "already_paid";
  const provider = order.paymentProvider ?? "iyzico";
  if (deps.account.account.provider !== provider) return "failed";
  let result;
  try {
    result = await confirmCheckout(
      deps.account.account,
      {
        reference: `order-${order.id}`,
        amountCents: order.totalCents,
        currency: order.currency,
        providerRef: deps.providerRef ?? order.providerRef ?? null,
        ...(deps.iyzicoToken ? { iyzico: { token: deps.iyzicoToken, conversationId: `order-${orderNumber(order)}`, basketId: String(order.id) } } : {}),
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
  } catch (e) {
    if (e instanceof PaymentError) {
      // 78.4 The provider couldn't confirm it: counted for the team.
      await noteAppError(deps.store, { clientId: deps.app.clientId, appId: deps.app.id, source: "payment", code: `${provider}_confirm_failed`, detail: e.message }, deps.now);
      return provider === "iyzico" ? "failed" : "pending";
    }
    throw e;
  }
  if (!result.paid) return provider === "iyzico" ? "failed" : "pending";
  const changed = await deps.store.payCatalogOrder(order.appId, order.id, result.paymentId, deps.now);
  if (changed && order.commissionCents !== null) {
    await deps.store.updateCatalogOrder(order.appId, order.id, { itemTransactionIds: result.transactionIds, updatedAt: deps.now });
  }
  return changed ? "paid" : "already_paid";
}

/**
 * Releases the shop's share of a marketplace order. Done when the shop
 * completes the order, or by our team. With iyzico, iyzico pays each
 * approved item to the shop, minus Yallapp's commission: true once every
 * item is approved. 37 With Kashier or Fawaterk the whole payment is in
 * Yallapp's account: the release is recorded, and the team transfers the
 * share to the shop's IBAN.
 */
export async function approvePayout(deps: PaymentDeps & { order: CatalogOrder }): Promise<boolean> {
  const { order } = deps;
  if (order.commissionCents === null || order.payoutApprovedAt) return Boolean(order.payoutApprovedAt);
  const account = deps.account.account;
  if (account.provider !== "iyzico") {
    await deps.store.updateCatalogOrder(order.appId, order.id, { payoutApprovedAt: deps.now, updatedAt: deps.now });
    return true;
  }
  if (!order.itemTransactionIds?.length) return false;
  try {
    for (const id of order.itemTransactionIds) {
      await approvePaymentItem(
        account.keys,
        { conversationId: `order-${orderNumber(order)}`, paymentTransactionId: id },
        { fetcher: deps.fetcher, baseUrl: deps.urls?.iyzico },
      );
    }
  } catch (e) {
    if (e instanceof IyzicoError) return false;
    throw e;
  }
  await deps.store.updateCatalogOrder(order.appId, order.id, { payoutApprovedAt: deps.now, updatedAt: deps.now });
  return true;
}

/** 26 "Pickup at 13:30 on Tue 13 Oct", "Delivery as soon as possible: Moda Cd. 12, Moda": how a restaurant's order is collected; 56 in a language. */
export function fulfilmentLine(fulfilment: CatalogFulfilment, timezone: string, lang: Lang = "en"): string {
  const place = fulfilment.address
    ? `${[fulfilment.address.address, fulfilment.address.district].filter(Boolean).join(", ")}${fulfilment.address.notes ? ` (${fulfilment.address.notes})` : ""}`
    : "";
  if (lang !== "en") {
    const t = getDashT(lang);
    const at = fulfilment.scheduledFor ? new Date(fulfilment.scheduledFor) : null;
    const line = t("orders.collect", {
      how: fulfilment.type === "delivery" ? t("shop.delivery") : t("shop.pickup"),
      when: at
        ? t("orders.scheduled", {
            time: formatDate(lang, at, { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
            date: formatDate(lang, at, { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }),
          })
        : t("orders.asap"),
    });
    return place ? t("emails.withAddress", { line, address: place }) : line;
  }
  const how = fulfilment.type === "delivery" ? "Delivery" : "Pickup";
  const at = fulfilment.scheduledFor ? scheduledText(fulfilment.scheduledFor, timezone) : "as soon as possible";
  return `${how} ${at}${place ? `: ${place}` : ""}`;
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
export function newOrderMailValues(order: CatalogOrder, appName: string, dashboardUrl: string, timezone = "Europe/Istanbul", lang: Lang = "en"): Record<string, string> {
  const money = (cents: number) => formatCents(cents, order.currency);
  const t = getDashT(lang);
  const shipping = (amount: string) =>
    lang === "en" ? `${order.fulfilment ? "Delivery fee" : "Shipping"}: ${amount}` : t(order.fulfilment ? "emails.deliveryFee" : "emails.shipping", { amount });
  const discount = (amount: string) =>
    lang === "en" ? `Coupon ${order.couponCode}: -${amount}` : t("emails.coupon", { code: order.couponCode ?? "", amount });
  const points = (n: number, amount: string) => (lang === "en" ? `Loyalty points (${n}): -${amount}` : t("emails.points", { points: String(n), amount }));
  const c = order.customer;
  return {
    app_name: appName,
    order_number: orderNumber(order),
    total: money(order.totalCents),
    order_lines: [
      // 26 A dish's options in brackets, and how a restaurant's order is collected.
      ...order.lines.map((l) => `${l.name}${l.options?.length ? ` (${optionsText(l)})` : ""} × ${l.quantity}: ${money(l.unitCents * l.quantity)}`),
      ...(order.discountCents ? [discount(money(order.discountCents))] : []),
      ...(order.points?.discountCents ? [points(order.points.used, money(order.points.discountCents))] : []),
      ...(order.shippingCents > 0 ? [shipping(money(order.shippingCents))] : []),
      // 91.5 The tax, added or inside the total.
      ...(order.tax ? [`${order.tax.included ? (lang === "en" ? "Includes " : `${t("emails.includes")} `) : ""}${taxLabel(order.tax)}: ${money(order.tax.cents)}`] : []),
      ...(order.fulfilment ? ["", fulfilmentLine(order.fulfilment, timezone, lang)] : []),
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
export async function issuePaidTickets(store: DataStore, app: App, order: CatalogOrder, now: Date, baseUrl = ""): Promise<number> {
  if (app.connector?.kind !== "events") return 0;
  const { issued, released } = await store.issueOrderTickets(app.id, order.id, now);
  if (released > 0 && issued === 0) {
    // 49 Paid after the hold ended and the event filled up: no tickets, the order stays paid, the owner refunds it.
    await noticeRefundDue(store, app, order, now, baseUrl);
    return 0;
  }
  // Nothing to deliver: the tickets are in the buyer's app.
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
  return issued;
}

/** What a paid order delivers right away: enrolments for courses, 27 a gym's membership, 28 tickets for events. */
export async function deliverPaidOrder(store: DataStore, app: App, order: CatalogOrder, now: Date, baseUrl = ""): Promise<void> {
  // 91.1 A paid order counts one use of its coupon.
  if (order.couponCode) {
    const coupon = await store.getCatalogCouponByCode(app.id, order.couponCode);
    if (coupon) await store.useCatalogCoupon(app.id, coupon.id);
  }
  // 91.4 And spends the loyalty points it used.
  await spendOrderPoints(store, order, now);
  await enrollPaidCourses(store, app, order, now);
  await startPaidMemberships(store, app, order, now);
  await issuePaidTickets(store, app, order, now, baseUrl);
}
