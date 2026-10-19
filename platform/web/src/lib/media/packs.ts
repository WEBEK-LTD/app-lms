import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, License, PaidStoragePack, PaymentProviderId, PlanPayment, StoragePack, StoragePackOffer, StoragePacksSetting, User } from "../data/types";
import { startCheckout, providerTakes, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import type { BillingDetails } from "../billing/plan-payment";
import { formatMoney, offerFor, shownOf, sumOffers, timesOffer, type Offer, type YallappPrice } from "../billing/prices";
import type { PriceView } from "../plans";

/**
 * 51 Storage packs: extra gigabytes for an app's Media library, bought by
 * card through Yallapp's payment provider (the same flow as plans, a
 * `plan_payments` row with purpose "storage"). A pack runs until the app's
 * plan period ends (its price is a month's price times the months left,
 * rounded up), renews when the plan is renewed by card (the payment page
 * offers it with the plan) and otherwise ends with the period. When a pack
 * ends and the files are over what's left, nothing is deleted: new uploads
 * are refused and the owner is told (email and dashboard notice).
 *
 * A pack's monthly price follows Phase 52's money rules (lib/billing/prices.ts):
 * set in Egyptian pounds and charged in pounds through Yallapp's plan
 * gateway, shown in dollars outside Egypt.
 */

export const DEFAULT_PACK_OFFERS: StoragePackOffer[] = [
  { id: "plus25", gb: 25, price: null },
  { id: "plus100", gb: 100, price: null },
];

const cents = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null);

/** A stored monthly price; null when there's none, or it isn't one (offers saved before Phase 52's prices had a `priceCents` in any currency: unpriced until the team sets pounds). */
function priceOf(value: unknown): YallappPrice | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const egpCents = cents(v.egpCents);
  return egpCents === null ? null : { egpCents, usdCents: cents(v.usdCents) };
}

export function packOffers(setting: StoragePacksSetting | null | undefined): StoragePackOffer[] {
  const offers = (Array.isArray(setting?.offers) ? setting.offers : [])
    .filter((o) => o && typeof o.id === "string" && Number.isInteger(o.gb) && o.gb > 0)
    .map((o) => ({ id: o.id, gb: o.gb, price: priceOf(o.price) }));
  return offers.length ? offers : DEFAULT_PACK_OFFERS;
}

export function offerName(offer: Pick<StoragePackOffer, "gb">): string {
  return `+${offer.gb} GB`;
}

/** A month of the pack as the client sees and pays it with this gateway; null when it isn't sold by card or the gateway can't charge it. */
export function monthlyOffer(offer: StoragePackOffer, provider: PaymentProviderId, view: PriceView): Offer | null {
  if (!offer.price) return null;
  const monthly = offerFor(offer.price, view.display, provider, view.egpPerUsd);
  return monthly && monthly.charged.cents > 0 && providerTakes(provider, monthly.charged.currency) ? monthly : null;
}

/** Offers the owner can pay by card now, with a month's price: priced, and chargeable by the gateway. */
export function cardOffers(offers: StoragePackOffer[], provider: PaymentProviderId | null, view: PriceView): { offer: StoragePackOffer; monthly: Offer }[] {
  if (!provider) return [];
  return offers.flatMap((offer) => {
    const monthly = monthlyOffer(offer, provider, view);
    return monthly ? [{ offer, monthly }] : [];
  });
}

const DAY = 86_400_000;

/** Whole months from now to the end of the plan's period, at least one (30-day months, rounded up). */
export function monthsLeft(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / (30 * DAY)));
}

/** What a pack costs until the plan's period ends: a month's price times the months left. */
export function packPrice(monthly: Offer, until: Date, now: Date): { months: number; offer: Offer } {
  const months = monthsLeft(until, now);
  return { months, offer: timesOffer(monthly, months) };
}

/** Why a pack can't be bought now, or null. */
export function cannotBuy(license: Pick<License, "expiresAt"> | null, now: Date): string | null {
  if (!license) return "Storage packs come with a plan. Choose your plan first.";
  if (license.expiresAt.getTime() <= now.getTime() + DAY) return "Your plan ends today. Renew it first; storage packs run until the plan's period ends.";
  return null;
}

