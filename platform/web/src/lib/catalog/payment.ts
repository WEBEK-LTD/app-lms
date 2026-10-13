import { parseAnyPhone } from "../hosted/phone";
import { hostedSettings } from "../hosted/service";
import type { DataStore } from "../data/store";
import type { App, CatalogCustomer, CatalogOrder } from "../data/types";
import { initializeCheckoutForm, IyzicoError, retrieveCheckoutForm, type IyzicoKeys } from "../payments/iyzico";
import { centsToDecimal, formatCents } from "./money";
import { orderNumber } from "./settings";

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
  keys: IyzicoKeys;
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
  await deps.store.updateCatalogOrder(order.appId, order.id, { customer, updatedAt: deps.now });
  const [first, ...rest] = customer.name.split(/\s+/);
  const address = { contactName: customer.name, city: customer.city, country: "Turkey", address: customer.address };
  const items = order.lines.map((l, i) => ({
    id: `${l.productId}-${i}`,
    name: l.name,
    category1: "Products",
    itemType: (l.digital ? "VIRTUAL" : "PHYSICAL") as "VIRTUAL" | "PHYSICAL",
    price: centsToDecimal(l.unitCents * l.quantity),
  }));
  if (order.shippingCents > 0) {
    items.push({ id: "shipping", name: "Shipping", category1: "Shipping", itemType: "VIRTUAL", price: centsToDecimal(order.shippingCents) });
  }
  const total = centsToDecimal(order.totalCents);
  const { paymentPageUrl } = await initializeCheckoutForm(
    deps.keys,
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
      deps.keys,
      { token: deps.iyzicoToken, conversationId: `order-${orderNumber(order)}` },
      { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return "failed";
    throw e;
  }
  if (!result.paid || result.basketId !== String(order.id) || result.paidCents < order.totalCents || !result.paymentId) return "failed";
  const changed = await deps.store.payCatalogOrder(order.appId, order.id, result.paymentId, deps.now);
  return changed ? "paid" : "already_paid";
}

/** The email telling the shop owner about a paid order. */
export function newOrderMail(order: CatalogOrder, appName: string, dashboardUrl: string): { subject: string; text: string } {
  const money = (cents: number) => formatCents(cents, order.currency);
  const c = order.customer;
  return {
    subject: `New order ${orderNumber(order)} · ${money(order.totalCents)}`,
    text: [
      `A customer paid for an order in ${appName}.`,
      "",
      ...order.lines.map((l) => `${l.name} × ${l.quantity}: ${money(l.unitCents * l.quantity)}`),
      ...(order.shippingCents > 0 ? [`Shipping: ${money(order.shippingCents)}`] : []),
      `Total: ${money(order.totalCents)}`,
      "",
      ...(c ? [c.name, c.phone, c.email, `${c.address}, ${c.city}`, ""] : []),
      `See your orders: ${dashboardUrl}`,
    ].join("\n"),
  };
}
