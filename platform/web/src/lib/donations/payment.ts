import { formatCents } from "../catalog/money";
import { ownPaymentAccount } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, Donation } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import { hostedSettings } from "../hosted/service";
import { PaymentError } from "../payments/errors";
import { confirmCheckout, startCheckout, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import { DONATION_LINK_MINUTES, donationReference } from "./service";

/**
 * 29 Paying a donation on our donation page (/give/<token>), the same way a
 * shop's order is paid (lib/catalog/payment.ts): the provider's page, then
 * the provider's own answer, read back after its callback, redirect or
 * webhook. Always into the charity's own account (37 iyzico, Kashier or
 * Fawaterk): Yallapp takes no commission on donations, so the marketplace
 * account is never used.
 */

export interface Donor {
  name: string;
  email: string;
  phone: string | null;
  city: string;
}

/** 37 The charity's own account; null when it has none (or it's a demo, which never charges a card). */
export function donationAccount(app: App, key: Buffer): PaymentAccount | null {
  if (app.demo) return null;
  return ownPaymentAccount(app, key);
}

export function donationLinkExpired(donation: Pick<Donation, "createdAt">, now: Date): boolean {
  return now.getTime() - donation.createdAt.getTime() > DONATION_LINK_MINUTES * 60_000;
}

/** What the donation page asks for, checked; or the errors per field. */
export function readDonor(app: App, input: Record<string, unknown>): { ok: true; donor: Donor } | { ok: false; errors: Record<string, string> } {
  const text = (name: string, max: number) => (typeof input[name] === "string" ? (input[name] as string).trim().slice(0, max) : "");
  const errors: Record<string, string> = {};
  const name = text("name", 80);
  if (name.length < 3 || !name.includes(" ")) errors.name = "Enter your first and last name.";
  const email = text("email", 191).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address. Your receipt goes there.";
  const phoneText = text("phone", 24);
  const phone = phoneText ? parseAnyPhone(phoneText, hostedSettings(app).defaultCountryCode) : null;
  if (phoneText && !phone) errors.phone = "Enter a valid mobile number, or leave it empty.";
  const city = text("city", 60);
  if (city.length < 2) errors.city = "Enter your city.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, donor: { name, email, phone: phone?.e164 ?? null, city } };
}

/** Saves the donor on the donation and starts the card payment; returns the provider's payment page. */
export async function startDonationPayment(deps: {
  store: DataStore;
  app: App;
  /** 37 The charity's own account. */
  account: PaymentAccount;
  donation: Donation;
  donor: Donor;
  ip: string;
  /** Where the provider sends the donor back, and posts its webhook (lib/payments/routes.ts). */
  callbackUrls: { returnUrl: string; webhookUrl: string | null };
  now: Date;
  fetcher?: typeof fetch;
  urls?: ProviderUrls;
}): Promise<string> {
  const { donation, donor, account } = deps;
  const name = `Donation: ${donation.campaignTitle}`.slice(0, 120);
  const started = await startCheckout(
    account,
    {
      reference: `donation-${donation.id}`,
      amountCents: donation.amountCents,
      currency: donation.currency,
      description: name,
      lines: [{ id: `campaign-${donation.campaignId ?? 0}`, name, cents: donation.amountCents, category: "Donations", digital: true }],
      customer: {
        id: donation.userId !== null ? `supporter-${donation.userId}` : `guest-donation-${donation.id}`,
        name: donor.name,
        email: donor.email,
        phone: donor.phone,
        city: donor.city,
        // A donation needs no address: the city stands in where a provider asks for one.
        address: null,
        ip: deps.ip,
      },
      returnUrl: deps.callbackUrls.returnUrl,
      webhookUrl: deps.callbackUrls.webhookUrl,
      iyzico: { conversationId: `donation-${donationReference(donation)}`, basketId: `donation-${donation.id}`, shipping: false },
    },
    { fetcher: deps.fetcher, urls: deps.urls },
  );
  await deps.store.updateDonation(donation.appId, donation.id, {
    donorName: donor.name,
    donorEmail: donor.email,
    donorPhone: donor.phone,
    paymentProvider: account.provider,
    providerRef: started.providerRef.slice(0, 191),
    updatedAt: deps.now,
  });
  return started.url;
}

/** 37 "pending": Kashier or Fawaterk haven't confirmed it (yet); their webhook may still do. */
export type DonationOutcome = "paid" | "already_paid" | "pending" | "failed";

/**
 * Reads a donation back from the provider after its callback, redirect or
 * webhook and marks it paid, which adds it to its campaign. The trigger
 * proves nothing by itself: only the provider's answer to our own
 * authenticated request does, for this donation's reference, amount and
 * currency. payDonation only changes a pending donation, so it counts once.
 */
export async function completeDonationPayment(deps: {
  store: DataStore;
  account: PaymentAccount;
  donation: Donation;
  /** iyzico: the token its callback posted. */
  iyzicoToken?: string;
  /** 37 Kashier's session or Fawaterk's invoice named by a webhook; the one kept on the donation otherwise. */
  providerRef?: string | null;
  now: Date;
  fetcher?: typeof fetch;
  urls?: ProviderUrls;
}): Promise<DonationOutcome> {
  const { donation, account } = deps;
  if (donation.status !== "pending") return donation.status === "paid" ? "already_paid" : "failed";
  const provider = donation.paymentProvider ?? "iyzico";
  if (account.provider !== provider) return "failed";
  let result;
  try {
    result = await confirmCheckout(
      account,
      {
        reference: `donation-${donation.id}`,
        amountCents: donation.amountCents,
        currency: donation.currency,
        providerRef: deps.providerRef ?? donation.providerRef ?? null,
        ...(deps.iyzicoToken
          ? { iyzico: { token: deps.iyzicoToken, conversationId: `donation-${donationReference(donation)}`, basketId: `donation-${donation.id}` } }
          : {}),
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
  } catch (e) {
    if (e instanceof PaymentError) return provider === "iyzico" ? "failed" : "pending";
    throw e;
  }
  if (!result.paid) return provider === "iyzico" ? "failed" : "pending";
  const changed = await deps.store.payDonation(donation.appId, donation.id, result.paymentId, deps.now);
  return changed ? "paid" : "already_paid";
}

const RECEIPT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

/** The values of the donor's "Donation receipt" email (lib/email/templates.ts). No tax claims: the charity adds those itself if they apply. */
export function donationReceiptValues(donation: Donation, orgName: string, receiptUrl: string): Record<string, string> {
  return {
    org_name: orgName,
    donor_name: donation.donorName ?? "",
    amount: formatCents(donation.amountCents, donation.currency),
    campaign: donation.campaignTitle,
    date: RECEIPT_DATE.format(donation.paidAt ?? donation.createdAt),
    reference: donationReference(donation),
    receipt_url: receiptUrl,
  };
}

export function receiptDate(donation: Pick<Donation, "paidAt" | "createdAt">): string {
  return RECEIPT_DATE.format(donation.paidAt ?? donation.createdAt);
}
