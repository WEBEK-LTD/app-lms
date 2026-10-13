"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkApi, type ApiCheckResult } from "@/lib/app/api-check";
import { APP_TYPE_NAMES, isAppType, isSetupComplete, newApp, queueBuild, type SetupStep } from "@/lib/app/setup";
import { startPipeline } from "@/lib/builds/dispatch";
import { assetUrl, ICON_MAX_BYTES, LOGO_MAX_BYTES } from "@/lib/assets";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { AppPatch } from "@/lib/data/store";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, DEFAULT_COURSE_SETUP, type App, type AssetKind, type ConnectorConfig } from "@/lib/data/types";
import { encryptionKey, superAdminEmails } from "@/lib/env";
import { shopifyConnectorConfig, shopifyToken } from "@/lib/hosted/connectors";
import { ShopifyConnector } from "@/lib/hosted/connectors/shopify";
import { sendMail } from "@/lib/mail";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { isSvg, readPngInfo } from "@/lib/png";
import {
  checkGoogleServiceInfoPlist,
  checkGoogleServicesJson,
  checkScreenshot,
  FIREBASE_MAX_BYTES,
  SCREENSHOT_LIMITS,
  SCREENSHOT_MAX_BYTES,
  type ScreenshotKind,
} from "@/lib/store-files";
import { bumpPatch } from "@/lib/semver";
import { appStoreKeySchema, brandingSchema, googlePlayKeySchema, listingSchema, startBuildSchema, websiteSchema } from "@/lib/validation";

/** Active client with an app, or a redirect. Expired plans can still edit their setup but not build. */
async function requireActiveClient(): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await requireActiveClient();
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

const STEP_ORDER: SetupStep[] = ["website", "branding", "listing", "publishing"];

function stepUrl(step: SetupStep): string {
  return `/dashboard/setup?step=${step}`;
}

/** After a step is saved: go to the next step, or queue the first build when setup is complete. */
async function afterStep(context: ClientContext & { app: App }, step: SetupStep): Promise<never> {
  const store = await getStore();
  const app = (await store.getAppById(context.app.id))!;
  const plan = context.license?.plan ?? null;
  revalidatePath("/dashboard", "layout");
  if (isSetupComplete(app, plan)) {
    const builds = await store.listBuildsByClient(context.client.id, 1);
    if (builds.length === 0) {
      const result = await queueBuild(
        store,
        { client: context.client, app, license: context.license, versionName: "1.0.0" },
        new Date(),
        assetUrl,
      );
      if (result.ok) {
        await startPipeline();
        redirect("/dashboard/builds?started=1");
      }
    }
    if (step === "publishing") redirect("/dashboard/builds");
  }
  const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
  redirect(next ? stepUrl(next) : "/dashboard/setup");
}

export async function chooseAppTypeAction(formData: FormData): Promise<void> {
  const context = await requireActiveClient();
  const appType = formData.get("appType");
  if (!isAppType(appType)) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  if (!context.app) {
    await store.createApp(newApp(context.client.id, context.client.siteUrl, now, appType));
  } else if (context.app.appType !== appType) {
    // The next build includes the new module. Content made for the old type (a shop, bookings) needs the Website step again.
    const kind = context.app.connector?.kind;
    const fits = !kind || (kind === "bookings" ? appType === "booking" : kind === "courses" ? appType === "lms" : appType === "store");
    await store.updateApp(
      context.app.id,
      fits ? { appType, appTypeDoneAt: now } : { appType, appTypeDoneAt: now, backend: "wordpress", connector: null, websiteDoneAt: null },
      now,
    );
  }
  redirect(stepUrl("website"));
}