/** Records a storage pack payment and starts it on the provider's page; returns the page to send the owner to. */
export async function startStoragePayment(deps: {
  store: DataStore;
  account: PaymentAccount;
  fetcher?: typeof fetch;
  urls?: ProviderUrls;
  now: Date;
  client: Client;
  app: Pick<App, "id">;
  license: License;
  user: User;
  offer: StoragePackOffer;
  /** 52 The client's currency and the exchange rate: what they saw. */
  view: PriceView;
  billing: BillingDetails;
  ip: string;
  callbackUrls: (token: string) => { returnUrl: string; webhookUrl: string | null };
}): Promise<string> {
  const { client, user, offer, account, license } = deps;
  const monthly = monthlyOffer(offer, account.provider, deps.view);
  if (!monthly) throw new Error("This storage pack has no card price");
  const price = packPrice(monthly, license.expiresAt, deps.now);
  const token = randomToken(24);
  const payment: PlanPayment = {
    id: newId(),
    clientId: client.id,
    appId: deps.app.id,
    plan: license.plan,
    months: 1,
    // 52 Charged in pounds through Kashier; the dollars shown outside Egypt are kept for the receipt.
    amountCents: price.offer.charged.cents,
    currency: price.offer.charged.currency,
    status: "pending",
    tokenHash: sha256Hex(token),
    paymentId: null,
    createdAt: deps.now,
    paidAt: null,
    paymentProvider: account.provider,
    providerRef: null,
    ...shownOf(price.offer),
    purpose: "storage",
    storagePacks: [{ offer: offer.id, gb: offer.gb, cents: price.offer.charged.cents, packId: null }],
  };
  const name = `Yallapp storage ${offerName(offer)} (${price.months} ${price.months === 1 ? "month" : "months"})`;
  const { returnUrl, webhookUrl } = deps.callbackUrls(token);
  const started = await startCheckout(
    account,
    {
      reference: `plan-${payment.id}`,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: name,
      lines: [{ id: `storage-${offer.id}`, name, cents: payment.amountCents, category: "Subscription", digital: true }],
      customer: {
        id: `client-${client.id}`,
        name: user.name,
        email: user.email,
        phone: client.whatsapp.startsWith("+") ? client.whatsapp : `+${client.whatsapp}`,
        city: deps.billing.city,
        address: deps.billing.address,
        ip: deps.ip,
      },
      returnUrl,
      webhookUrl,
      iyzico: { conversationId: `plan-${payment.id}`, basketId: payment.id, shipping: false },
    },
    { fetcher: deps.fetcher, urls: deps.urls },
  );
  await deps.store.createPlanPayment({ ...payment, providerRef: started.providerRef.slice(0, 191) });
  return started.url;
}

/**
 * A paid payment's packs: new ones run until `until` (the plan's period
 * end); renewed ones move their end to `until`. Returns the packs.
 */
export async function applyPaidPacks(store: DataStore, payment: PlanPayment, until: Date, now: Date): Promise<StoragePack[]> {
  if (!payment.appId || !payment.storagePacks?.length) return [];
  const existing = await store.listStoragePacks(payment.appId);
  const done: StoragePack[] = [];
  for (const line of payment.storagePacks) {
    const renewed = line.packId ? existing.find((p) => p.id === line.packId) : undefined;
    if (renewed) {
      const activeUntil = renewed.activeUntil.getTime() > until.getTime() ? renewed.activeUntil : until;
      await store.updateStoragePack(renewed.id, { activeUntil, paymentId: payment.id, updatedAt: now, endedNoticeAt: null });
      done.push({ ...renewed, activeUntil, paymentId: payment.id, updatedAt: now, endedNoticeAt: null });
    } else {
      const pack: StoragePack = {
        id: newId(),
        appId: payment.appId,
        clientId: payment.clientId,
        offer: line.offer,
        gb: line.gb,
        activeUntil: until,
        paymentId: payment.id,
        createdAt: now,
        updatedAt: now,
        endedNoticeAt: null,
      };
      await store.createStoragePack(pack);
      done.push(pack);
    }
  }
  return done;
}

/** 51 The storage packs renewed with a plan: each pack's line on the payment, and what they add to the plan's price. */
export interface StorageRenewal {
  lines: PaidStoragePack[];
  /** All the packs for the plan's months: shown in the client's currency, charged in the plan's. */
  offer: Offer;
}

/**
 * The packs a plan renewal by card can include: the app's packs still
 * running or ended within 30 days, whose offer the gateway can charge. Each
 * for the plan's months at the offer's monthly price. Null when there are none.
 */
export function renewablePacks(
  packs: StoragePack[],
  offers: StoragePackOffer[],
  input: { provider: PaymentProviderId; view: PriceView; months: number; now: Date },
): StorageRenewal | null {
  const lines: PaidStoragePack[] = [];
  const priced: Offer[] = [];
  for (const pack of packs) {
    if (pack.activeUntil.getTime() < input.now.getTime() - 30 * DAY) continue;
    const offer = offers.find((o) => o.id === pack.offer);
    const monthly = offer ? monthlyOffer(offer, input.provider, input.view) : null;
    if (!offer || !monthly) continue;
    const total = timesOffer(monthly, input.months);
    lines.push({ offer: offer.id, gb: pack.gb, cents: total.charged.cents, packId: pack.id });
    priced.push(total);
  }
  return lines.length ? { lines, offer: sumOffers(priced) } : null;
}

/** "Renew my storage pack (+25 GB) for $120" for the payment form; with what is charged when that's another currency. */
export function renewalLabel(renewal: StorageRenewal): string {
  const names = renewal.lines.map((l) => `+${l.gb} GB`);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
  const { shown, charged } = renewal.offer;
  const charge = shown.currency !== charged.currency ? ` (charged as ${formatMoney(charged)})` : "";
  return `Renew my storage ${renewal.lines.length === 1 ? "pack" : "packs"} (${list}) for ${formatMoney(shown)}${charge}`;
}
