"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { CATALOG_CURRENCIES, parsePrice } from "@/lib/catalog/money";
import { parseSubMerchantForm } from "@/lib/catalog/marketplace";
import { approvePayout } from "@/lib/catalog/payment";
import { accountForOrder, catalogSettings, encryptPaymentKeys, marketplaceTerms } from "@/lib/catalog/settings";
import { newId } from "@/lib/crypto/tokens";
import { imageType } from "@/lib/images";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency, CatalogOrderStatus, CatalogProductInput } from "@/lib/data/types";
import { encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { checkIyzicoKeys, createSubMerchant, IyzicoError } from "@/lib/payments/iyzico";

const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGES_MAX = 6;

/**
 * An active client whose app sells from the dashboard (products, or with
 * `courses` also paid courses: card payments and orders), or a redirect.
 */
async function requireCatalogApp(options: { courses?: boolean } = {}): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const kind = context.app?.connector?.kind;
  if (!context.app || !(kind === "catalog" || (options.courses && kind === "courses"))) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function refresh() {
  revalidatePath("/dashboard/catalog", "layout");
  revalidatePath("/dashboard/courses", "layout");
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

export async function savePaymentKeysAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp({ courses: true });
  const apiKey = str(formData, "apiKey");
  const secretKey = str(formData, "secretKey");
  const sandbox = formData.get("sandbox") === "on";
  const errors: Record<string, string> = {};
  if (!apiKey || apiKey.length > 200) errors.apiKey = "Paste your iyzico API key.";
  if (!secretKey || secretKey.length > 200) errors.secretKey = "Paste your iyzico secret key.";
  if (Object.keys(errors).length > 0) return { errors, values: { apiKey: "", sandbox: sandbox ? "on" : "" } };
  const accepted = await checkIyzicoKeys({ apiKey, secretKey, sandbox }, { baseUrl: iyzicoApiUrl() });
  if (accepted === false) {
    return {
      errors: { apiKey: `iyzico didn't accept these keys. Check them, and that they're your ${sandbox ? "sandbox" : "live"} keys.` },
      values: { sandbox: sandbox ? "on" : "" },
    };
  }
  const now = new Date();
  await (await getStore()).updateApp(
    app.id,
    { catalogSettings: { ...catalogSettings(app), payment: encryptPaymentKeys(app.id, apiKey, secretKey, sandbox, encryptionKey()) } },
    now,
  );
  refresh();
  return {
    ok: true,
    message: accepted ? "iyzico keys saved. Your app can take payments." : "Keys saved. We couldn't reach iyzico to check them; try a test order.",
  };
}

const SUB_MERCHANT_FIELDS = ["type", "payeeName", "contactName", "email", "phone", "address", "iban", "identityNumber", "taxOffice", "legalCompanyTitle", "taxNumber"];

/** The shop sells through Yallapp's account: iyzico registers it as a sub-merchant that gets each sale minus the commission. */
export async function joinMarketplaceAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCatalogApp({ courses: true });
  const values: Record<string, string> = {};
  for (const name of SUB_MERCHANT_FIELDS) values[name] = str(formData, name);
  const store = await getStore();
  const terms = await marketplaceTerms(store, encryptionKey());
  if (!terms) return { message: "Selling through Yallapp isn't available right now. Add your own iyzico keys instead.", values };
  const parsed = parseSubMerchantForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  let subMerchantKey: string;
  try {
    subMerchantKey = await createSubMerchant(
      terms.keys,
      { ...parsed.details, conversationId: `shop-${app.id}`, subMerchantExternalId: app.id, currency: catalogSettings(app).currency },
      { baseUrl: iyzicoApiUrl() },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return { message: `iyzico didn't accept these details: ${e.message}`, values };
    throw e;
  }
  const now = new Date();
  await store.updateApp(
    app.id,
    {
      catalogSettings: {
        ...catalogSettings(app),
        payment: {
          provider: "yallapp",
          subMerchantKey,
          subMerchantType: parsed.details.subMerchantType,
          payeeName: parsed.details.name,
          ibanLast4: parsed.details.iban.slice(-4),
          sandbox: terms.keys.sandbox,
          joinedAt: now.toISOString(),
        },
      },
    },
    now,
  );
  refresh();
  return { ok: true, message: `Done. Your app takes payments now; iyzico pays your share to the IBAN ending ${parsed.details.iban.slice(-4)}.` };
}

export async function removePaymentKeysAction(): Promise<void> {
  const { app } = await requireCatalogApp({ courses: true });
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), payment: null } }, new Date());
  refresh();
}

// Orders

const NEXT_STATUSES: Partial<Record<CatalogOrderStatus, CatalogOrderStatus[]>> = {
  processing: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: ["refunded"],
};

export async function setOrderStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireCatalogApp({ courses: true });
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as CatalogOrderStatus;
  const order = Number.isSafeInteger(id) ? await store.getCatalogOrder(app.id, id) : null;
  if (order && NEXT_STATUSES[order.status]?.includes(status)) {
    const now = new Date();
    await store.updateCatalogOrder(app.id, order.id, { status, updatedAt: now });
    // A completed marketplace order releases the shop's share; our team can also do it from the admin.
    if (status === "completed" && order.commissionCents !== null && !order.payoutApprovedAt) {
      const account = await accountForOrder(store, app, order, encryptionKey());
      if (account) await approvePayout({ store, app, account, baseUrl: iyzicoApiUrl(), now, order });
    }
  }
  refresh();
}
