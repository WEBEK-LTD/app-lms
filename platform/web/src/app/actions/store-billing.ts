"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { usesPlugin } from "@/lib/app/label";
import { getStore } from "@/lib/data";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { appPlan } from "@/lib/entitlements";
import type { FormState } from "@/lib/forms";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { appUrl, encryptionKey } from "@/lib/env";
import { resendWebhook } from "@/lib/hosted/api-webhooks";
import { LISTED_SOURCES, planHasStoreBilling, storeBillingSource } from "@/lib/store-billing/access";
import { checkStoreKeys } from "@/lib/store-billing/check";
import { ITEM_CURRENCIES, itemOf, parseItem, productIdTaken, reconcileListedItems, schoolCourses } from "@/lib/store-billing/items";
import { priceText, storesOf } from "@/lib/store-billing/products";
import { settlePurchase } from "@/lib/store-billing/purchases";
import { syncStoreProducts } from "@/lib/store-billing/sync";

/**
 * 100.2 Dashboard › In-app purchases: selling in the app on or off, each
 * product's own price, checking the store keys and updating the stores now.
 * 100.7 The owner's list of what the app sells (own API, Teachable,
 * Thinkific): adding, changing, stopping and selling again; sending a
 * purchase notice to the client's API again.
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

/** 100.7 Adds a course or plan to the owner's list, or changes one (its kind, ID and a plan's period stay). */
export async function saveStoreItemAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  if (!LISTED_SOURCES.includes(storeBillingSource(app)!)) return { ok: false, message: "This app's products come from its courses, not from a list." };
  const field = (name: string) => String(formData.get(name) ?? "");
  // What the owner typed stays in the form when it can't be saved.
  const values = Object.fromEntries(["kind", "item", "title", "price", "currency", "period", "courses"].map((name) => [name, field(name).slice(0, 2000)]));
  const parsed = parseItem({ kind: field("kind"), itemId: field("item"), title: field("title"), price: field("price"), currency: field("currency"), period: field("period"), courseIds: field("courses") });
  if (!parsed.ok) return { ok: false, message: parsed.message, values };
  const items = await store.listStoreBillingItems(app.id);
  if (productIdTaken(items, parsed.value)) return { ok: false, message: "Another plan already makes this product ID. Use a different plan ID.", values };
  const existing = items.find((i) => i.kind === parsed.value.kind && i.itemId === parsed.value.itemId) ?? null;
  await store.saveStoreBillingItem(itemOf(app.id, parsed.value, existing, now));
  await reconcileListedItems({ store, key: encryptionKey() }, app, now);
  await recordStaffChange(context, `${existing ? "Changed" : "Added"} the in-app ${parsed.value.kind === "course" ? "course" : "plan"} ${parsed.value.itemId} (${parsed.value.price} ${parsed.value.currency})`);
  revalidatePath(PAGE);
  return { ok: true, message: "Saved. The stores get it within minutes once selling in the app is on." };
}

/** 100.7 Stops selling a listed course or plan (or a school's course), or sells it again. Its product is stopped, never deleted. */
export async function setStoreItemActiveAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, now, plan } = await context_();
  if (!planHasStoreBilling(plan)) return { ok: false, message: "In-app purchases come with every plan but Starter." };
  const source = storeBillingSource(app);
  if (!LISTED_SOURCES.includes(source!)) return { ok: false, message: "This app's products come from its courses, not from a list." };
  const kind = formData.get("kind") === "membership" ? "membership" : "course";
  const itemId = String(formData.get("item") ?? "");
  const active = formData.get("active") === "1";
  const existing = (await store.listStoreBillingItems(app.id)).find((i) => i.kind === kind && i.itemId === itemId) ?? null;
  if (existing) {
    await store.saveStoreBillingItem({ ...existing, active, updatedAt: now });
  } else {
    // A school's course the owner hasn't listed: stopping it lists it, stopped.
    const course = source !== "own_api" && kind === "course" ? ((await schoolCourses({ store, key: encryptionKey() }, app)) ?? null) : null;
    if (source !== "own_api" && kind === "course" && !course) return { ok: false, message: "Your school couldn't be read just now. Try again in a few minutes." };
    const found = course?.find((c) => String(c.id) === itemId);
    if (!found) return { ok: false, message: "This isn't in your list." };
    await store.saveStoreBillingItem({
      ...itemOf(app.id, { kind: "course", itemId, title: found.title.slice(0, 200), price: found.price ?? "0.00", currency: found.currency ?? ITEM_CURRENCIES[1], period: null, courseIds: [found.id] }, null, now),
      active,
    });
  }
  await reconcileListedItems({ store, key: encryptionKey() }, app, now);
  await recordStaffChange(context, `${active ? "Sold again" : "Stopped selling"} the in-app ${kind === "course" ? "course" : "plan"} ${itemId}`);
  revalidatePath(PAGE);
  return { ok: true, message: active ? "It's sold again." : "Stopped. The stores stop selling it within minutes; people who bought it keep it." };
}

/** 100.7 Sends a failed purchase notice to the client's API again; once delivered, the purchase is settled (acknowledged with Google). */
export async function resendPurchaseNoticeAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, now } = await context_();
  if (storeBillingSource(app) !== "own_api") return { ok: false, message: "This notice can't be sent again." };
  const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { ok: false, message: "Too many tries. Try again in a few minutes." };
  const id = String(formData.get("id") ?? "");
  const before = await store.getApiWebhook(id);
  if (!before || before.appId !== app.id || !before.event.startsWith("purchase.")) return { ok: false, message: "This notice can't be sent again." };
  const sent = await resendWebhook({ store, encryptionKey: encryptionKey(), platformUrl: appUrl(), now: () => new Date() }, app.id, id);
  if (!sent) return { ok: false, message: "This notice can't be sent again." };
  const change = sent.data?.purchase;
  if (sent.status === "delivered" && change) {
    const purchase = await store.getStorePurchase(app.id, change.platform, change.storeKey);
    if (purchase && !purchase.delivered) await settlePurchase({ store, key: encryptionKey(), now }, app, purchase);
  }
  await recordStaffChange(context, `Sent a purchase notice again: ${sent.status === "delivered" ? "delivered" : "not delivered yet"}`);
  revalidatePath(PAGE);
  return sent.status === "delivered"
    ? { ok: true, message: "Sent again: your API received it." }
    : { ok: false, message: "Sent again, but your API didn't receive it yet. It's tried again for about two days." };
}
