"use server";

import { readProductDetails } from "@/lib/catalog/product-details";
import { decideReturn } from "@/lib/catalog/returns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordOrderStatus, recordRefund, recordTeamActivity } from "@/lib/team/activity";
import type { TeamPermission } from "@/lib/team/permissions";
import { getBlobStore } from "@/lib/blobs";
import { parseCoupon } from "@/lib/catalog/coupons";
import { parseFulfilmentForm } from "@/lib/catalog/fulfilment";
import { changeOrderStatus, inKitchen } from "@/lib/catalog/order-status";
import { parseStageInput, setOrderStage } from "@/lib/catalog/order-stages";
import { markStageRefunded, type StageRefundDeps } from "@/lib/catalog/stage-refunds";
import { cancelNeedsChoice, cancelOrder, readRefundChoice } from "@/lib/catalog/cancel";
import { duplicateCategory, readCategoryNames } from "@/lib/catalog/category-names";
import { parentChoice } from "@/lib/selling/fashion";
import type { GuestMailer } from "@/lib/hosted/auto-notifications";
import { headers } from "next/headers";
import { ipFromHeaders } from "@/lib/http";
import { parseShipment, shipOrder, shippable } from "@/lib/catalog/shipping";
import { sendAppMail, sendTemplate } from "@/lib/email/send";
import { CATALOG_CURRENCIES, formatCents, parsePrice } from "@/lib/catalog/money";
import { isCurrencyCode } from "@/lib/money/currencies";
import { LOYALTY_LIMITS } from "@/lib/catalog/loyalty";
import { awaitingManualPayment, manualChoices, readManualPayments } from "@/lib/catalog/manual";
import { TAX_RATE_MAX_BPS } from "@/lib/catalog/tax";
import { parseVariants } from "@/lib/catalog/variants";
import { parseDetailsForm } from "@/lib/catalog/details";
import { readProductNumbers } from "@/lib/catalog/product-fields";
import { parseOptionGroups } from "@/lib/catalog/options";
import { catalogSettings, encryptOwnPayment, isOwnPayment, ownPaymentInput } from "@/lib/catalog/settings";
import { newId } from "@/lib/crypto/tokens";
import { imageType } from "@/lib/images";
import { chosenPictures } from "@/lib/media/pictures";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency, CatalogProductInput, CatalogSettings, CatalogTax, OwnPayment } from "@/lib/data/types";
import { conversionOf, convertShopRecords, currencyChangeLine, settingsAt, shopHasPrices } from "@/lib/catalog/currency-change";
import { currentRates } from "@/lib/money/rates";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { missingKeysReport, testConnection, type PaymentTestState } from "@/lib/payments/connection";
import { accountOf, readOwnKeys } from "@/lib/payments/owner-keys";
import { checkAccount, isPaymentProvider, PROVIDER_NAME } from "@/lib/payments/provider";
import { stripeWebhookUrl } from "@/lib/payments/stripe-keys";
import { webhookReceipt } from "@/lib/payments/webhooks";
import { checkWalletDomain, noteWalletProblem, walletDomain } from "@/lib/payments/wallets";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { recordStaffChange } from "@/lib/admin/audit";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { askAfterOwnEntry } from "@/lib/samples/lists";
import { parseAddonRule } from "@/lib/selling/addons";
import { changedPrices, isBulkOp, orderedImages, parsePercent } from "@/lib/catalog/bulk";
import { testedOnSaved } from "@/lib/selling/in-app-pay";

const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGES_MAX = 6;

/**
 * An active client whose app sells from the dashboard (products, or with
  * `courses` also paid courses, 27 memberships and 28 paid tickets: card payments and orders; 29 with `campaigns`
  * also a charity's own payment keys), or a redirect.
 */
/** 104–105.4 Apps whose card payments go to the owner's own account without a shop: delivery, food, ride and school apps. */
const OWN_MONEY_KINDS = ["deliveries", "restaurants", "rides", "school"];

