"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordOrderStatus } from "@/lib/team/activity";
import type { TeamPermission } from "@/lib/team/permissions";
import { getBlobStore } from "@/lib/blobs";
import { parseFulfilmentForm } from "@/lib/catalog/fulfilment";
import { changeOrderStatus, inKitchen } from "@/lib/catalog/order-status";
import { parseShipment, shipOrder, shippable } from "@/lib/catalog/shipping";
import { sendTemplate } from "@/lib/email/send";
import { CATALOG_CURRENCIES, parsePrice } from "@/lib/catalog/money";
import { readProductNumbers } from "@/lib/catalog/product-fields";
import { parseOptionGroups } from "@/lib/catalog/options";
import { catalogSettings, encryptOwnPayment, type OwnPaymentInput } from "@/lib/catalog/settings";
import { newId } from "@/lib/crypto/tokens";
import { imageType } from "@/lib/images";
import { chosenPictures } from "@/lib/media/pictures";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency, CatalogProductInput } from "@/lib/data/types";
import { encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { validKashierMerchantId } from "@/lib/payments/kashier";
import { checkAccount, isPaymentProvider, PROVIDER_NAME, type PaymentAccount } from "@/lib/payments/provider";
import { recordStaffChange } from "@/lib/admin/audit";
import { serviceAccountOf } from "@/lib/hosted/notify";

const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGES_MAX = 6;

/**
 * An active client whose app sells from the dashboard (products, or with
  * `courses` also paid courses, 27 memberships and 28 paid tickets: card payments and orders; 29 with `campaigns`
  * also a charity's own payment keys), or a redirect.
 */
async function requireCatalogApp(options: { courses?: boolean; campaigns?: boolean } = {}, permission: TeamPermission = "catalog"): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const kind = context.app?.connector?.kind;
  if (!context.app || !(kind === "catalog" || (options.courses && (kind === "courses" || kind === "bookings" || kind === "events")) || (options.campaigns && kind === "campaigns"))) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function refresh() {
  revalidatePath("/dashboard/catalog", "layout");
  revalidatePath("/dashboard/courses", "layout");
  revalidatePath("/dashboard/memberships");
  revalidatePath("/dashboard/events", "layout");
  revalidatePath("/dashboard/campaigns", "layout");
  revalidatePath("/dashboard/orders");
}

// Categories

export async function addCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const name = str(formData, "name");
  if (!name) return { errors: { name: "Enter a name." } };
  if (name.length > 80) return { errors: { name: "Use at most 80 characters." }, values: { name } };
  const store = await getStore();
  if ((await store.listCatalogCategories(app.id)).length >= 50) return { message: "You can have up to 50 categories." };
  await store.createCatalogCategory({ appId: app.id, name, now: new Date() });
  refresh();
  return { ok: true, message: `Added “${name}”.` };
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const name = str(formData, "name").slice(0, 80);
  const id = Number(formData.get("id"));
  if (name && Number.isSafeInteger(id)) await (await getStore()).renameCatalogCategory(app.id, id, name);
  refresh();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id)) await (await getStore()).deleteCatalogCategory(app.id, id, new Date());
  refresh();
}

// Products


