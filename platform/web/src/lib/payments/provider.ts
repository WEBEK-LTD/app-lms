import type { CatalogCurrency, PaymentProviderId } from "../data/types";
import { PaymentError } from "./errors";
import { createFawaterkInvoice, getFawaterkInvoice, checkFawaterkKeys, type FawaterkKeys } from "./fawaterk";
import { checkIyzicoKeys, initializeCheckoutForm, retrieveCheckoutForm, type IyzicoKeys } from "./iyzico";
import { checkKashierKeys, createKashierSession, getKashierSessionPayment, type KashierKeys } from "./kashier";

/**
 * 37 One interface for the card payment providers: iyzico (Turkey), Kashier
 * and Fawaterk (Egypt). Every flow (plan payments, a shop's orders, events'
 * tickets, a restaurant's orders, donations) starts a checkout on the
 * provider's hosted page and confirms it afterwards by reading the payment
 * back from the provider with our own keys: a callback, redirect or webhook
 * is only a trigger. Refunds are made in each provider's merchant panel.
 */

export type { PaymentProviderId };

export const PAYMENT_PROVIDERS: PaymentProviderId[] = ["iyzico", "kashier", "fawaterk"];

export const PROVIDER_NAME: Record<PaymentProviderId, string> = { iyzico: "iyzico", kashier: "Kashier", fawaterk: "Fawaterk" };

/**
 * The currencies each provider takes. iyzico: Turkish lira, dollars, euros.
 * Kashier: Egyptian pounds, dollars, euros. Fawaterk: Egyptian pounds and
 * the Gulf currencies its vendors enable.
 */
export const PROVIDER_CURRENCIES: Record<PaymentProviderId, CatalogCurrency[]> = {
  iyzico: ["TRY", "USD", "EUR"],
  kashier: ["EGP", "USD", "EUR"],
  fawaterk: ["EGP", "USD", "SAR", "AED", "EUR"],
};

export function isPaymentProvider(value: unknown): value is PaymentProviderId {
  return typeof value === "string" && (PAYMENT_PROVIDERS as string[]).includes(value);
}

export function providerTakes(provider: PaymentProviderId, currency: string): boolean {
  return (PROVIDER_CURRENCIES[provider] as string[]).includes(currency);
}