async function requireCatalogApp(options: { courses?: boolean; campaigns?: boolean; ownMoney?: boolean; store?: boolean } = {}, permission: TeamPermission = "catalog"): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const kind = context.app?.connector?.kind;
  if (
    !context.app ||
    !(
      kind === "catalog" ||
      (options.courses && (kind === "courses" || kind === "bookings" || kind === "events")) ||
      (options.campaigns && kind === "campaigns") ||
      // 131 Any store app's coupons (shown in the app; a connected platform's checkout applies its own).
      (options.store && context.app.appType === "store") ||
      (options.ownMoney && kind !== undefined && OWN_MONEY_KINDS.includes(kind))
    )
  )
    redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function refresh() {
  revalidatePath("/dashboard/catalog", "layout");
  revalidatePath("/dashboard/selling", "layout");
  revalidatePath("/dashboard/courses", "layout");
  revalidatePath("/dashboard/memberships");
  revalidatePath("/dashboard/events", "layout");
  revalidatePath("/dashboard/campaigns", "layout");
  revalidatePath("/dashboard/orders");
  // 104–105.4 Card payments of delivery, ride and school apps.
  revalidatePath("/dashboard/delivery");
  revalidatePath("/dashboard/ride-settings");
  revalidatePath("/dashboard/school/settings");
  // 132.120 The one Payments page, in the dashboard and in Studio.
  revalidatePath("/dashboard/payments");
  revalidatePath("/studio/project/payments");
}

// Categories

export async function addCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const name = str(formData, "name");
  const values = { name, name_ar: str(formData, "name_ar"), name_tr: str(formData, "name_tr") };
  if (!name) return { errors: { name: "Enter a name." }, values };
  if (name.length > 80) return { errors: { name: "Use at most 80 characters." }, values };
  const store = await getStore();
  const categories = await store.listCatalogCategories(app.id);
  if (categories.length >= 50) return { message: "You can have up to 50 categories.", values };
  // 175 Two categories of one name read as one in the app.
  if (duplicateCategory(categories, name)) return { errors: { name: "You already have a category with this name. Choose another, or use that one." }, values };
  // 208 Inside a main category, when one is chosen.
  await store.createCatalogCategory({ appId: app.id, name, now: new Date(), names: readCategoryNames((f) => str(formData, f)), parentId: app.vertical === "restaurant" ? null : parentChoice(categories, null, formData.get("parent")) });
  refresh();
  return { ok: true, message: `Added “${name}”.` };
}

/** Renames a category, and 175 its Arabic and Turkish names; a name another category has is left as it was (the list warns). */
export async function renameCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const name = str(formData, "name").slice(0, 80);
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id)) return refresh();
  const store = await getStore();
  if (name && !duplicateCategory(await store.listCatalogCategories(app.id), name, id)) await store.renameCatalogCategory(app.id, id, name);
  if (formData.has("name_ar") || formData.has("name_tr")) await store.setCatalogCategoryNames(app.id, id, readCategoryNames((f) => str(formData, f)));
  // 208 Inside a main category, or a main one again.
  if (formData.has("parent") && app.vertical !== "restaurant") await store.setCatalogCategoryParent(app.id, id, parentChoice(await store.listCatalogCategories(app.id), id, formData.get("parent")));
  refresh();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id)) await (await getStore()).deleteCatalogCategory(app.id, id, new Date());
  refresh();
}

