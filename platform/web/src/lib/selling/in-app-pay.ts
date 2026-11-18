import { usesPlugin } from "../app/label";
import { catalogSettings, isOwnPayment, orderNumber, PAY_LINK_MINUTES, type OwnPaymentInput } from "../catalog/settings";
import { randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type {
  App,
  CatalogCurrency,
  CatalogCustomer,
  CatalogOrder,
  CatalogOrderLine,
  CatalogSettings,
  OrderDelivery,
  OwnPayment,
  PaymentProviderId,
  PlatformOrderIntent,
  PlatformOrderLine,
  StorePlatformOrder,
} from "../data/types";
import { siteApp, type Fail } from "../license/chat";
import { parseSiteInfo } from "../license/service";
import { pushNotice } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import { payLinkForApps } from "../payments/pay-link";
import { PROVIDER_NAME, providerTakes } from "../payments/provider";
import { compareVersions } from "../semver";
import { orderRefundOptions, refundOrder, type RefundDeps, type RefundResult } from "../refunds/service";
import { noteAppError } from "../watch/app-errors";
import { callPaidOrders, type WooAnswer, type WooSiteDeps } from "./woo-paid-orders";

/**
 * 134 Pay inside the app, for a store app selling a connected platform's
 * products (Demo). The app's checkout prices the cart on the platform as
 * before; the customer then pays on Yallapp's payment page, through the
 * owner's own gateway (Stripe, PayPal, Kashier, Fawaterk, iyzico: the money
 * goes to the owner's account, never Yallapp's, and Yallapp adds no fee);
 * once the payment is verified (its webhook or return, read back from the
 * gateway as for every payment, lib/payments/settle.ts), Yallapp creates the
 * order on the platform, marked paid, once per payment. A platform that
 * refuses it (sold out, an error) leaves the payment "Paid, needs attention"
 * for the owner, who retries or refunds; the customer is told the shop will
 * confirm the order.
 *
 * The payment is a catalog order (its page, its gateways, the pending
 * payments check and refunds are the shop's own), with its platform order
 * beside it (`StorePlatformOrder`). Its lines' `productId` is 0: they are
 * the platform's products, never Yallapp's, so nothing of Yallapp's own
 * stock or sales changes.
 *
 * Where it works: WooCommerce on WordPress (the plugin, from 0.4.47). Not
 * on Shopify (its API terms keep payments on Shopify Checkout), Wix (its
 * Create Order API can't yet be confirmed for the connector's keys) or the
 * other platforms (their connectors can't create orders), whose stores keep
 * their own checkout.
 */

/** The plugin that knows the in-app payment. */
export const IN_APP_PLUGIN_VERSION = "0.4.47";
/** A "placing" left this long (the server stopped half way) may be tried again. */
const STALE_PLACING_MS = 5 * 60_000;

export type CheckoutPayment = "platform" | "in_app";

/** Why a store app can't pay inside the app: its own products (Yallapp's checkout), or its platform's. */
export type InAppBlock = "not_store" | "own_products" | "shopify_terms" | "wix_unverified" | "platform_unsupported" | "own_api";

/** Where a store app's products are, for "How customers pay". */
export type CheckoutSource = "catalog" | "wordpress" | "shopify" | "wix" | "platform" | "own_api" | "none";

export function checkoutSourceOf(app: Pick<App, "connector" | "backend">): CheckoutSource {
  const kind = app.connector?.kind;
  if (kind === "catalog") return "catalog";
  if (kind === "shopify") return "shopify";
  if (app.connector?.kind === "platform") return app.connector.platform === "wix" ? "wix" : "platform";
  if (!kind && app.backend === "wordpress" && usesPlugin(app)) return "wordpress";
  if (app.backend === "custom_api") return "own_api";
  return "none";
}

/** Null when the store's platform takes orders paid inside the app. */
export function inAppBlock(app: Pick<App, "appType" | "connector" | "backend">): InAppBlock | null {
  if (app.appType !== "store") return "not_store";
  switch (checkoutSourceOf(app)) {
    case "wordpress":
      return null;
    case "catalog":
      return "own_products";
    case "shopify":
      return "shopify_terms";
    case "wix":
      return "wix_unverified";
    case "own_api":
      return "own_api";
    default:
      return "platform_unsupported";
  }
}

/** A fingerprint of the saved gateway keys (their encrypted values; never the keys), so a new key needs a new test. 155 What Stripe said of the wallets' domain isn't a key. */
export function gatewayKeysFingerprint(payment: OwnPayment): string {
  const keys: Record<string, unknown> = { ...payment };
  delete keys.webhook;
  delete keys.wallets;
  return sha256Hex(JSON.stringify(keys)).slice(0, 32);
}

export interface InAppReadiness {
  blocked: InAppBlock | null;
  /** The owner's own gateway, saved; null: none. */
  gateway: PaymentProviderId | null;
  /** When "Test connection" last passed on those keys; null: not since they were saved. */
  testedAt: string | null;
  demo: boolean;
  /** Everything it needs: a platform that takes it, the gateway saved and tested, not a demo. */
  ready: boolean;
}

/** The keys that decide whether a test is of the saved account (never compared outside the server). */
function keyFields(input: OwnPaymentInput): string {
  switch (input.provider) {
    case "stripe":
      return JSON.stringify([input.provider, input.secretKey, input.sandbox]);
    case "paypal":
      return JSON.stringify([input.provider, input.clientId, input.secret, input.sandbox]);
    case "kashier":
      return JSON.stringify([input.provider, input.merchantId, input.apiKey, input.secretKey, input.sandbox]);
    case "fawaterk":
      return JSON.stringify([input.provider, input.apiKey, input.sandbox]);
    default:
      return JSON.stringify([input.provider, input.apiKey, input.secretKey, input.sandbox]);
  }
}

/**
 * 134 "Test connection" passed: when its keys are the saved ones (typed
 * again, or left empty), it is what paying inside the app needs; null
 * otherwise (keys typed but not saved yet).
 */
export function testedOnSaved(app: App, tested: OwnPaymentInput, saved: OwnPaymentInput | null, now: Date): NonNullable<CatalogSettings["gatewayTested"]> | null {
  const payment = catalogSettings(app).payment;
  if (!saved || !isOwnPayment(payment) || payment.provider !== tested.provider || keyFields(saved) !== keyFields(tested)) return null;
  return { at: now.toISOString(), provider: payment.provider, keys: gatewayKeysFingerprint(payment) };
}

export function inAppReadiness(app: App): InAppReadiness {
  const settings = catalogSettings(app);
  const own = isOwnPayment(settings.payment) ? settings.payment : null;
  const tested = settings.gatewayTested;
  const testedAt = own && tested && tested.provider === own.provider && tested.keys === gatewayKeysFingerprint(own) ? tested.at : null;
  const blocked = inAppBlock(app);
  const demo = app.demo === true;
  return { blocked, gateway: own?.provider ?? null, testedAt, demo, ready: !blocked && own !== null && testedAt !== null && !demo };
}

/** What the store's checkout does now: inside the app only when chosen and ready; otherwise the platform's own checkout. */
export function checkoutPaymentOf(app: App): CheckoutPayment {
  return catalogSettings(app).checkoutPayment === "in_app" && inAppReadiness(app).ready ? "in_app" : "platform";
}

/** `LicenseStatus.store_checkout` (platform.yaml): the plugin offers the in-app payment while it is on. */
export function storeCheckoutStatus(app: App): { payment: "in_app"; gateway: PaymentProviderId; gateway_name: string } | null {
  if (checkoutSourceOf(app) !== "wordpress" || checkoutPaymentOf(app) !== "in_app") return null;
  const gateway = inAppReadiness(app).gateway!;
  return { payment: "in_app", gateway, gateway_name: PROVIDER_NAME[gateway] };
}

/** Whether the site's plugin knows the in-app payment (an older one keeps the store's checkout). */
export function pluginTakesInAppPayment(version: string | null | undefined): boolean {
  return typeof version === "string" && compareVersions(version, IN_APP_PLUGIN_VERSION) >= 0;
}

// The plugin's request

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown, max: number): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
const CURRENCIES: readonly CatalogCurrency[] = ["TRY", "USD", "EUR", "EGP", "SAR", "AED"];