export async function saveWebsiteAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = websiteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const now = new Date();
  const data = parsed.data;
  if (data.backend === "catalog" && context.app.appType === "lms") {
    await store.updateApp(
      context.app.id,
      {
        siteUrl: null,
        backend: "hosted",
        connector: { kind: "courses" },
        courseSetup: context.app.courseSetup ?? DEFAULT_COURSE_SETUP,
        catalogSettings: context.app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS,
        websiteDoneAt: now,
      },
      now,
    );
    revalidatePath("/dashboard", "layout");
    return afterStep(context, "website");
  }
  if (data.backend === "catalog" && context.app.appType === "booking") {
    await store.updateApp(
      context.app.id,
      {
        siteUrl: null,
        backend: "hosted",
        connector: { kind: "bookings" },
        bookingSetup: context.app.bookingSetup ?? DEFAULT_BOOKING_SETUP,
        websiteDoneAt: now,
      },
      now,
    );
    revalidatePath("/dashboard", "layout");
    return afterStep(context, "website");
  }
  if (data.backend === "catalog") {
    if (context.app.appType !== "store") {
      return { errors: { backend: "Choose your app type first." }, values };
    }
    await store.updateApp(
      context.app.id,
      {
        siteUrl: null,
        backend: "hosted",
        connector: { kind: "catalog" },
        catalogSettings: context.app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS,
        websiteDoneAt: now,
      },
      now,
    );
    revalidatePath("/dashboard", "layout");
    return afterStep(context, "website");
  }
  if (data.backend === "shopify") {
    const result = await connectShopify(context.app, data);
    if ("errors" in result) return { errors: result.errors, values: formValues(formData, ["storefrontToken"]) };
    await store.updateApp(
      context.app.id,
      { siteUrl: data.siteUrl, backend: "hosted", connector: result.connector, websiteDoneAt: now },
      now,
    );
    return afterStep(context, "website");
  }
  const patch: AppPatch = { siteUrl: data.siteUrl, backend: data.backend, connector: null, websiteDoneAt: now };
  if (data.backend === "custom_api") patch.apiBaseUrl = data.apiBaseUrl.replace(/\/+$/, "");
  if (data.backend === "setup_requested") {
    patch.setupNote = data.setupNote || null;
    if (context.app.backend !== "setup_requested") {
      patch.setupRequestedAt = now;
      await notifySetupRequest(context, data.siteUrl, data.setupNote);
    }
  }
  await store.updateApp(context.app.id, patch, now);
  if (data.backend === "setup_requested") {
    revalidatePath("/dashboard", "layout");
    return { message: "Thanks! Our team will message you on WhatsApp to set up your WordPress site." };
  }
  return afterStep(context, "website");
}

/**
 * Checks the shop with its Storefront access token (or the one saved before
 * for the same shop) and returns the connector to save.
 */
async function connectShopify(
  app: App,
  data: { shopDomain: string; storefrontToken: string },
): Promise<{ connector: ConnectorConfig } | { errors: Record<string, string> }> {
  if (app.appType !== "store") return { errors: { backend: "Shopify works with Store apps. Choose Store as your app type first." } };
  const key = encryptionKey();
  const saved = app.connector?.kind === "shopify" && app.connector.shopDomain === data.shopDomain ? shopifyToken(app, key) : null;
  const token = data.storefrontToken || saved;
  if (!token) return { errors: { storefrontToken: "Paste your Storefront API access token." } };
  try {
    await new ShopifyConnector({ shopDomain: data.shopDomain, storefrontToken: token }).check();
  } catch {
    return {
      errors: {
        storefrontToken: "Shopify didn't accept this shop address and token. Check both, and that the token has the Storefront API permissions.",
      },
    };
  }
  return { connector: shopifyConnectorConfig(app.id, data.shopDomain, token, key) };
}

/** Tells the team a client wants their WordPress site set up for them. */
async function notifySetupRequest(context: ClientContext, siteUrl: string, note: string): Promise<void> {
  const admins = superAdminEmails();
  const text = [
    `${context.user.name} asked us to set up WordPress for their app.`,
    `Website: ${siteUrl}`,
    `WhatsApp: ${context.client.whatsapp}`,
    `Email: ${context.user.email}`,
    `App type: ${APP_TYPE_NAMES[context.app?.appType ?? "lms"]}`,
    note ? `Note: ${note}` : "",
    "",
    "Requests are listed on the super admin Clients page.",
  ]
    .filter((line, i, all) => line !== "" || i === all.length - 2)
    .join("\n");
  await Promise.all(admins.map((to) => sendMail({ to, subject: "WordPress set-up request", text })));
}

export interface ApiCheckState {
  result: ApiCheckResult | null;
  error?: string;
}

