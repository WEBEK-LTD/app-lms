import { centsToDecimal, formatCents } from "../catalog/money";
import { paymentKeys } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, Donation } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import { hostedSettings } from "../hosted/service";
import { initializeCheckoutForm, IyzicoError, retrieveCheckoutForm, type IyzicoKeys } from "../payments/iyzico";
import { DONATION_LINK_MINUTES, donationReference } from "./service";

/**
 * 29 Paying a donation on our donation page (/give/<token>), the same way a
 * shop's order is paid (lib/catalog/payment.ts): iyzico's checkout form, then
 * iyzico's own answer after its callback. Always into the charity's own
 * iyzico account: Yallapp takes no commission on donations, so the
 * marketplace account is never used.
 */

export interface Donor {
  name: string;
  email: string;
  phone: string | null;
  city: string;
}

/** The charity's iyzico keys; null when it has none (or it's a demo, which never charges a card). */
export function donationKeys(app: App, key: Buffer): IyzicoKeys | null {
  if (app.demo) return null;
  return app.catalogSettings?.payment?.provider === "iyzico" ? paymentKeys(app, key) : null;
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

/** Saves the donor on the donation and starts the card payment; returns iyzico's payment page. */
export async function startDonationPayment(deps: {
  store: DataStore;
  app: App;
  keys: IyzicoKeys;
  donation: Donation;
  donor: Donor;
  ip: string;
  callbackUrl: string;
  now: Date;
  fetcher?: typeof fetch;
  baseUrl?: string | null;
}): Promise<string> {
  const { donation, donor } = deps;
  await deps.store.updateDonation(donation.appId, donation.id, { donorName: donor.name, donorEmail: donor.email, donorPhone: donor.phone, updatedAt: deps.now });
  const [first, ...rest] = donor.name.split(/\s+/);
  const amount = centsToDecimal(donation.amountCents);
  const { paymentPageUrl } = await initializeCheckoutForm(
    deps.keys,
    {
      conversationId: `donation-${donationReference(donation)}`,
      price: amount,
      paidPrice: amount,
      currency: donation.currency,
      basketId: `donation-${donation.id}`,
      callbackUrl: deps.callbackUrl,
      buyer: {
        id: donation.userId !== null ? `supporter-${donation.userId}` : `guest-donation-${donation.id}`,
        name: first!,
        surname: rest.join(" ") || first!,
        ...(donor.phone ? { gsmNumber: donor.phone } : {}),
        email: donor.email,
        // iyzico asks for a Turkish ID number and an address; a donation needs neither, so these are placeholders.
        identityNumber: "11111111111",
        registrationAddress: donor.city,
        ip: deps.ip,
        city: donor.city,
        country: "Turkey",
      },
      billingAddress: { contactName: donor.name, city: donor.city, country: "Turkey", address: donor.city },
      basketItems: [
        {
          id: `campaign-${donation.campaignId ?? 0}`,
          name: `Donation: ${donation.campaignTitle}`.slice(0, 120),
          category1: "Donations",
          itemType: "VIRTUAL",
          price: amount,
        },
      ],
    },
    { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
  );
  return paymentPageUrl;
}

export type DonationOutcome = "paid" | "already_paid" | "failed";

/**
 * Checks a donation with iyzico after its callback and marks it paid, which
 * adds it to its campaign. The callback proves nothing by itself: only
 * iyzico's answer to our signed request does, for this donation's basket and
 * at least its amount.
 */
export async function completeDonationPayment(deps: {
  store: DataStore;
  keys: IyzicoKeys;
  donation: Donation;
  iyzicoToken: string;
  now: Date;
  fetcher?: typeof fetch;
  baseUrl?: string | null;
}): Promise<DonationOutcome> {
  const { donation } = deps;
  if (donation.status !== "pending") return donation.status === "paid" ? "already_paid" : "failed";
  let result;
  try {
    result = await retrieveCheckoutForm(
      deps.keys,
      { token: deps.iyzicoToken, conversationId: `donation-${donationReference(donation)}` },
      { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return "failed";
    throw e;
  }
  if (!result.paid || result.basketId !== `donation-${donation.id}` || result.paidCents < donation.amountCents || !result.paymentId) return "failed";
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
