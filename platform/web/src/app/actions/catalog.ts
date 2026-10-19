"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { parseFulfilmentForm } from "@/lib/catalog/fulfilment";
import { moveOrder } from "@/lib/catalog/kitchen";
import { CATALOG_CURRENCIES, parsePrice } from "@/lib/catalog/money";
import { parseOptionGroups } from "@/lib/catalog/options";
import { parsePayeeForm, parseSubMerchantForm } from "@/lib/catalog/marketplace";
import { approvePayout } from "@/lib/catalog/payment";
import { accountForOrder, catalogSettings, encryptOwnPayment, encryptPayout, marketplaceTerms, type OwnPaymentInput } from "@/lib/catalog/settings";
import { newId } from "@/lib/crypto/tokens";
import { imageType } from "@/lib/images";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency, CatalogOrderStatus, CatalogProductInput, FulfilmentStatus, MarketplacePayment } from "@/lib/data/types";
import { encryptionKey, iyzicoApiUrl, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { createSubMerchant, IyzicoError } from "@/lib/payments/iyzico";
import { validKashierMerchantId } from "@/lib/payments/kashier";
import { checkAccount, isPaymentProvider, PROVIDER_NAME, type PaymentAccount } from "@/lib/payments/provider";
import { recordStaffChange } from "@/lib/admin/audit";
import { featureOn, getSwitches } from "@/lib/switches";
import { serviceAccountOf } from "@/lib/hosted/notify";

const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGES_MAX = 6;

/**
 * An active client whose app sells from the dashboard (products, or with
  * `courses` also paid courses, 27 memberships and 28 paid tickets: card payments and orders; 29 with `campaigns`
  * also a charity's own payment keys), or a redirect.
 */
async function requireCatalogApp(options: { courses?: boolean; campaigns?: boolean } = {}): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
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
  const price = parsePrice(values.price!);
  if (price === null || price === 0) errors.price = "Enter a price, like 450 or 450.50.";
  const salePrice = values.salePrice ? parsePrice(values.salePrice) : null;
  if (values.salePrice && (salePrice === null || (price !== null && salePrice >= price))) {
    errors.salePrice = "The sale price must be lower than the price.";
  }
  let stock: number | null = null;
  if (values.stock) {
    stock = Number(values.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) errors.stock = "Enter a whole number, or leave it empty.";
  }
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
  if (kept.length + files.length > PRODUCT_IMAGES_MAX) errors.images = `A product can have up to ${PRODUCT_IMAGES_MAX} photos.`;
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
  const context = await requireCatalogApp({ courses: true, campaigns: true });
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

const SUB_MERCHANT_FIELDS = ["type", "payeeName", "contactName", "email", "phone", "address", "iban", "identityNumber", "taxOffice", "legalCompanyTitle", "taxNumber"];

/**
 * The shop sells through Yallapp's account. With iyzico, iyzico registers it
 * as a sub-merchant that gets each sale minus the commission. 37 With
 * Kashier or Fawaterk the shop gives who gets paid and its IBAN, and the
 * team transfers each released share.
 */
export async function joinMarketplaceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({ courses: true });
  const { app } = context;
  const values: Record<string, string> = {};
  for (const name of SUB_MERCHANT_FIELDS) values[name] = str(formData, name);
  const store = await getStore();
  const terms = await marketplaceTerms(store, encryptionKey());
  // 11.5 Switches: joining can be switched off, for everyone or per plan.
  if (!terms || !featureOn(await getSwitches(store), "marketplace", context.license?.plan ?? null)) {
    return { message: "Selling through Yallapp isn't available right now. Add your own payment keys instead.", values };
  }
  const now = new Date();
  const join = async (payment: MarketplacePayment, iban: string) => {
    await store.updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment } }, now);
    await recordStaffChange(context, `Joined selling through Yallapp (payee ${payment.payeeName})`);
    refresh();
    const who = payment.subMerchantKey ? "iyzico pays" : "Yallapp transfers";
    return { ok: true, message: `Done. Your app takes payments now; ${who} your share to the IBAN ending ${iban.slice(-4)}.` };
  };
  if (terms.account.provider !== "iyzico") {
    const parsed = parsePayeeForm(values);
    if (!parsed.ok) return { errors: parsed.errors, values };
    return join(
      {
        provider: "yallapp",
        via: terms.account.provider,
        subMerchantKey: "",
        subMerchantType: "PERSONAL",
        payeeName: parsed.payee.name,
        ibanLast4: parsed.payee.iban.slice(-4),
        // The team transfers the shares: it needs the whole IBAN and who to ask, kept encrypted.
        payoutEncrypted: encryptPayout(app.id, parsed.payee, encryptionKey()),
        sandbox: terms.account.keys.sandbox,
        joinedAt: now.toISOString(),
      },
      parsed.payee.iban,
    );
  }
  const parsed = parseSubMerchantForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  let subMerchantKey: string;
  try {
    subMerchantKey = await createSubMerchant(
      terms.account.keys,
      { ...parsed.details, conversationId: `shop-${app.id}`, subMerchantExternalId: app.id, currency: catalogSettings(app).currency },
      { baseUrl: iyzicoApiUrl() },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return { message: `iyzico didn't accept these details: ${e.message}`, values };
    throw e;
  }
  return join(
    {
      provider: "yallapp",
      subMerchantKey,
      subMerchantType: parsed.details.subMerchantType,
      payeeName: parsed.details.name,
      ibanLast4: parsed.details.iban.slice(-4),
      sandbox: terms.account.keys.sandbox,
      joinedAt: now.toISOString(),
    },
    parsed.details.iban,
  );
}

export async function removePaymentKeysAction(): Promise<void> {
  const context = await requireCatalogApp({ courses: true, campaigns: true });
  const { app } = context;
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: null } }, new Date());
  await recordStaffChange(context, "Turned off the shop's card payments");
  refresh();
}

// Orders

// 47 Refunds go through the Refund form (app/actions/refunds.ts), which records them: never a bare status.
const NEXT_STATUSES: Partial<Record<CatalogOrderStatus, CatalogOrderStatus[]>> = {
  processing: ["completed", "cancelled"],
};

export async function setOrderStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp({ courses: true });
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as CatalogOrderStatus;
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  // 26 A restaurant's order in the kitchen moves with the kitchen's steps (moveOrderAction).
  if (order && !(order.fulfilment && order.status === "processing") && NEXT_STATUSES[order.status]?.includes(status)) {
    const now = new Date();
    await store.updateCatalogOrder(app.id, order.id, { status, updatedAt: now });
    // A completed marketplace order releases the shop's share; our team can also do it from the admin.
    if (status === "completed" && order.commissionCents !== null && !order.payoutApprovedAt) {
      const account = await accountForOrder(store, app, order, encryptionKey());
      if (account) await approvePayout({ store, app, account, urls: paymentApiUrls(), now, order });
    }
  }
  refresh();
}

/**
 * 26 The Kitchen page's buttons: a restaurant's order moves forward
 * (preparing, ready, out for delivery, completed) or is cancelled, and the
 * customer is told. Completing a marketplace order releases the shop's share.
 */
export async function moveOrderAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const to = String(formData.get("to")) as FulfilmentStatus;
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  if (order) {
    const now = new Date();
    const { moved } = await moveOrder({ store, app, order, to, account: serviceAccountOf(app, encryptionKey()), now });
    if (moved && to === "completed" && order.commissionCents !== null && !order.payoutApprovedAt) {
      const account = await accountForOrder(store, app, order, encryptionKey());
      if (account) await approvePayout({ store, app, account, urls: paymentApiUrls(), now, order });
    }
  }
  refresh();
}