/** "EGP, USD or EUR" */
export function currencyList(provider: PaymentProviderId): string {
  const list = PROVIDER_CURRENCIES[provider];
  return list.length > 1 ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}` : list.join("");
}

/** A merchant account with its keys: a client's own, or Yallapp's. */
export type PaymentAccount =
  | { provider: "iyzico"; keys: IyzicoKeys }
  | { provider: "kashier"; keys: KashierKeys }
  | { provider: "fawaterk"; keys: FawaterkKeys };

export function sandboxOf(account: PaymentAccount): boolean {
  return account.keys.sandbox;
}

/** Each provider's address in tests (fake servers); null or missing: the real one. */
export type ProviderUrls = Partial<Record<PaymentProviderId, string | null>>;

export interface ProviderOptions {
  fetcher?: typeof fetch;
  urls?: ProviderUrls;
}

export interface CheckoutLine {
  id: string;
  name: string;
  /** This line's total. */
  cents: number;
  category: string;
  digital: boolean;
  /** iyzico marketplace: the shop selling it, and its share of `cents`. */
  subMerchant?: { key: string; cents: number };
}

export interface CheckoutRequest {
  /** Ours, unique per payment: "plan-<id>", "order-<id>", "donation-<id>". */
  reference: string;
  amountCents: number;
  currency: CatalogCurrency;
  /** One line about what is paid, for the provider's page. */
  description: string;
  /** They add up to `amountCents`. */
  lines: CheckoutLine[];
  customer: {
    /** Ours, e.g. "client-<id>". */
    id: string;
    name: string;
    email: string;
    /** E.164; null when not asked. */
    phone: string | null;
    city: string;
    /** Null: the city stands in. */
    address: string | null;
    ip: string;
  };
  /** iyzico posts its token here; Kashier and Fawaterk send the customer back here. */
  returnUrl: string;
  /** Kashier and Fawaterk post their webhook here; null for none (iyzico has no webhook). */
  webhookUrl: string | null;
  /** iyzico's own IDs, as before Phase 37, and whether a shipping address is sent. */
  iyzico: { conversationId: string; basketId: string; shipping: boolean };
  /** 49 When the provider's page should stop taking the payment (Kashier takes it); missing: the provider's default. */
  pageExpiresAt?: Date | null;
}

export interface StartedCheckout {
  /** The provider's payment page. */
  url: string;
  /** The provider's reference, kept on the payment to read it back: iyzico's token, Kashier's session, Fawaterk's invoice. */
  providerRef: string;
  /**
   * 49 When the provider's page stops taking the payment, as far as we know:
   * iyzico's token life, the expiry we gave Kashier; null for Fawaterk, whose
   * invoice takes no expiry to the minute.
   */
  expiresAt: Date | null;
}

/** Starts a payment on the provider's page. Throws PaymentError when it can't start. */
export async function startCheckout(account: PaymentAccount, request: CheckoutRequest, options: ProviderOptions = {}): Promise<StartedCheckout> {
  const sum = request.lines.reduce((total, line) => total + line.cents, 0);
  if (sum !== request.amountCents || request.amountCents <= 0) throw new Error("The checkout lines don't add up to the amount");
  if (!providerTakes(account.provider, request.currency)) {
    throw new PaymentError(`${PROVIDER_NAME[account.provider]} doesn't take payments in ${request.currency}.`);
  }
  const [first, ...rest] = request.customer.name.trim().split(/\s+/);
  const firstName = first || request.customer.name;
  const lastName = rest.join(" ") || firstName;
  if (account.provider === "kashier") {
    const { sessionId, sessionUrl } = await createKashierSession(
      account.keys,
      {
        // Kashier refuses an order reference it has seen: each attempt gets its own suffix.
        order: `${request.reference}-${Date.now().toString(36)}`,
        amountCents: request.amountCents,
        currency: request.currency,
        merchantRedirect: request.returnUrl,
        serverWebhook: request.webhookUrl,
        customer: { email: request.customer.email, reference: request.customer.id },
        description: request.description,
        expiresAt: request.pageExpiresAt ?? null,
      },
      { fetcher: options.fetcher, baseUrl: options.urls?.kashier },
    );
    return { url: sessionUrl, providerRef: sessionId, expiresAt: request.pageExpiresAt ?? null };
  }
  if (account.provider === "fawaterk") {
    const { invoiceId, url } = await createFawaterkInvoice(
      account.keys,
      {
        reference: request.reference,
        amountCents: request.amountCents,
        currency: request.currency,
        customer: { firstName, lastName, email: request.customer.email, phone: request.customer.phone, address: request.customer.address },
        items: request.lines.map((l) => ({ name: l.name, cents: l.cents })),
        successUrl: request.returnUrl,
        failUrl: request.returnUrl,
        pendingUrl: request.returnUrl,
        webhookUrl: request.webhookUrl,
      },
      { fetcher: options.fetcher, baseUrl: options.urls?.fawaterk },
    );
    return { url, providerRef: invoiceId, expiresAt: null };
  }
  const decimal = (cents: number) => (cents / 100).toFixed(2);
  const { customer } = request;
  const address = { contactName: customer.name, city: customer.city, country: "Turkey", address: customer.address ?? customer.city };
  const price = decimal(request.amountCents);
  const startedAt = Date.now();
  const { token, paymentPageUrl, tokenExpireSeconds } = await initializeCheckoutForm(
    account.keys,
    {
      conversationId: request.iyzico.conversationId,
      price,
      paidPrice: price,
      currency: request.currency,
      basketId: request.iyzico.basketId,
      callbackUrl: request.returnUrl,
      buyer: {
        id: customer.id,
        name: firstName,
        surname: lastName,
        ...(customer.phone ? { gsmNumber: customer.phone } : {}),
        email: customer.email,
        // iyzico asks for a Turkish ID number; Yallapp doesn't collect it, so it sends this placeholder.
        identityNumber: "11111111111",
        registrationAddress: customer.address ?? customer.city,
        ip: customer.ip,
        city: customer.city,
        country: "Turkey",
      },
      billingAddress: address,
      ...(request.iyzico.shipping ? { shippingAddress: address } : {}),
      basketItems: request.lines.map((l) => ({
        id: l.id,
        name: l.name,
        category1: l.category,
        itemType: l.digital ? ("VIRTUAL" as const) : ("PHYSICAL" as const),
        price: decimal(l.cents),
        ...(l.subMerchant ? { subMerchantKey: l.subMerchant.key, subMerchantPrice: decimal(l.subMerchant.cents) } : {}),
      })),
    },
    { fetcher: options.fetcher, baseUrl: options.urls?.iyzico },
  );
  return { url: paymentPageUrl, providerRef: token, expiresAt: new Date(startedAt + (tokenExpireSeconds ?? 1800) * 1000) };
}