/** Runs the API check against the address in the Website form, without saving it. */
export async function checkApiAction(_: ApiCheckState, formData: FormData): Promise<ApiCheckState> {
  const context = await requireApp();
  const limited = await hitRateLimit(await getStore(), RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { result: null, error: "Too many checks. Try again in a few minutes." };
  const address = String(formData.get("apiBaseUrl") ?? "").trim();
  if (!address) return { result: null, error: "Enter your API's address first." };
  return { result: await checkApi(address, context.app.appType) };
}

export async function saveBrandingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = brandingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  // Uploaded files must belong to this client.
  for (const [field, id, kind] of [
    ["iconAssetId", parsed.data.iconAssetId, "icon"],
    ["logoAssetId", parsed.data.logoAssetId, "logo"],
  ] as const) {
    if (!id) continue;
    const asset = await store.getAsset(id);
    if (!asset || asset.clientId !== context.client.id || asset.kind !== kind) {
      return { errors: { [field]: "Upload the file again." }, values };
    }
  }
  const now = new Date();
  await store.updateApp(
    context.app.id,
    {
      appName: parsed.data.appName,
      shortName: parsed.data.shortName,
      primaryColor: parsed.data.primaryColor.toUpperCase(),
      splashColor: parsed.data.splashColor.toUpperCase(),
      template: parsed.data.template,
      font: parsed.data.font,
      iconAssetId: parsed.data.iconAssetId,
      logoAssetId: parsed.data.logoAssetId,
      brandingDoneAt: now,
    },
    now,
  );
  return afterStep(context, "branding");
}

export async function saveListingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const screenshots = await readScreenshotIds(formData, context.client.id);
  if (!screenshots.ok) return { errors: screenshots.errors, values };
  const now = new Date();
  const patch: AppPatch = { ...parsed.data, ...screenshots.patch, listingDoneAt: now };
  // A Firebase file is made for one package name or bundle ID.
  if (parsed.data.androidPackage !== context.app.androidPackage) patch.firebaseAndroidAssetId = null;
  if (parsed.data.iosBundleId !== context.app.iosBundleId) patch.firebaseIosAssetId = null;
  await store.updateApp(context.app.id, patch, now);
  return afterStep(context, "listing");
}

const SCREENSHOT_ASSET: Record<ScreenshotKind, { kind: AssetKind; field: "playScreenshotIds" | "iosScreenshotIds"; store: string }> = {
  phone: { kind: "play_screenshot", field: "playScreenshotIds", store: "Google Play" },
  iphone: { kind: "ios_screenshot", field: "iosScreenshotIds", store: "the App Store" },
};

/** The screenshots kept in the form, in order. Each must be this client's upload of the right kind. */
async function readScreenshotIds(
  formData: FormData,
  clientId: string,
): Promise<{ ok: true; patch: Pick<AppPatch, "phoneScreenshotIds" | "iphoneScreenshotIds"> } | { ok: false; errors: Record<string, string> }> {
  const store = await getStore();
  const errors: Record<string, string> = {};
  const lists: Record<ScreenshotKind, string[]> = { phone: [], iphone: [] };
  for (const kind of ["phone", "iphone"] as const) {
    const { kind: assetKind, field, store: storeName } = SCREENSHOT_ASSET[kind];
    const ids = [...new Set(formData.getAll(field).map(String).filter(Boolean))];
    const { min, max } = SCREENSHOT_LIMITS[kind];
    if (ids.length > max) errors[field] = `${storeName} takes up to ${max} screenshots.`;
    else if (ids.length > 0 && ids.length < min) errors[field] = `${storeName} needs at least ${min} screenshots.`;
    for (const id of ids) {
      const asset = await store.getAsset(id);
      if (!asset || asset.clientId !== clientId || asset.kind !== assetKind) {
        errors[field] = "A screenshot couldn't be found. Upload it again.";
        break;
      }
    }
    lists[kind] = ids;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, patch: { phoneScreenshotIds: lists.phone, iphoneScreenshotIds: lists.iphone } };
}

async function saveAsset(clientId: string, kind: AssetKind, data: Buffer, contentType: string, extension: string): Promise<string> {
  const id = newId();
  const blobKey = `assets/${clientId}/${id}.${extension}`;
  await getBlobStore().put(blobKey, data, contentType);
  const store = await getStore();
  await store.createAsset({ id, clientId, kind, blobKey, contentType, size: data.length, createdAt: new Date() });
  return id;
}

/** Firebase config files for push notifications. Optional, on every plan. */
async function readFirebaseFiles(formData: FormData, app: App, clientId: string): Promise<{ patch: AppPatch; errors: Record<string, string> }> {
  const patch: AppPatch = {};
  const errors: Record<string, string> = {};
  const android = await fileText(formData.get("firebaseAndroidFile"), FIREBASE_MAX_BYTES);
  if (android !== null) {
    const error = android === "" ? "This file is too large for google-services.json." : checkGoogleServicesJson(android, app.androidPackage ?? "");
    if (error) errors.firebaseAndroidFile = error;
    else patch.firebaseAndroidAssetId = await saveAsset(clientId, "firebase_android", Buffer.from(android), "application/json", "json");
  }
  const ios = await fileText(formData.get("firebaseIosFile"), FIREBASE_MAX_BYTES);
  if (ios !== null) {
    const error = ios === "" ? "This file is too large for GoogleService-Info.plist." : checkGoogleServiceInfoPlist(ios, app.iosBundleId ?? "");
    if (error) errors.firebaseIosFile = error;
    else patch.firebaseIosAssetId = await saveAsset(clientId, "firebase_ios", Buffer.from(ios), "application/xml", "plist");
  }
  return { patch, errors };
}