/** 132.12 The categories in the order they were dragged to (the app's menu and tabs follow it). */
export async function reorderCategoriesAction(ids: number[]): Promise<void> {
  const { app } = await requireCatalogApp();
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 200);
  if (list.length) await (await getStore()).reorderCatalogCategories(app.id, list);
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
  for (const key of ["name", "description", "price", "salePrice", "stock", "sku", "weight", "width", "depth", "height", "makeMin", "makeMax"]) values[key] = str(formData, key);
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "Enter the product name.";
  else if (values.name.length > 120) errors.name = "Use at most 120 characters.";
  if (values.description!.length > 5000) errors.description = "Use at most 5000 characters.";
  const numbers = readProductNumbers({ price: values.price!, salePrice: values.salePrice!, stock: values.stock!, weight: values.weight, currency: catalogSettings(app).currency });
  Object.assign(errors, numbers.errors);
  // 210 Its size in cm and the days it takes to make.
  const details = readProductDetails({ width: values.width, depth: values.depth, height: values.height, makeMin: values.makeMin, makeMax: values.makeMax });
  Object.assign(errors, details.errors);
  const { priceCents: price, salePriceCents: salePrice, stock } = numbers;
  if (values.sku!.length > 64) errors.sku = "Use at most 64 characters.";
  // 26 Option groups (a dish's size, sauce or extras), from the options editor as JSON.
  values.optionGroups = String(formData.get("optionGroups") ?? "");
  const optionGroups = parseOptionGroups(values.optionGroups, catalogSettings(app).currency);
  if (!optionGroups.ok) errors.optionGroups = optionGroups.error;
  // 91.5 Variations (size, colour), from the variations editor as JSON.
  values.variants = String(formData.get("variants") ?? "");
  const variants = parseVariants(values.variants);
  if (!variants.ok) errors.variants = variants.message;

  const categories = new Set((await store.listCatalogCategories(app.id)).map((c) => c.id));
  const categoryIds = formData
    .getAll("categoryIds")
    .map(Number)
    .filter((c) => categories.has(c));

  const remove = new Set(formData.getAll("removeImage").map(String));
  // 132.11 In the order the editor put them (the first is the cover).
  const kept = orderedImages(
    (existing?.imageAssetIds ?? []).filter((a) => !remove.has(a)),
    String(formData.get("imageOrder") ?? "").split(",").filter(Boolean),
  );
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
  // 209 More about it (not a restaurant's): facts, its parts, badges, expiry, ages, swatches.
  const detailFields = Object.fromEntries([...formData.keys()].filter((k) => k.startsWith("detail")).map((k) => [k, str(formData, k)]));
  const details = app.vertical === "restaurant" ? ({ ok: true, value: existing?.details ?? null } as const) : parseDetailsForm(detailFields);
  if (!details.ok) Object.assign(errors, details.errors);
  // 131 A gift add-on, and what it's offered with.
  const addon = formData.get("addon") === "on" && app.vertical !== "restaurant";
  const addonFor = addon
    ? parseAddonRule({ offerWith: str(formData, "addonOfferWith"), categoryIds: formData.getAll("addonCategoryIds").map(String), productIds: formData.getAll("addonProductIds").map(String) })
    : null;
  if (addonFor && !addonFor.ok) Object.assign(errors, addonFor.errors);
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
    // 131 Its weight, for shipping by weight.
    weightGrams: numbers.weightGrams,
    // 210 Its size in cm and the days it takes to make.
    dimensions: details.dimensions,
    makeDays: details.makeDays,
    addon,
    addonFor: addonFor?.ok && addonFor.value.offerWith !== "all" ? addonFor.value : null,
    optionGroups: optionGroups.ok && optionGroups.value.length > 0 ? optionGroups.value : null,
    variants: variants.ok ? variants.variants : null,
    details: details.ok ? details.value : null,
    // 110.2 A sample product saved here is the owner's from now on.
    sample: false,
  };
  if (existing) await store.updateCatalogProduct(app.id, existing.id, input, now);
  else await store.createCatalogProduct(input, now);
  refresh();
  // 110.2 Their first own product next to the samples: the list asks whether to remove them.
  const ask = existing ? null : await askAfterOwnEntry(store, app.id, "products");
  redirect(ask ?? `/dashboard/catalog?saved=${encodeURIComponent(input.name)}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id)) await (await getStore()).deleteCatalogProduct(app.id, id);
  refresh();
  redirect("/dashboard/catalog");
}

/**
 * 132.11 The Products list's bulk actions on the chosen products: shown in
 * the app or hidden, deleted, put in one category (or none), their prices
 * changed by a percent. The list words what happened (`values.done`).
 */
export async function bulkProductsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const op = String(formData.get("op") ?? "");
  if (!isBulkOp(op)) return { message: "Choose what to do with the products." };
  const ids = new Set(formData.getAll("ids").map(Number).filter((id) => Number.isSafeInteger(id) && id > 0));
  const store = await getStore();
  const products = (await store.listCatalogProducts(app.id)).filter((p) => ids.has(p.id));
  if (!products.length) return { message: "Choose at least one product." };
  const now = new Date();
  if (op === "delete") {
    for (const p of products) await store.deleteCatalogProduct(app.id, p.id);
  } else if (op === "publish" || op === "hide") {
    for (const p of products) await store.updateCatalogProduct(app.id, p.id, { active: op === "publish" }, now);
  } else if (op === "category") {
    const value = String(formData.get("value") ?? "");
    const categories = new Set((await store.listCatalogCategories(app.id)).map((c) => c.id));
    const id = Number(value);
    if (value !== "none" && !categories.has(id)) return { message: "Choose a category." };
    for (const p of products) await store.updateCatalogProduct(app.id, p.id, { categoryIds: value === "none" ? [] : [id] }, now);
  } else {
    const percent = parsePercent(String(formData.get("value") ?? ""));
    if (percent === null) return { errors: { value: "Enter a percent from -90 to 500, like 10 or -15." } };
    const changes = products.map((p) => ({ id: p.id, prices: changedPrices(p, percent) }));
    if (changes.some((c) => c.prices === null)) return { errors: { value: "A price would be over 9,999,999.99. Choose a smaller percent." } };
    for (const c of changes) await store.updateCatalogProduct(app.id, c.id, c.prices!, now);
  }
  refresh();
  return { ok: true, values: { done: op, count: String(products.length) } };
}

/**
 * 132.152 A product featured on the app's home screen or not, from the
 * Products page's inspector: the same checks as showing or hiding it (the
 * catalog's app, the team's Products permission), this account's product only.
 */
export async function setProductFeaturedAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const id = Number(formData.get("id"));
  const store = await getStore();
  const product = Number.isSafeInteger(id) && id > 0 ? (await store.listCatalogProducts(app.id)).find((p) => p.id === id) : undefined;
  if (!product) return { message: "Choose at least one product." };
  const featured = formData.get("featured") === "1";
  if (product.featured !== featured) await store.updateCatalogProduct(app.id, product.id, { featured }, new Date());
  refresh();
  return { ok: true, values: { featured: featured ? "1" : "0" } };
}

// Shop settings

export async function saveShopSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp();
  const { app } = context;
  const store = await getStore();
  const before = catalogSettings(app);
  const values = {
    prices: str(formData, "prices"),
    currency: str(formData, "currency"),
    shipping: str(formData, "shipping"),
    freeOver: str(formData, "freeOver"),
    returnDays: str(formData, "returnDays"),
    taxLabel: str(formData, "taxLabel"),
    taxRate: str(formData, "taxRate"),
    taxIncluded: formData.get("taxIncluded") === "on" ? "on" : "",
  };
  const errors: Record<string, string> = {};
  if (!CATALOG_CURRENCIES.includes(values.currency as CatalogCurrency)) errors.currency = "Choose a currency.";
  // 175 A new currency: the owner chooses to convert every price at the day's rate, or to keep the numbers.
  const changing = !errors.currency && values.currency !== before.currency;
  let conversion: ReturnType<typeof conversionOf> = null;
  // Nothing priced yet (a new shop): nothing to convert, nothing to ask.
  const priced = changing && (await shopHasPrices(store, app, before));
  if (priced && values.prices !== "convert" && values.prices !== "keep") errors.prices = "Choose what happens to your prices.";
  if (priced && values.prices === "convert") {
    conversion = conversionOf(await currentRates(store), before.currency, values.currency);
    if (!conversion) errors.prices = "There's no rate between these currencies today. Keep the numbers, or try again tomorrow.";
  }
  // 135.2 In the currency chosen, with its digits (1.250 KWD, ¥1250); 175 converted: the amounts typed are still in the old one.
  const typedIn = conversion ? before.currency : values.currency;
  const shipping = values.shipping ? parsePrice(values.shipping, typedIn) : 0;
  if (shipping === null) errors.shipping = "Enter an amount, or leave it empty for free shipping.";
  const freeOver = values.freeOver ? parsePrice(values.freeOver, typedIn) : null;
  if (values.freeOver && freeOver === null) errors.freeOver = "Enter an amount, or leave it empty.";
  // 91.3 Returns asked for in the app: days after an order is completed; empty for none.
  const returnDays = values.returnDays.trim() === "" ? null : Number(values.returnDays.trim());
  if (returnDays !== null && (!Number.isInteger(returnDays) || returnDays < 1 || returnDays > 365)) errors.returnDays = "Enter a number of days from 1 to 365, or leave it empty for no returns in the app.";
  // 91.5 The tax: a rate (empty for none) and its name, in the prices or added to them.
  const rate = values.taxRate.trim().replace(",", ".");
  let tax: CatalogTax | null = null;
  if (rate !== "") {
    const bps = /^\d{1,3}(\.\d{1,2})?$/.test(rate) ? Math.round(Number(rate) * 100) : NaN;
    if (!Number.isInteger(bps) || bps < 1 || bps > TAX_RATE_MAX_BPS) errors.taxRate = "Enter the tax rate as a percentage, like 20 or 7.5, or leave it empty for no tax.";
    const label = values.taxLabel.replace(/\s+/g, " ").trim();
    if (!label || label.length > 20) errors.taxLabel = "Name the tax, like VAT or KDV, in up to 20 characters.";
    tax = { label: label.slice(0, 20), rateBps: bps, included: values.taxIncluded === "on" };
  }
  if (Object.keys(errors).length > 0) return { errors, values };
  const now = new Date();
  const saved: CatalogSettings = {
    ...before,
    shippingCents: shipping!,
    freeShippingOverCents: freeOver,
    // 26 A restaurant's form has no shipping fields, nor returns: kept as they were.
    ...(formData.has("returnDays") ? { returnDays } : {}),
    ...(formData.has("taxRate") ? { tax } : {}),
  };
  // 175 Converted: the settings' amounts with the new currency, then the products, coupons and flash sales.
  const next = conversion ? settingsAt(saved, conversion.rate, values.currency) : saved;
  await store.updateApp(app.id, { catalogSettings: { ...next, currency: values.currency as CatalogCurrency } }, now);
  if (conversion) await convertShopRecords(store, app, conversion.rate, values.currency, now);
  if (changing) {
    const line = currencyChangeLine(before.currency, values.currency, conversion);
    await recordTeamActivity(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), action: "shop.currency", target: { type: "app", id: app.id }, summary: line }, now);
    await recordStaffChange(context, line);
  }
  refresh();
  const message = !priced ? "Shop settings saved." : conversion ? "Shop settings saved. Your prices were converted." : "Shop settings saved. Your prices kept their numbers: check them.";
  return { ok: true, message, values: { ...values, prices: "" } };
}

/**
 * 135.7 Customers' currencies: whether a customer is charged in their own
 * currency when the card gateway takes it; 149 whether prices show in the
 * customer's currency at all in this app, and only in which (none: any).
 */
export async function saveCustomerCurrenciesAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const charge = formData.get("chargeInCustomerCurrency") === "on";
  const show = formData.get("showInCustomerCurrency") === "on";
  const typed = formData.getAll("customerCurrencies").map((v) => String(v).trim()).filter(Boolean);
  const values = { chargeInCustomerCurrency: charge ? "on" : "", showInCustomerCurrency: show ? "on" : "", customerCurrencies: typed.join(",") };
  if (typed.length > CUSTOMER_CURRENCIES_MAX || typed.some((code) => !isCurrencyCode(code))) {
    return { errors: { customerCurrencies: "Choose the currencies from the list." }, values };
  }
  const settings = catalogSettings(app);
  await (await getStore()).updateApp(
    app.id,
    { catalogSettings: { ...settings, chargeInCustomerCurrency: charge, showInCustomerCurrency: show, customerCurrencies: [...new Set(typed)] } },
    new Date(),
  );
  refresh();
  return { ok: true, message: "Customers' currencies saved.", values };
}

/** 149 At most this many currencies in an app's list (there are 155). */
const CUSTOMER_CURRENCIES_MAX = 160;

/** 91.4 The shop's loyalty points: on or off, what earns a point, what a point is worth, the fewest used at once. */
export async function saveLoyaltyAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const values = { on: formData.get("on") === "on" ? "on" : "", spend: str(formData, "spend"), value: str(formData, "value"), minPoints: str(formData, "minPoints") };
  const errors: Record<string, string> = {};
  const spend = parsePrice(values.spend, catalogSettings(app).currency);
  if (spend === null || spend < 1 || spend > LOYALTY_LIMITS.spendMaxCents) errors.spend = "Enter an amount, like 10.";
  const value = parsePrice(values.value, catalogSettings(app).currency);
  if (value === null || value < 1 || value > LOYALTY_LIMITS.valueMaxCents) errors.value = "Enter an amount, like 0.10.";
  const minPoints = Number(values.minPoints.trim());
  if (!/^\d+$/.test(values.minPoints.trim()) || minPoints < 1 || minPoints > LOYALTY_LIMITS.minPointsMax) errors.minPoints = "Enter a number of points, like 100.";
  // Turning it off keeps nothing to check: the customers' points stay for when it's on again.
  if (values.on && Object.keys(errors).length > 0) return { errors, values };
  const settings = catalogSettings(app);
  const loyalty = values.on ? { spendPerPointCents: spend!, pointValueCents: value!, minPoints } : null;
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...settings, loyalty } }, new Date());
  refresh();
  return { ok: true, message: "Loyalty points saved.", values };
}

/** 96.2 Bank transfer and the owner's own method, paid outside Yallapp (catalog/payments.tsx). */
export async function saveManualPaymentsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({ courses: true }, "billing");
  const { app } = context;
  const values = {
    bankTransfer: str(formData, "bankTransfer"),
    customName: str(formData, "customName"),
    customInstructions: str(formData, "customInstructions"),
    payWithinDays: str(formData, "payWithinDays"),
    // 132.145 Each method's switch on the Payments page.
    bankTransferOn: formData.get("bankTransferOn") === "on" ? "on" : "",
    customOn: formData.get("customOn") === "on" ? "on" : "",
  };
  const read = readManualPayments({ ...values, bankTransferOn: values.bankTransferOn === "on", customOn: values.customOn === "on" });
  if (!read.ok) return { errors: { [read.field]: read.error }, values };
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), manualPayments: read.settings } }, new Date());
  const offered = manualChoices(read.settings).length > 0;
  await recordStaffChange(context, offered ? "Changed the bank transfer and other payment methods" : "Turned off bank transfer and other payment methods");
  refresh();
  return { ok: true, message: offered ? "Payment methods saved." : "Bank transfer and your own method are off.", values };
}

/** 91.1 A coupon for the shop's customers. */
export async function addCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp({ courses: true, store: true });
  const values = couponValues(formData);
  const now = new Date();
  const parsed = parseCoupon(values, now, { currency: catalogSettings(app).currency });
  if (!parsed.ok) return { errors: parsed.errors, values };
  const created = await (await getStore()).createCatalogCoupon({ appId: app.id, ...parsed.value, active: true, createdAt: now });
  if (!created) return { errors: { code: "You already have a coupon with this code." }, values };
  refresh();
  return { ok: true, message: `Added the coupon ${created.code}.` };
}

const couponValues = (formData: FormData) => ({
  code: str(formData, "code"),
  kind: str(formData, "kind"),
  value: str(formData, "value"),
  minOrder: str(formData, "minOrder"),
  startsOn: str(formData, "startsOn"),
  endsOn: str(formData, "endsOn"),
  maxUses: str(formData, "maxUses"),
  public: formData.get("public") === "on" ? "on" : "",
});

/** 131 Changes a coupon's terms (its uses so far stay). */
export async function updateCouponAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp({ courses: true, store: true });
  const id = Number(formData.get("id"));
  const values = couponValues(formData);
  const parsed = parseCoupon(values, new Date(), { editing: true, currency: catalogSettings(app).currency });
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await (await getStore()).updateCatalogCoupon(app.id, id, parsed.value);
  if (!saved) return { errors: { code: "You already have a coupon with this code." }, values };
  refresh();
  return { ok: true, message: `Saved the coupon ${parsed.value.code}.`, values };
}

export async function setCouponActiveAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp({ courses: true, store: true });
  await (await getStore()).setCatalogCouponActive(app.id, Number(formData.get("id")), formData.get("active") === "on");
  refresh();
}

export async function deleteCouponAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp({ courses: true, store: true });
  await (await getStore()).deleteCatalogCoupon(app.id, Number(formData.get("id")));
  refresh();
}

/** 26 A restaurant's pickup and delivery: hours, fees, areas and order times. */
export async function saveFulfilmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp();
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  if (app.vertical !== "restaurant") return { message: "Pickup and delivery are for restaurants and cafés.", values };
  const parsed = parseFulfilmentForm(values, catalogSettings(app).currency);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), fulfilment: parsed.value } }, new Date());
  refresh();
  return { ok: true, message: "Pickup and delivery saved.", values };
}

/**
 * The owner's own merchant account: 37 iyzico (API key, secret key),
 * Kashier (merchant ID, Payment API key, secret key) or Fawaterk (API key),
 * each with its test switch; 96.1 Stripe (132.30 publishable and secret
 * key, test or live by their prefix, 132.31 and the webhook's signing
 * secret) or PayPal (client ID and secret, with the sandbox switch). 132 A
 * secret left empty keeps the one saved for the same gateway. The keys are
 * checked with the provider by a call that changes nothing, then kept
 * encrypted (lib/payments/owner-keys.ts reads them).
 */
export async function savePaymentKeysAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({ courses: true, campaigns: true, ownMoney: true, store: true }, "billing");
  const { app } = context;
  const provider = str(formData, "provider") || "iyzico";
  const sandbox = formData.get("sandbox") === "on";
  const values = { provider, merchantId: str(formData, "merchantId"), clientId: str(formData, "clientId"), publishableKey: str(formData, "publishableKey"), applePayMerchantId: str(formData, "applePayMerchantId"), sandbox: sandbox ? "on" : "" };
  if (!isPaymentProvider(provider)) return { errors: { provider: "Choose your payment provider." }, values };
  const saved = ownPaymentInput(app, encryptionKey());
  const read = readOwnKeys(provider, (name) => String(formData.get(name) ?? ""), sandbox, saved);
  if (!read.ok) return { errors: read.errors, values };
  const name = PROVIDER_NAME[provider];
  const accepted = await checkAccount(accountOf(read.input), { urls: paymentApiUrls() });
  if (accepted === false) {
    return {
      errors: { [provider === "stripe" ? "secretKey" : provider === "paypal" ? "clientId" : "apiKey"]: `${name} didn't accept these keys. Check them, and that they're your ${read.input.sandbox ? "test" : "live"} keys.` },
      values,
    };
  }
  const now = new Date();
  const before = catalogSettings(app).payment;
  const payment = encryptOwnPayment(app.id, read.input, encryptionKey());
  // 132.33 The same gateway's last webhook stays known (the page says whether it works).
  const receipt = isOwnPayment(before) && before.provider === provider ? webhookReceipt(before) : null;
  // 155 Stripe: the payment page's domain registered for Apple Pay and Google Pay with these keys (never stops the save).
  const store = await getStore();
  const urls = paymentApiUrls();
  const domain = read.input.provider === "stripe" ? walletDomain(appUrl(), Boolean(urls.stripe)) : null;
  const wallets = read.input.provider === "stripe" && domain ? await checkWalletDomain(read.input, domain, { baseUrl: urls.stripe, now }) : null;
  const kept = { ...payment, ...(receipt ? { webhook: receipt } : {}), ...(wallets ? { wallets } : {}) } as OwnPayment;
  await store.updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: kept } }, now);
  if (wallets) await noteWalletProblem(store, app, wallets, now);
  await recordStaffChange(context, `Saved the shop's own ${name} keys (${read.input.sandbox ? "test" : "live"})`);
  refresh();
  return {
    ok: true,
    message: accepted ? `${name} keys saved. Your app can take payments.` : `Keys saved. We couldn't reach ${name} to check them; try a test order.`,
  };
}