/** What a payment should be: ours, for this amount and currency. */
export interface ExpectedPayment {
  reference: string;
  amountCents: number;
  currency: string;
  /** Kashier's session or Fawaterk's invoice to read back (from the trigger, or kept when the payment started). */
  providerRef: string | null;
  /** iyzico: the token its callback brought, and our IDs as sent. */
  iyzico?: { token: string; conversationId: string; basketId: string };
}

export type Confirmation =
  | { paid: true; paymentId: string; transactionIds: string[] }
  /** "unpaid": not (yet) paid; "mismatch": paid, but not this payment (another reference, amount or currency). */
  | { paid: false; reason: "unpaid" | "mismatch" };

/**
 * Reads the payment back from the provider and checks it is this one:
 * paid, our reference, the exact amount (iyzico: at least it, as its price
 * may include instalment interest) and the currency. Throws PaymentError
 * when the provider can't be asked.
 */
export async function confirmCheckout(account: PaymentAccount, expected: ExpectedPayment, options: ProviderOptions = {}): Promise<Confirmation> {
  if (account.provider === "kashier") {
    if (!expected.providerRef) return { paid: false, reason: "unpaid" };
    const payment = await getKashierSessionPayment(account.keys, expected.providerRef, { fetcher: options.fetcher, baseUrl: options.urls?.kashier });
    if (!payment.paid) return { paid: false, reason: "unpaid" };
    const ours = payment.merchantOrderId !== null && (payment.merchantOrderId === expected.reference || payment.merchantOrderId.startsWith(`${expected.reference}-`));
    if (!ours || payment.amountCents !== expected.amountCents || payment.currency?.toUpperCase() !== expected.currency) return { paid: false, reason: "mismatch" };
    return { paid: true, paymentId: (payment.transactionId ?? expected.providerRef).slice(0, 64), transactionIds: [] };
  }
  if (account.provider === "fawaterk") {
    if (!expected.providerRef) return { paid: false, reason: "unpaid" };
    const invoice = await getFawaterkInvoice(account.keys, expected.providerRef, { fetcher: options.fetcher, baseUrl: options.urls?.fawaterk });
    if (!invoice.paid) return { paid: false, reason: "unpaid" };
    if (invoice.reference !== expected.reference || invoice.amountCents !== expected.amountCents || invoice.currency?.toUpperCase() !== expected.currency) {
      return { paid: false, reason: "mismatch" };
    }
    return { paid: true, paymentId: (invoice.invoiceId ?? expected.providerRef).slice(0, 64), transactionIds: [] };
  }
  if (!expected.iyzico) return { paid: false, reason: "unpaid" };
  const result = await retrieveCheckoutForm(
    account.keys,
    { token: expected.iyzico.token, conversationId: expected.iyzico.conversationId },
    { fetcher: options.fetcher, baseUrl: options.urls?.iyzico },
  );
  if (!result.paid || !result.paymentId) return { paid: false, reason: "unpaid" };
  if (result.basketId !== expected.iyzico.basketId || result.paidCents < expected.amountCents || (result.currency !== null && result.currency !== expected.currency)) {
    return { paid: false, reason: "mismatch" };
  }
  return { paid: true, paymentId: result.paymentId, transactionIds: result.transactionIds };
}

/** "Test connection": whether the provider accepts the keys, with a call that changes nothing. Null when it couldn't be asked. */
export async function checkAccount(account: PaymentAccount, options: ProviderOptions = {}): Promise<boolean | null> {
  if (account.provider === "kashier") return checkKashierKeys(account.keys, { fetcher: options.fetcher, baseUrl: options.urls?.kashier });
  if (account.provider === "fawaterk") return checkFawaterkKeys(account.keys, { fetcher: options.fetcher, baseUrl: options.urls?.fawaterk });
  return checkIyzicoKeys(account.keys, { fetcher: options.fetcher, baseUrl: options.urls?.iyzico });
}

export { PaymentError };