export async function saveProductAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null ? await store.getCatalogProduct(app.id, id) : null;
  if (id !== null && !existing) return { message: "This product doesn't exist anymore." };

  const values: Record<string, string> = {};
  for (const key of ["name", "description", "price", "salePrice", "stock", "sku"]) values[key] = str(formData, key);
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "Enter the product name.";
  else if (values.name.length > 120) errors.name = "Use at most 120 characters.";
  if (values.description!.length > 5000) errors.description = "Use at most 5000 characters.";
  const numbers = readProductNumbers({ price: values.price!, salePrice: values.salePrice!, stock: values.stock! });
  Object.assign(errors, numbers.errors);
  const { priceCents: price, salePriceCents: salePrice, stock } = numbers;
  if (values.sku!.length > 64) errors.sku = "Use at most 64 characters.";
  // 26 Option groups (a dish's size, sauce or extras), from the options editor as JSON.
  values.optionGroups = String(formData.get("optionGroups") ?? "");
  const optionGroups = parseOptionGroups(values.optionGroups);
  if (!optionGroups.ok) errors.optionGroups = optionGroups.error;

  const categories = new Set((await store.listCatalogCategories(app.id)).map((c) => c.id));
  const categoryIds = formData
    .getAll("categoryIds")
    .map(Number)
    .filter((c) => categories.has(c));

  const remove = new Set(formData.getAll("removeImage").map(String));
  const kept = (existing?.imageAssetIds ?? []).filter((a) => !remove.has(a));
  const files = formData.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0);
  // 51 Pictures chosen from the Media library.
  const fromMedia = (await chosenPictures(store, app.id, formData)).filter((id) => !kept.includes(id));
  if (kept.length + files.length + fromMedia.length > PRODUCT_IMAGES_MAX) errors.images = `A product can have up to ${PRODUCT_IMAGES_MAX} photos.`;
  const uploads: { data: Buffer; type: { contentType: string; extension: string } }[] = [];
  for (const file of errors.images ? [] : files) {
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      errors.images = `Each photo can be up to ${PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024} MB.`;
      break;
    }
    const data = Buffer.from(await file.arrayBuffer());
    const type = imageType(data);
    if (!type) {
      errors.images = "Photos must be PNG or JPEG files.";
      break;
    }
    uploads.push({ data, type });
  }
  if (Object.keys(errors).length > 0) return { errors, values };

  const imageAssetIds = [...kept];
  for (const upload of uploads) {
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.${upload.type.extension}`;
    await getBlobStore().put(blobKey, upload.data, upload.type.contentType);
    await store.createAsset({
      id: assetId,
      clientId: context.client.id,
      kind: "product_image",
      blobKey,
      contentType: upload.type.contentType,
      size: upload.data.length,
      createdAt: now,
    });
    imageAssetIds.push(assetId);
  }
  imageAssetIds.push(...fromMedia);
  const input: CatalogProductInput = {
    appId: app.id,
    name: values.name!,
    description: values.description!,
    priceCents: price!,
    salePriceCents: salePrice,
    categoryIds,
    imageAssetIds,
    stock,
    digital: formData.get("digital") === "on",
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    sku: values.sku || null,
    optionGroups: optionGroups.ok && optionGroups.value.length > 0 ? optionGroups.value : null,
  };
  if (existing) await store.updateCatalogProduct(app.id, existing.id, input, now);
  else await store.createCatalogProduct(input, now);
  refresh();
  redirect(`/dashboard/catalog?saved=${encodeURIComponent(input.name)}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id)) await (await getStore()).deleteCatalogProduct(app.id, id);
  refresh();
  redirect("/dashboard/catalog");
}

// Shop settings

export async function saveShopSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const values = { currency: str(formData, "currency"), shipping: str(formData, "shipping"), freeOver: str(formData, "freeOver") };
  const errors: Record<string, string> = {};
  if (!CATALOG_CURRENCIES.includes(values.currency as CatalogCurrency)) errors.currency = "Choose a currency.";
  const shipping = values.shipping ? parsePrice(values.shipping) : 0;
  if (shipping === null) errors.shipping = "Enter an amount, or leave it empty for free shipping.";
  const freeOver = values.freeOver ? parsePrice(values.freeOver) : null;
  if (values.freeOver && freeOver === null) errors.freeOver = "Enter an amount, or leave it empty.";
  if (Object.keys(errors).length > 0) return { errors, values };
  const now = new Date();
  const settings = catalogSettings(app);
  await (await getStore()).updateApp(
    app.id,
    { catalogSettings: { ...settings, currency: values.currency as CatalogCurrency, shippingCents: shipping!, freeShippingOverCents: freeOver } },
    now,
  );
  refresh();
  return { ok: true, message: "Shop settings saved.", values };
}

/** 26 A restaurant's pickup and delivery: hours, fees, areas and order times. */
export async function saveFulfilmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  if (app.vertical !== "restaurant") return { message: "Pickup and delivery are for restaurants and cafés.", values };
  const parsed = parseFulfilmentForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), fulfilment: parsed.value } }, new Date());
  refresh();
  return { ok: true, message: "Pickup and delivery saved.", values };
}

/**
 * The owner's own merchant account: 37 iyzico (API key, secret key),
 * Kashier (merchant ID, Payment API key, secret key) or Fawaterk (API key),
 * each with its test switch. The keys are checked with the provider by a
 * call that changes nothing, then kept encrypted.
 */
export async function savePaymentKeysAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({ courses: true, campaigns: true }, "billing");
  const { app } = context;
  const provider = str(formData, "provider") || "iyzico";
  const sandbox = formData.get("sandbox") === "on";
  const values = { provider, merchantId: str(formData, "merchantId"), sandbox: sandbox ? "on" : "" };
  if (!isPaymentProvider(provider)) return { errors: { provider: "Choose your payment provider." }, values };
  const read = readOwnKeys(provider, formData, sandbox);
  if (!read.ok) return { errors: read.errors, values };
  const name = PROVIDER_NAME[provider];
  const accepted = await checkAccount(accountOf(read.input), { urls: paymentApiUrls() });
  if (accepted === false) {
    return {
      errors: { apiKey: `${name} didn't accept these keys. Check them, and that they're your ${sandbox ? "test" : "live"} keys.` },
      values,
    };
  }
  const now = new Date();
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: encryptOwnPayment(app.id, read.input, encryptionKey()) } }, now);
  await recordStaffChange(context, `Saved the shop's own ${name} keys (${sandbox ? "test" : "live"})`);
  refresh();
  return {
    ok: true,
    message: accepted ? `${name} keys saved. Your app can take payments.` : `Keys saved. We couldn't reach ${name} to check them; try a test order.`,
  };
}