/**
 * 132.34 "Test connection": the gateway's lightest calls with the keys typed
 * (empty fields: the saved ones), nothing saved and nothing charged; its
 * checks come back one by one (lib/payments/connection.ts). Ten tests every
 * ten minutes per account.
 */
export async function testPaymentKeysAction(_: PaymentTestState, formData: FormData): Promise<PaymentTestState> {
  const context = await requireCatalogApp({ courses: true, campaigns: true, ownMoney: true, store: true }, "billing");
  const { app } = context;
  const provider = str(formData, "provider") || "iyzico";
  if (!isPaymentProvider(provider)) return { ok: false, message: "Choose your payment provider." };
  const store = await getStore();
  const limited = await hitRateLimit(store, RATE_LIMITS.gatewayTest, context.client.id);
  if (!limited.allowed) return { ok: false, message: `Too many tests. Try again in ${Math.ceil(limited.retryAfter / 60)} minutes.` };
  const now = new Date();
  const sandbox = formData.get("sandbox") === "on";
  const saved = ownPaymentInput(app, encryptionKey());
  const read = readOwnKeys(provider, (name) => String(formData.get(name) ?? ""), sandbox, saved, { lenient: true });
  if (!read.ok) return { ok: false, report: missingKeysReport(provider, now, sandbox) };
  const payment = catalogSettings(app).payment;
  const urls = paymentApiUrls();
  const { wallets, ...report } = await testConnection(
    {
      input: read.input,
      currency: str(formData, "currency") || catalogSettings(app).currency,
      stripeWebhookUrl: stripeWebhookUrl(appUrl(), app.id),
      receipt: isOwnPayment(payment) && payment.provider === provider ? webhookReceipt(payment) : null,
      testPayment: formData.get("testPayment") === "on",
      // 155 Stripe: the payment page's domain registered for Apple Pay and Google Pay with the keys tested.
      walletDomain: read.input.provider === "stripe" ? walletDomain(appUrl(), Boolean(urls.stripe)) : null,
      now,
    },
    { urls },
  );
  // 134 A pass on the saved keys themselves is what paying inside the app needs (new keys need a new test).
  const tested = report.ok ? testedOnSaved(app, read.input, saved, now) : null;
  // 132.120 Kept for the Payments page's summary: which gateway, when, whether it all worked (nothing of the keys).
  const fresh = (await store.getAppById(app.id)) ?? app;
  const freshPayment = catalogSettings(fresh).payment;
  // 155 What Stripe said of the domain is kept when the keys tested are the saved ones.
  const keepWallets = wallets && isOwnPayment(freshPayment) && freshPayment.provider === "stripe" && saved?.provider === "stripe" && read.input.provider === "stripe" && read.input.secretKey === saved.secretKey && read.input.sandbox === saved.sandbox;
  await store.updateApp(
    app.id,
    {
      catalogSettings: {
        ...catalogSettings(fresh),
        ...(keepWallets ? { payment: { ...freshPayment, wallets } } : {}),
        gatewayTest: { provider, at: report.at, ok: report.ok, mode: report.mode },
        ...(tested ? { gatewayTested: tested } : {}),
      },
    },
    now,
  );
  if (wallets && keepWallets) await noteWalletProblem(store, app, wallets, now);
  refresh();
  return { ok: report.ok, report };
}