/** An amount ("150", "150.5", "150.50", or a number) in cents; null when it isn't one. */
export function amountCents(value: unknown): number | null {
  const raw = typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,9}(\.\d{1,6})?$/.test(raw)) return null;
  return Math.round(Number(raw) * 100);
}

const positiveInt = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null);

function attributesOf(value: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  const entries = Object.entries(record(value));
  if (entries.length > 20) return null;
  for (const [key, v] of entries) {
    if (!/^[A-Za-z0-9_\-%.]{1,100}$/.test(key) || typeof v !== "string" || v.length > 200) return null;
    out[key] = v;
  }
  return out;
}

/** What the plugin sends to start a payment, checked. */
export interface PluginOrder {
  intent: PlatformOrderIntent;
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  lang: string | null;
}

export function readPluginOrder(body: unknown): { ok: true; value: PluginOrder } | { ok: false; message: string } {
  const input = record(body);
  const currency = input.currency;
  if (typeof currency !== "string" || !(CURRENCIES as readonly string[]).includes(currency)) return { ok: false, message: "currency must be one of TRY, USD, EUR, EGP, SAR or AED." };
  const platform = input.platform === "ios" ? "ios" : input.platform === "android" ? "android" : null;
  if (!platform) return { ok: false, message: "platform must be android or ios." };
  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 50) return { ok: false, message: "lines must hold 1 to 50 lines." };
  const lines: PlatformOrderLine[] = [];
  for (const raw of input.lines) {
    const line = record(raw);
    const productId = positiveInt(line.product_id);
    const variation = line.variation_id === null || line.variation_id === undefined || line.variation_id === 0 ? null : positiveInt(line.variation_id);
    const quantity = positiveInt(line.quantity);
    const name = text(line.name, 200);
    const unitCents = amountCents(line.unit_amount);
    const totalCents = amountCents(line.total_amount);
    const attributes = attributesOf(line.attributes);
    const addonOf = line.addon_of === null || line.addon_of === undefined || line.addon_of === 0 ? null : positiveInt(line.addon_of);
    if (!productId || (line.variation_id && !variation) || !quantity || quantity > 999 || !name || unitCents === null || totalCents === null || !attributes || (line.addon_of && !addonOf)) {
      return { ok: false, message: "Each line needs product_id, quantity (1 to 999), name, unit_amount and total_amount." };
    }
    lines.push({ productId, variationId: variation, quantity, name, attributes, unitCents, totalCents, addonOf, digital: line.digital === true });
  }
  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const discountCents = input.discount_amount === undefined || input.discount_amount === null ? 0 : amountCents(input.discount_amount);
  const feeCents = input.fee_amount === undefined || input.fee_amount === null ? 0 : amountCents(input.fee_amount);
  if (discountCents === null || discountCents > subtotalCents) return { ok: false, message: "discount_amount must be an amount up to the lines' total." };
  if (feeCents === null) return { ok: false, message: "fee_amount must be an amount." };
  if (subtotalCents - discountCents + feeCents <= 0) return { ok: false, message: "There's nothing to pay." };
  const coupon = input.coupon === null || input.coupon === undefined || input.coupon === "" ? null : text(input.coupon, 50) || null;
  const extras = record(input.extras);
  if (JSON.stringify(extras).length > 8000) return { ok: false, message: "extras is too long." };
  const customer = record(input.customer);
  const userId = customer.user_id === null || customer.user_id === undefined ? null : positiveInt(customer.user_id);
  const country = text(customer.country, 2).toUpperCase();
  const buyer = {
    name: text(customer.name, 80),
    email: text(customer.email, 191),
    phone: text(customer.phone, 24),
    city: text(customer.city, 60),
    address: text(customer.address, 300),
    country: /^[A-Z]{2}$/.test(country) ? country : "",
  };
  const lang = /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(text(input.lang, 12)) ? text(input.lang, 12) : null;
  return {
    ok: true,
    value: {
      intent: { currency: currency as CatalogCurrency, lines, coupon, extras, customerId: userId, buyer: Object.values(buyer).some(Boolean) ? buyer : null, platform },
      subtotalCents,
      discountCents,
      feeCents,
      lang,
    },
  };
}