/** 37 The keys a provider needs, from the form. */
function readOwnKeys(
  provider: OwnPaymentInput["provider"],
  formData: FormData,
  sandbox: boolean,
): { ok: true; input: OwnPaymentInput } | { ok: false; errors: Record<string, string> } {
  const key = (name: string) => {
    const value = str(formData, name);
    return value && value.length <= 300 && !/\s/.test(value) ? value : null;
  };
  const errors: Record<string, string> = {};
  const name = PROVIDER_NAME[provider];
  const apiKey = key("apiKey");
  if (!apiKey) errors.apiKey = provider === "kashier" ? "Paste your Kashier Payment API key." : `Paste your ${name} API key.`;
  if (provider === "fawaterk") return apiKey ? { ok: true, input: { provider, apiKey, sandbox } } : { ok: false, errors };
  const secretKey = key("secretKey");
  if (!secretKey) errors.secretKey = `Paste your ${name} secret key.`;
  if (provider === "iyzico") return apiKey && secretKey ? { ok: true, input: { provider, apiKey, secretKey, sandbox } } : { ok: false, errors };
  const merchantId = str(formData, "merchantId");
  if (!validKashierMerchantId(merchantId)) errors.merchantId = "Enter your merchant ID, like MID-1234-567.";
  return apiKey && secretKey && !errors.merchantId ? { ok: true, input: { provider, merchantId, apiKey, secretKey, sandbox } } : { ok: false, errors };
}

function accountOf(input: OwnPaymentInput): PaymentAccount {
  if (input.provider === "kashier") return { provider: "kashier", keys: { merchantId: input.merchantId, apiKey: input.apiKey, secretKey: input.secretKey, sandbox: input.sandbox } };
  if (input.provider === "fawaterk") return { provider: "fawaterk", keys: { apiKey: input.apiKey, sandbox: input.sandbox } };
  return { provider: "iyzico", keys: { apiKey: input.apiKey, secretKey: input.secretKey, sandbox: input.sandbox } };
}

export async function removePaymentKeysAction(): Promise<void> {
  const context = await requireCatalogApp({ courses: true, campaigns: true }, "billing");
  const { app } = context;
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: null } }, new Date());
  await recordStaffChange(context, "Turned off the shop's card payments");
  refresh();
}

// Orders

/** Completed or cancelled (orders/page.tsx); a restaurant's order moves with the kitchen's steps (moveOrderAction). */
export async function setOrderStatusAction(formData: FormData): Promise<void> {
  const context = await requireCatalogApp({ courses: true }, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const now = new Date();
  if (order && !inKitchen(order) && (await changeOrderStatus({ store, app, now, key: encryptionKey(), urls: paymentApiUrls(), account: null }, order, status))) {
    // 60 Who moved it, on the Team page.
    await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), orderId: order.id, to: status }, now);
  }
  refresh();
}

/**
 * 80.4 Shipping on the Orders page: the carrier (any) and at least one of the
 * tracking link, the tracking number and the waybill; the customer is told
 * (their inbox, a push, an email).
 */
export async function shipOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({}, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const values = {
    carrier: String(formData.get("carrier") ?? ""),
    trackingNumber: String(formData.get("trackingNumber") ?? ""),
    trackingUrl: String(formData.get("trackingUrl") ?? ""),
    waybill: String(formData.get("waybill") ?? ""),
  };
  if (!order || !shippable(order)) return { ok: false, message: "This order has nothing to ship.", values };
  const now = new Date();
  const parsed = parseShipment(values, now);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const shipped = await shipOrder({
    store,
    app,
    order,
    shipment: parsed.shipment,
    account: serviceAccountOf(app, encryptionKey()),
    now,
    mail: (to, mailValues) => sendTemplate("order_shipped", to, mailValues, { app }),
  });
  if (!shipped) return { ok: false, message: "This order has nothing to ship.", values };
  // 60 Who shipped it, on the Team page.
  await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), orderId: order.id, to: "shipped" }, now);
  refresh();
  return { ok: true, message: order.shipment ? "Tracking saved. The customer was told." : "Marked shipped. The customer was told." };
}

/**
 * 26 The Kitchen page's buttons: a restaurant's order moves forward
 * (preparing, ready, out for delivery, completed) or is cancelled, and the
 * customer is told. Completing a marketplace order releases the shop's share.
 */
export async function moveOrderAction(formData: FormData): Promise<void> {
  const context = await requireCatalogApp({}, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const to = String(formData.get("to"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const now = new Date();
  if (order && inKitchen(order) && (await changeOrderStatus({ store, app, now, key: encryptionKey(), urls: paymentApiUrls(), account: serviceAccountOf(app, encryptionKey()) }, order, to))) {
    await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), orderId: order.id, to }, now);
  }
  refresh();
}
