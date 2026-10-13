"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readCustomer, startPayment } from "@/lib/catalog/payment";
import { payLinkExpired, paymentKeys } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { IyzicoError } from "@/lib/payments/iyzico";

/** The payment page's form: saves the customer's details and sends them to iyzico. */
export async function payAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "phone", "email", "city", "address"].map((k) => [k, String(formData.get(k) ?? "")]));
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return { message: "This payment link isn't valid." };
  const now = new Date();
  if (order.status !== "pending") redirect(`/pay/${token}`);
  if (payLinkExpired(order, now)) return { message: "This payment link has expired. Go back to the app and check out again." };
  const app = await store.getAppById(order.appId);
  const keys = app ? paymentKeys(app, encryptionKey()) : null;
  if (!app || !keys) return { message: "This shop can't take payments right now. Please try again later.", values };
  const checked = readCustomer(app, values);
  if (!checked.ok) return { errors: checked.errors, values };
  let pageUrl: string;
  try {
    pageUrl = await startPayment({
      store,
      app,
      keys,
      baseUrl: iyzicoApiUrl(),
      now,
      order,
      customer: checked.customer,
      ip: ipFromHeaders(await headers()),
      callbackUrl: `${appUrl()}/api/pay/iyzico/${token}`,
    });
  } catch (e) {
    if (!(e instanceof IyzicoError)) throw e;
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  redirect(pageUrl);
}