export async function removePaymentKeysAction(): Promise<void> {
  const context = await requireCatalogApp({ courses: true, campaigns: true, ownMoney: true, store: true }, "billing");
  const { app } = context;
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: null } }, new Date());
  await recordStaffChange(context, "Turned off the shop's card payments");
  refresh();
}

// Orders

/** Completed or cancelled (orders/page.tsx), 96.2 or paid by bank transfer or the owner's own method (orders/awaiting.tsx); a restaurant's order moves with the kitchen's steps (moveOrderAction). */
export async function setOrderStatusAction(formData: FormData): Promise<void> {
  const context = await requireCatalogApp({ courses: true }, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const now = new Date();
  if (!order || inKitchen(order)) return refresh();
  const deps = { store, app, now, key: encryptionKey(), urls: paymentApiUrls(), account: serviceAccountOf(app, encryptionKey()), guestMail: guestMailer(store) };
  let moved: boolean;
  if (status === "cancelled") {
    // 175 A paid order is cancelled only with the owner's choice (the confirmation's two buttons): refunded, or not.
    const refund = readRefundChoice(formData.get("refund"));
    if (cancelNeedsChoice(order) && refund === null) return refresh();
    moved = (await cancelOrder(deps, await stageRefundDepsOf(context, app), order, refund ?? false)).moved;
  } else moved = await changeOrderStatus(deps, order, status);
  // 60 Who moved it, on the Team page.
  if (moved) await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), orderId: order.id, to: awaitingManualPayment(order) && status === "processing" ? "paid" : status }, now);
  refresh();
}

