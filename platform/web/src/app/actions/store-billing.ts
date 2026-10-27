"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { usesPlugin } from "@/lib/app/label";
import { getStore } from "@/lib/data";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { planHasStoreBilling, storeBillingSource } from "@/lib/store-billing/access";
import { checkStoreKeys } from "@/lib/store-billing/check";
import { priceText, storesOf } from "@/lib/store-billing/products";
import { syncStoreProducts } from "@/lib/store-billing/sync";

/**
 * 100.2 Dashboard › In-app purchases: selling in the app on or off, each
 * product's own price, checking the store keys and updating the stores now.
 */

const PAGE = "/dashboard/in-app-purchases";

async function context_() {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plan = await appPlan(store, context.license, now);
  return { context, app: context.app, store, now, plan };
}

export async function saveStoreBillingAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  if (!storeBillingSource(app)) return { ok: false, message: "This app can't sell through the stores." };
  const enabled = formData.get("enabled") === "on";
  await store.updateApp(app.id, { storeBilling: { ...app.storeBilling, enabled } }, now);
  await recordStaffChange(context, `Turned in-app purchases ${enabled ? "on" : "off"}`);
  // 100.3 A WordPress site hears it at once (its license status's store_billing).
  if (usesPlugin(app)) refreshSitesSoon([app.id]);
  revalidatePath(PAGE);
  return { ok: true, message: enabled ? "In-app purchases are on. The stores get your products within minutes." : "In-app purchases are off." };
}

export async function saveStorePriceAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  const productId = String(formData.get("product") ?? "");
  const product = productId ? await store.getStoreProduct(app.id, productId) : null;
  if (!product) return { ok: false, message: "This product isn't in your list." };
  const raw = String(formData.get("price") ?? "").trim().replace(",", ".");
  const ownPrice = raw === "" ? null : /^\d{1,7}(\.\d{1,2})?$/.test(raw) ? priceText(raw) : null;
  if (raw !== "" && !ownPrice) return { ok: false, message: "Enter a price like 450 or 450.00." };
  if (ownPrice !== product.ownPrice) {
    await store.saveStoreProduct({ ...product, ownPrice, updatedAt: now });
    await recordStaffChange(context, `Set the store price of ${product.productId} to ${ownPrice ?? "the site's price"}`);
  }
  revalidatePath(PAGE);
  return { ok: true, message: "Saved." };
}

export async function checkStoresAction(): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  const stores = storesOf(app);
  if (!stores.google && !stores.apple) return { ok: false, message: "Add your Google Play or App Store key on the Publishing step first." };
  const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { ok: false, message: "Too many checks. Try again in a few minutes." };
  const result = await checkStoreKeys({ store, key: encryptionKey(), now }, app);
  revalidatePath(PAGE);
  return result.ok ? { ok: true, message: "It works." } : { ok: false, message: "It didn't work. The details are below." };
}

export async function syncStoresNowAction(): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  const stores = storesOf(app);
  if (!stores.google && !stores.apple) return { ok: false, message: "Add your Google Play or App Store key on the Publishing step first." };
  const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { ok: false, message: "Too many checks. Try again in a few minutes." };
  const report = await syncStoreProducts({ store, key: encryptionKey(), now, force: true }, app);
  await recordStaffChange(context, "Updated the stores' in-app products");
  revalidatePath(PAGE);
  const done = report.google.done + report.apple.done;
  const failed = report.google.failed + report.apple.failed;
  return failed === 0 && report.google.waiting + report.apple.waiting === 0
    ? { ok: true, message: "The stores are up to date." }
    : { ok: failed === 0, message: `Done: ${done} updated, ${failed} failed. Failed ones are tried again every hour.` };
}
