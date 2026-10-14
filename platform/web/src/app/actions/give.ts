"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { placeDemoDonation } from "@/lib/demo/checkout";
import { withDemoChecked } from "@/lib/demo/apps";
import { donationKeys, donationLinkExpired, readDonor, startDonationPayment } from "@/lib/donations/payment";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { IyzicoError } from "@/lib/payments/iyzico";

/**
 * 29 The donation page's form (/give/<token>): the donor's name and email for
 * the receipt, then iyzico's payment page, paid into the charity's own
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
  const keys = donationKeys(app, encryptionKey());
  if (!keys) return { message: "This charity can't take donations right now. Please try again later.", values };
  let pageUrl: string;
  try {
    pageUrl = await startDonationPayment({
      store,
      app,
      keys,
      donation,
      donor: checked.donor,
      ip: ipFromHeaders(await headers()),
      callbackUrl: `${appUrl()}/api/pay/donation/${token}`,
      now,
      baseUrl: iyzicoApiUrl(),
    });
  } catch (e) {
    if (!(e instanceof IyzicoError)) throw e;
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  redirect(pageUrl);
}