async function fileText(value: FormDataEntryValue | null, maxBytes: number): Promise<string | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > maxBytes) return "";
  return (await value.text()).trim();
}

/**
 * Reads the App Store Connect key fields. Empty fields keep what was saved
 * before; nothing is returned when none were filled in.
 */
async function readAppStoreKey(
  formData: FormData,
  app: App,
  key: Buffer,
): Promise<{ patch: AppPatch; errors: Record<string, string>; values: Record<string, string> }> {
  const issuerId = String(formData.get("ascIssuerId") ?? "").trim();
  const keyId = String(formData.get("ascKeyId") ?? "").trim().toUpperCase();
  const p8 = await fileText(formData.get("ascPrivateKeyFile"), 10_000);
  const values = { ascIssuerId: issuerId, ascKeyId: keyId };
  const errors: Record<string, string> = {};
  const patch: AppPatch = {};
  if (!issuerId && !keyId && p8 === null) return { patch, errors, values };
  // Without a new file, the saved key stays and only the IDs are checked.
  const schema = p8 === null && app.ascPrivateKeyEncrypted ? appStoreKeySchema.omit({ privateKey: true }) : appStoreKeySchema;
  const parsed = schema.safeParse({
    issuerId: issuerId || app.ascIssuerId || "",
    keyId: keyId || app.ascKeyId || "",
    privateKey: p8 ?? "",
  });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    if (fields.issuerId) errors.ascIssuerId = fields.issuerId;
    if (fields.keyId) errors.ascKeyId = fields.keyId;
    if (fields.privateKey) errors.ascPrivateKeyFile = p8 === null ? "Upload your .p8 key file." : fields.privateKey;
  } else {
    patch.ascIssuerId = parsed.data.issuerId.toLowerCase();
    patch.ascKeyId = parsed.data.keyId;
    if (p8 !== null) patch.ascPrivateKeyEncrypted = encrypt(p8, key, keyContext.appStore(app.id));
  }
  return { patch, errors, values };
}

/**
 * Pro: stores the Google Play service account JSON and the App Store Connect
 * key, encrypted, and needs at least one of them. Starter: the App Store
 * Connect key is optional and only signs the iOS app (they publish
 * themselves with the guides); the Google Play key is Pro only. Fields left
 * empty keep what was saved before.
 */
export async function savePublishingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const store = await getStore();
  const now = new Date();
  const app = context.app;
  const key = encryptionKey();
  const appStore = await readAppStoreKey(formData, app, key);
  const firebase = await readFirebaseFiles(formData, app, context.client.id);
  const errors: Record<string, string> = { ...appStore.errors, ...firebase.errors };
  const patch: AppPatch = { ...appStore.patch, ...firebase.patch };
  const values = appStore.values;

  if (context.license?.plan !== "pro") {
    if (Object.keys(errors).length > 0) return { errors, values };
    await store.updateApp(app.id, { ...patch, publishingDoneAt: now }, now);
    return afterStep(context, "publishing");
  }

  const playJson = (await fileText(formData.get("googlePlayFile"), 20_000)) ?? null;
  if (playJson !== null) {
    const parsed = googlePlayKeySchema.safeParse(playJson);
    if (!parsed.success) errors.googlePlayFile = parsed.error.issues[0]?.message ?? "This file can't be used.";
    else {
      patch.googlePlayKeyEncrypted = encrypt(parsed.data.json, key, keyContext.googlePlay(app.id));
      patch.googlePlayClientEmail = parsed.data.clientEmail;
    }
  }

  if (Object.keys(errors).length > 0) return { errors, values };
  const hasPlay = Boolean(patch.googlePlayKeyEncrypted ?? app.googlePlayKeyEncrypted);
  const hasAppStore = Boolean((patch.ascPrivateKeyEncrypted ?? app.ascPrivateKeyEncrypted) && (patch.ascKeyId ?? app.ascKeyId));
  if (!hasPlay && !hasAppStore) {
    return { message: "Add your Google Play key, your App Store Connect key, or both.", values };
  }
  await store.updateApp(app.id, { ...patch, publishingDoneAt: now }, now);
  return afterStep(context, "publishing");
}