/** 175 A guest customer's order emails, in the app's name. */
function guestMailer(store: Awaited<ReturnType<typeof getStore>>): GuestMailer {
  return (mailApp, to, mail) => sendAppMail(store, mailApp, { to, ...mail });
}

/**
 * 80.4 Shipping on the Orders page: the carrier (any) and at least one of the
 * tracking link, the tracking number and the waybill; the customer is told
 * (their inbox, a push, an email).
 */
/** 91.3 The shop's answer to a return the customer asked for in the app (orders/page.tsx). */
export async function decideReturnAction(formData: FormData): Promise<void> {
  const context = await requireCatalogApp({}, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const decision = formData.get("decision") === "approved" ? "approved" : "declined";
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const now = new Date();
  if (order && (await decideReturn({ store, key: encryptionKey(), now }, app, order, decision, formData.get("reply")))) {
    await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), orderId: order.id, to: `return_${decision}` }, now);
  }
  refresh();
}

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
 * 132 The Orders page's Delivery: a store order's next stage (shipped with
 * the courier, postponed with why and the new day, a failed attempt with
 * why and what's next, returned, delivered), kept with who made it; the
 * customer is told at shipped, postponed, failed and delivered.
 */
export async function setOrderStageAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCatalogApp({}, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  const raw = Object.fromEntries(["stage", "reason", "note", "courier_name", "courier_phone", "tracking_url", "date", "slot_id", "next_step"].map((name) => [name, str(formData, name)]));
  const values = raw;
  if (!order) return { ok: false, message: "Not found.", values };
  const parsed = parseStageInput(raw);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const now = new Date();
  const user = actorOf(context);
  const done = await setOrderStage(
    { store, app, now, key: encryptionKey(), urls: paymentApiUrls(), account: serviceAccountOf(app, encryptionKey()), guestMail: guestMailer(store) },
    order,
    parsed.input,
    { userId: user.id, name: user.name?.trim() || user.email, via: "dashboard" },
    await stageRefundDepsOf(context, app),
  );
  if (!done.ok) return done.errors ? { errors: done.errors, values } : { ok: false, message: done.message, values };
  await recordOrderStatus(store, { clientId: context.client.id, appId: app.id, actor: user, orderId: order.id, to: parsed.input.stage }, now);
  refresh();
  const told = ["shipped", "postponed", "failed", "delivered"].includes(parsed.input.stage);
  return { ok: true, message: told ? "Saved. The customer was told." : "Saved." };
}

/** 132 What giving the money back after a failed delivery needs, from the dashboard. */
async function stageRefundDepsOf(context: ClientContext, app: App): Promise<StageRefundDeps> {
  const who = actorOf(context);
  return {
    store: await getStore(),
    key: encryptionKey(),
    urls: paymentApiUrls(),
    now: new Date(),
    ip: ipFromHeaders(await headers()),
    actor: { id: who.id, email: who.email },
    mail: (key, to, values, mailApp) => sendTemplate(key, to, values, { app: mailApp }),
    app,
    account: serviceAccountOf(app, encryptionKey()),
    baseUrl: appUrl(),
  };
}

/** 132 "I refunded it": the owner paid back an order cancelled after a failed delivery themselves. */
export async function markStageRefundedAction(formData: FormData): Promise<void> {
  const context = await requireCatalogApp({}, "orders");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  if (order) {
    const user = actorOf(context);
    const done = await markStageRefunded(await stageRefundDepsOf(context, app), order, user.name?.trim() || user.email);
    if (done.ok && order.stageRefund) await recordRefund(store, { clientId: context.client.id, appId: app.id, actor: user, kind: "order", id: order.id, amount: formatCents(order.stageRefund.cents, order.currency) }, new Date());
  }
  refresh();
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
