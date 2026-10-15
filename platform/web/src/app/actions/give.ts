"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { placeDemoDonation } from "@/lib/demo/checkout";
import { withDemoChecked } from "@/lib/demo/apps";
import { donationAccount, donationLinkExpired, readDonor, startDonationPayment } from "@/lib/donations/payment";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { PaymentError } from "@/lib/payments/errors";
import { callbackUrls } from "@/lib/payments/routes";
import { settleDonationPayment } from "@/lib/payments/settle";

/**
 * 29 The donation page's form (/give/<token>): the donor's name and email for
 * the receipt, then the provider's payment page (37 iyzico, Kashier or Fawaterk), paid into the charity's own
 * account. A demo charity's page gives without any card.
 */

const FIELDS = ["name", "email", "phone", "city"];

export async function giveAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  const store = await getStore();
  const donation = await store.getDonationByToken(sha256Hex(token));
  if (!donation) return { message: "This donation link isn't valid." };
  const now = new Date();
  if (donation.status !== "pending") redirect(`/give/${token}`);
  if (donationLinkExpired(donation, now)) return { message: "This donation link has expired. Go back to the app and donate again." };
  const found = await store.getAppById(donation.appId);
  const app = found ? await withDemoChecked(store, found) : null;
  if (!app) return { message: "This donation link isn't valid." };
  const checked = readDonor(app, values);
  if (!checked.ok) return { errors: checked.errors, values };
  // 16 A demo charity: the donation goes through as given, and nothing is charged.
  if (app.demo) {
    await store.updateDonation(app.id, donation.id, {
      donorName: checked.donor.name,
      donorEmail: checked.donor.email,
      donorPhone: checked.donor.phone,
      updatedAt: now,
    });
    await placeDemoDonation(store, app, { ...donation, donorEmail: checked.donor.email }, now);
    redirect(`/give/${token}/thank-you`);
  }
  const account = donationAccount(app, encryptionKey());
  if (!account) return { message: "This charity can't take donations right now. Please try again later.", values };
  // 37 A Kashier or Fawaterk payment started earlier may have gone through without its redirect or webhook: read it back before starting another.
  if (donation.providerRef && donation.paymentProvider && donation.paymentProvider !== "iyzico") {
    const earlier = await settleDonationPayment(token, { provider: donation.paymentProvider });
    if (earlier.status === "paid" || earlier.status === "already_paid") redirect(earlier.path);
  }
  let pageUrl: string;
  try {
    pageUrl = await startDonationPayment({
      store,
      app,
      account,
      donation,
      donor: checked.donor,
      ip: ipFromHeaders(await headers()),
      callbackUrls: callbackUrls(appUrl(), "donation", account.provider, token),
      now,
      urls: paymentApiUrls(),
    });
  } catch (e) {
    if (!(e instanceof PaymentError)) throw e;
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  redirect(pageUrl);
}