/** The catalog order's lines for the payment page and the gateway: each adds up to its own total (a total that doesn't split evenly is one line "Name × 3"). */
export function paymentLines(lines: PlatformOrderLine[]): CatalogOrderLine[] {
  return lines.map((l) => {
    const even = l.totalCents % l.quantity === 0;
    return {
      productId: 0,
      name: even ? l.name : `${l.name} × ${l.quantity}`,
      quantity: even ? l.quantity : 1,
      unitCents: even ? l.totalCents / l.quantity : l.totalCents,
      imageAssetId: null,
      digital: l.digital,
    };
  });
}

/** The checkout extras as the payment page and the owner read them (the day, the slot, the people, the card); null: none. */
export function deliveryOfExtras(extras: Record<string, unknown>, feeCents: number): OrderDelivery | null {
  const date = typeof extras.delivery_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(extras.delivery_date) ? extras.delivery_date : null;
  const label = text(extras.slot_label, 40);
  const times = /(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/.exec(label);
  const slotId = text(extras.delivery_slot, 16);
  const sender = record(extras.sender);
  const recipient = record(extras.recipient);
  const message = text(extras.gift_message, 500) || null;
  const delivery: OrderDelivery = {
    date,
    slot: slotId && times ? { id: slotId, start: times[1]!, end: times[2]! } : null,
    feeCents,
    sender: text(sender.name, 80) ? { name: text(sender.name, 80), phone: text(sender.phone, 24), email: text(sender.email, 191) } : null,
    recipient: text(recipient.name, 80) ? { name: text(recipient.name, 80), phone: text(recipient.phone, 24), address: text(recipient.address, 300) || null } : null,
    message,
    anonymous: extras.gift_anonymous === true,
  };
  return delivery.date || delivery.sender || delivery.recipient || delivery.message ? delivery : null;
}

/** The payment's reference on the platform: one order per payment. */
export const paymentReference = (order: Pick<CatalogOrder, "id">) => `yallapp-order-${order.id}`;

/**
 * 134 `POST /api/v1/store/payments` (platform.yaml, startStorePayment): the
 * plugin, which priced the app's cart, asks for the payment page. Refused
 * (the plugin then opens the store's own checkout) when the store doesn't
 * pay inside the app, or its gateway doesn't take the store's currency.
 */
export async function startSiteStorePayment(
  store: DataStore,
  body: unknown,
  deps: { now: Date; platformUrl: string },
): Promise<{ status: 200; body: { url: string; expires_at: string; payment_id: string; gateway: PaymentProviderId } } | Fail | { status: 409; body: { code: string; message: string } }> {
  const site = parseSiteInfo(body);
  if (!site.ok) return { status: 400, body: { code: "invalid_request", message: site.result.body.message } };
  const found = await siteApp(store, site.value, deps.now);
  if (!found.ok) return found.result;
  const { app } = found;
  if (checkoutPaymentOf(app) !== "in_app" || checkoutSourceOf(app) !== "wordpress") {
    return { status: 409, body: { code: "in_app_payment_off", message: "This store's customers pay on its own checkout." } };
  }
  const read = readPluginOrder(body);
  if (!read.ok) return { status: 400, body: { code: "invalid_request", message: read.message } };
  const { intent, subtotalCents, discountCents, feeCents } = read.value;
  const gateway = inAppReadiness(app).gateway!;
  if (!providerTakes(gateway, intent.currency)) {
    return { status: 409, body: { code: "currency_not_supported", message: `${PROVIDER_NAME[gateway]} doesn't take payments in ${intent.currency}.` } };
  }
  const token = randomToken(24);
  const order = await store.createCatalogOrder({
    lang: read.value.lang,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId: null,
    status: "pending",
    lines: paymentLines(intent.lines),
    subtotalCents,
    // The slot's fee until the shipping for the address is known (quoteBeforePayment).
    shippingCents: feeCents,
    totalCents: subtotalCents - discountCents + feeCents,
    couponCode: intent.coupon,
    discountCents,
    points: null,
    tax: null,
    currency: intent.currency,
    customer: null,
    paymentId: null,
    createdAt: deps.now,
    paidAt: null,
    updatedAt: deps.now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    fulfilment: null,
    fulfilmentStatus: null,
    delivery: deliveryOfExtras(intent.extras, feeCents),
    // The platform counts its own slots.
    deliveryDate: null,
  });
  await store.createStorePlatformOrder({
    appId: app.id,
    orderId: order.id,
    platform: "woocommerce",
    status: "awaiting_payment",
    intent,
    quote: null,
    platformOrderId: null,
    platformOrderNumber: null,
    problem: null,
    attempts: 0,
    createdAt: deps.now,
    updatedAt: deps.now,
  });
  return {
    status: 200,
    body: {
      url: payLinkForApps(deps.platformUrl, token),
      expires_at: new Date(deps.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(),
      payment_id: orderNumber(order),
      gateway,
    },
  };
}

// Before the payment: the platform's price for the address

/** The buyer's details for the platform: the payment page's (billing), and where it goes (the gift's recipient, else the buyer). */
function addresses(intent: PlatformOrderIntent, customer: CatalogCustomer) {
  const country = intent.buyer?.country || null;
  const recipient = record(intent.extras.recipient);
  const billing = { name: customer.name, phone: customer.phone, email: customer.email, city: customer.city, address: customer.address, country };
  const shipping = text(recipient.address, 300)
    ? { name: text(recipient.name, 80) || customer.name, phone: text(recipient.phone, 24) || customer.phone, city: text(recipient.city, 60) || customer.city, address: text(recipient.address, 300), country: text(recipient.country, 2).toUpperCase() || country }
    : { name: customer.name, phone: customer.phone, city: customer.city, address: customer.address, country };
  return { billing, shipping };
}

function payload(action: "quote" | "create", order: CatalogOrder, intent: PlatformOrderIntent, customer: CatalogCustomer, extra: Record<string, unknown> = {}) {
  const decimal = (cents: number) => (cents / 100).toFixed(2);
  return {
    action,
    reference: paymentReference(order),
    currency: intent.currency,
    lines: intent.lines.map((l) => ({
      product_id: l.productId,
      variation_id: l.variationId,
      quantity: l.quantity,
      attributes: l.attributes,
      addon_of: l.addonOf,
      unit_amount: decimal(l.unitCents),
      total_amount: decimal(l.totalCents),
    })),
    coupon: intent.coupon,
    extras: intent.extras,
    customer_id: intent.customerId,
    ...addresses(intent, customer),
    platform: intent.platform,
    ...extra,
  };
}

/** What a customer reads when the platform refused (its own words when it gave them). */
function refusal(answer: Extract<WooAnswer, { ok: false }>): string {
  if (answer.code === "unreachable" || answer.status === null || answer.status >= 500) return "The shop can't be reached right now. Please try again in a moment.";
  if (answer.code === "cart_changed" || answer.code === "out_of_stock") return `${answer.message} Go back to the app and check your cart.`;
  return "The shop couldn't price this order. Go back to the app and check out again.";
}

export type QuoteResult = { ok: true; changed: boolean } | { ok: false; code: string; message: string };

/**
 * 134 Right before the payment: the platform prices the order again for the
 * customer's address (its shipping and tax) and checks the stock. The
 * payment's total follows it; `changed` when it isn't what the payment page
 * showed (the customer sees the new total before paying). Null when the
 * order isn't a platform's.
 */
export async function quoteBeforePayment(deps: WooSiteDeps, app: App, order: CatalogOrder, customer: CatalogCustomer): Promise<QuoteResult | null> {
  const platformOrder = await deps.store.getStorePlatformOrder(app.id, order.id);
  if (!platformOrder) return null;
  if (platformOrder.status !== "awaiting_payment") return { ok: false, code: "closed", message: "This order is closed. Go back to the app and check out again." };
  const answer = await callPaidOrders(deps, app, payload("quote", order, platformOrder.intent, customer));
  if (!answer.ok) {
    if (answer.code === "unreachable" || (answer.status ?? 500) >= 500) {
      await noteAppError(deps.store, { clientId: app.clientId, appId: app.id, source: "wordpress", code: "paid_order_quote_failed", detail: `${answer.code}: ${answer.message}` }, deps.now);
    }
    return { ok: false, code: answer.code, message: refusal(answer) };
  }
  const body = answer.body;
  const quoted = Array.isArray(body.lines) ? body.lines.map(record) : [];
  const lines = platformOrder.intent.lines.map((l, i) => {
    const total = quoted.length === platformOrder.intent.lines.length ? amountCents(quoted[i]!.total_amount) : null;
    return total === null ? l : { ...l, totalCents: total, unitCents: Math.round(total / l.quantity) };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const shipping = amountCents(body.shipping_amount ?? 0);
  const fee = amountCents(body.fee_amount ?? 0);
  const tax = amountCents(body.tax_amount ?? 0);
  const discount = amountCents(body.discount_amount ?? 0);
  const total = amountCents(body.total_amount);
  if (shipping === null || fee === null || tax === null || discount === null || total === null || discount > subtotal || Math.abs(subtotal - discount + shipping + fee + tax - total) > 1 || total <= 0) {
    return { ok: false, code: "invalid_quote", message: "The shop couldn't price this order. Go back to the app and check out again." };
  }
  if (body.currency !== undefined && body.currency !== platformOrder.intent.currency) {
    return { ok: false, code: "currency_changed", message: "The shop's currency changed. Go back to the app and check out again." };
  }
  const changed = total !== order.totalCents;
  // The gateway's lines add up to what's charged: a cent of the shop's own rounding goes into the shipping line.
  const rounding = total - (subtotal - discount + shipping + fee + tax);
  await deps.store.updateCatalogOrder(app.id, order.id, {
    lines: paymentLines(lines),
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: Math.max(0, shipping + fee + rounding),
    tax: tax > 0 ? { label: "Tax", rateBps: 0, included: false, cents: tax } : null,
    totalCents: total,
    customer,
    updatedAt: deps.now,
  });
  await deps.store.updateStorePlatformOrder(app.id, order.id, {
    intent: { ...platformOrder.intent, lines },
    quote: { shippingCents: shipping, taxCents: tax, discountCents: discount, feeCents: fee, totalCents: total, at: deps.now.toISOString() },
    updatedAt: deps.now,
  });
  return { ok: true, changed };
}

// After the payment: the platform's order

export type Placement =
  | { status: "none" }
  | { status: "placed"; number: string | null }
  | { status: "needs_attention"; code: string; message: string }
  | { status: "busy" }
  | { status: "refunded" }
  | { status: "unpaid" };

export interface PlaceDeps extends WooSiteDeps {
  /** The platform's address, for the owner's link. */
  baseUrl: string;
}

/** The owner hears of a payment whose order the platform refused: on the dashboard and their phone (Yallapp Business), once per payment. */
async function alertOwner(deps: PlaceDeps, app: App, order: CatalogOrder, problem: { code: string; message: string }): Promise<void> {
  await noteAppError(deps.store, { clientId: app.clientId, appId: app.id, source: "wordpress", code: "paid_order_failed", detail: `order ${orderNumber(order)}: ${problem.code}: ${problem.message}` }, deps.now);
  const notice = await deps.store.createOwnerNotice({
    clientId: app.clientId,
    appId: app.id,
    kind: "store_order_attention",
    dedupeKey: `store_order_attention:${order.id}`,
    title: "A payment in the app needs your attention",
    body: "A customer paid in the app, but your store didn't take the order. Open Payments to create the order again or to refund the payment.",
    linkUrl: `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/payments#in-app-payments`,
    linkLabel: "Open Payments",
    tone: "warn",
    createdAt: deps.now,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
  if (notice) await pushOwnerSafely((d) => pushNotice(d, notice), deps.store);
}

/**
 * 134 Creates the paid order on the platform, once: a payment whose order
 * is made answers `placed` again without asking; two calls at once (the
 * gateway's webhook and the customer's return) make one, as the platform
 * also keeps one order per payment reference. Only a paid payment's.
 */
export async function placePlatformOrder(deps: PlaceDeps, app: App, order: CatalogOrder): Promise<Placement> {
  let platformOrder = await deps.store.getStorePlatformOrder(app.id, order.id);
  if (!platformOrder) return { status: "none" };
  if (platformOrder.status === "placed") return { status: "placed", number: platformOrder.platformOrderNumber };
  if (platformOrder.status === "refunded") return { status: "refunded" };
  const paid = await deps.store.getCatalogOrder(app.id, order.id);
  if (!paid || (paid.status !== "processing" && paid.status !== "completed") || !paid.customer) return { status: "unpaid" };
  // The server stopped while it was being made: it may be tried again (the platform keeps one per reference).
  if (platformOrder.status === "placing" && deps.now.getTime() - platformOrder.updatedAt.getTime() > STALE_PLACING_MS) {
    await deps.store.updateStorePlatformOrder(app.id, order.id, { status: "needs_attention", updatedAt: deps.now }, ["placing"]);
    platformOrder = { ...platformOrder, status: "needs_attention" };
  }
  const claimed = await deps.store.updateStorePlatformOrder(app.id, order.id, { status: "placing", attempts: platformOrder.attempts + 1, updatedAt: deps.now }, ["awaiting_payment", "needs_attention"]);
  if (!claimed) return { status: "busy" };
  const provider = paid.paymentProvider ?? "iyzico";
  const answer = await callPaidOrders(
    deps,
    app,
    payload("create", paid, platformOrder.intent, paid.customer, {
      payment: {
        gateway: PROVIDER_NAME[provider],
        transaction_id: paid.paymentId ?? paymentReference(paid),
        amount: (paid.totalCents / 100).toFixed(2),
        currency: paid.currency,
        paid_at: (paid.paidAt ?? deps.now).toISOString(),
        note: `Paid in the app via ${PROVIDER_NAME[provider]}, reference ${paid.paymentId ?? paymentReference(paid)}`,
      },
    }),
  );
  const id = answer.ok ? answer.body.order_id : null;
  if (answer.ok && (typeof id === "number" || (typeof id === "string" && id !== ""))) {
    const number = typeof answer.body.order_number === "string" || typeof answer.body.order_number === "number" ? String(answer.body.order_number).slice(0, 64) : String(id);
    await deps.store.updateStorePlatformOrder(app.id, order.id, { status: "placed", platformOrderId: String(id).slice(0, 64), platformOrderNumber: number, problem: null, updatedAt: deps.now });
    // An earlier alert about it is done with.
    return { status: "placed", number };
  }
  const problem = answer.ok ? { code: "invalid_answer", message: "The site didn't say which order it made." } : { code: answer.code, message: answer.message };
  await deps.store.updateStorePlatformOrder(app.id, order.id, { status: "needs_attention", problem: { ...problem, at: deps.now.toISOString() }, updatedAt: deps.now });
  await alertOwner(deps, app, paid, problem);
  return { status: "needs_attention", ...problem };
}

/** For the customer's page after paying: the order is made on the platform (`placed`), or the shop will confirm it (`confirming`); null: not a platform's. */
export async function platformOrderState(store: DataStore, app: Pick<App, "id">, order: Pick<CatalogOrder, "id">): Promise<{ state: "placed" | "confirming"; record: StorePlatformOrder } | null> {
  const platformOrder = await store.getStorePlatformOrder(app.id, order.id);
  if (!platformOrder) return null;
  return { state: platformOrder.status === "placed" ? "placed" : "confirming", record: platformOrder };
}

/**
 * 134 A paid payment whose order the store refused: all of what's left of
 * it goes back to the customer through the gateway (the refund the shop's
 * orders have), and the payment is closed.
 */
export async function refundPlatformPayment(deps: RefundDeps, app: App, order: CatalogOrder): Promise<RefundResult> {
  const platformOrder = await deps.store.getStorePlatformOrder(app.id, order.id);
  if (!platformOrder || platformOrder.status !== "needs_attention") return { ok: false, message: "This can't be refunded." };
  const options = await orderRefundOptions(deps, app, order);
  if (!options.refundable || !options.byApi) return { ok: false, message: options.why ?? "This can't be refunded." };
  const result = await refundOrder(deps, app, order, { cents: options.leftCents, reason: "other", note: "The store couldn't take the order paid in the app.", method: "api" });
  if (!result.ok) return result;
  const after = await deps.store.getCatalogOrder(app.id, order.id);
  if (after?.status === "refunded") await deps.store.updateStorePlatformOrder(app.id, order.id, { status: "refunded", updatedAt: deps.now }, ["needs_attention"]);
  return result;
}