export async function removeStoreKeyAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const store = await getStore();
  const now = new Date();
  if (formData.get("store") === "google-play") {
    await store.updateApp(context.app.id, { googlePlayKeyEncrypted: null, googlePlayClientEmail: null }, now);
  } else if (formData.get("store") === "app-store") {
    await store.updateApp(context.app.id, { ascPrivateKeyEncrypted: null, ascIssuerId: null, ascKeyId: null }, now);
  } else if (formData.get("store") === "firebase-android") {
    await store.updateApp(context.app.id, { firebaseAndroidAssetId: null }, now);
  } else if (formData.get("store") === "firebase-ios") {
    await store.updateApp(context.app.id, { firebaseIosAssetId: null }, now);
  }
  revalidatePath("/dashboard", "layout");
  redirect(stepUrl("publishing"));
}

export interface UploadResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

/**
 * Uploads an app icon (PNG, 1024 × 1024, no transparency), a logo (PNG or SVG)
 * or a store screenshot (PNG or JPEG, sizes the store accepts).
 */
export async function uploadAssetAction(formData: FormData): Promise<UploadResult> {
  const context = await requireActiveClient();
  const kind = formData.get("kind") as AssetKind | null;
  const file = formData.get("file");
  if (!kind || !["icon", "logo", "play_screenshot", "ios_screenshot"].includes(kind) || !file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (kind === "play_screenshot" || kind === "ios_screenshot") {
    if (file.size > SCREENSHOT_MAX_BYTES) return { ok: false, error: `The file is too large. The limit is ${SCREENSHOT_MAX_BYTES / 1024 / 1024} MB.` };
    const data = Buffer.from(await file.arrayBuffer());
    const checked = checkScreenshot(data, kind === "play_screenshot" ? "phone" : "iphone");
    if (!checked.ok) return { ok: false, error: checked.error };
    const id = await saveAsset(context.client.id, kind, data, checked.contentType, checked.contentType === "image/png" ? "png" : "jpg");
    return { ok: true, id, url: `/api/v1/assets/${id}` };
  }
  const max = kind === "icon" ? ICON_MAX_BYTES : LOGO_MAX_BYTES;
  if (file.size > max) return { ok: false, error: `The file is too large. The limit is ${max / 1024 / 1024} MB.` };
  const data = Buffer.from(await file.arrayBuffer());
  const png = readPngInfo(data);
  let contentType: string;
  if (kind === "icon") {
    if (!png) return { ok: false, error: "The icon must be a PNG file." };
    if (png.width !== 1024 || png.height !== 1024) return { ok: false, error: `The icon must be 1024 × 1024 pixels. This one is ${png.width} × ${png.height}.` };
    if (png.hasTransparency) return { ok: false, error: "The icon can't have transparency. Export it with a solid background." };
    contentType = "image/png";
  } else if (png) {
    contentType = "image/png";
  } else if (isSvg(data)) {
    contentType = "image/svg+xml";
  } else {
    return { ok: false, error: "The logo must be a PNG or SVG file." };
  }
  const id = await saveAsset(context.client.id, kind, data, contentType, contentType === "image/png" ? "png" : "svg");
  return { ok: true, id, url: `/api/v1/assets/${id}` };
}

export async function startBuildAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const values = formValues(formData);
  const parsed = startBuildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const result = await queueBuild(
    store,
    { client: context.client, app: context.app, license: context.license, versionName: parsed.data.versionName },
    new Date(),
    assetUrl,
  );
  if (!result.ok) {
    const messages = {
      setup_incomplete: "Finish every step of the app setup first.",
      license_inactive: "Your plan has ended. Message us on WhatsApp to renew it, then start a new build.",
      build_running: "A build is already in progress. You can start a new one when it finishes.",
      version_too_low: "Use the same or a higher app version than your last build.",
      invalid_config: "Some app details aren't valid. Check the app setup and try again.",
    } as const;
    return {
      message: messages[result.reason],
      errors: result.reason === "version_too_low" ? { versionName: messages.version_too_low } : undefined,
      values,
    };
  }
  await startPipeline();
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: `Build #${result.build.number} is queued.`, values: { versionName: bumpPatch(result.build.versionName) } };
}

/** Releases the license from its website so it can be activated on another one. */
export async function releaseSiteAction(): Promise<void> {
  const context = await requireActiveClient();
  if (context.license) {
    const store = await getStore();
    await store.deleteActivation(context.license.id);
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/license?released=1");
}
