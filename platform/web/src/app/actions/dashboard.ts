"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSetupComplete, newApp, queueBuild, type SetupStep } from "@/lib/app/setup";
import { assetUrl, ICON_MAX_BYTES, LOGO_MAX_BYTES } from "@/lib/assets";
import { getClientContext, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { AppPatch } from "@/lib/data/store";
import type { App, AssetKind } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { isSvg, readPngInfo } from "@/lib/png";
import { bumpPatch } from "@/lib/semver";
import { appStoreKeySchema, brandingSchema, googlePlayKeySchema, listingSchema, startBuildSchema, websiteSchema } from "@/lib/validation";

/** Active client with an app, or a redirect. Expired plans can still edit their setup but not build. */
async function requireActiveClient(): Promise<ClientContext> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (context.client.status !== "active") redirect("/pending");
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
      if (result.ok) redirect("/dashboard/builds?started=1");
    }
    if (step === "publishing") redirect("/dashboard/builds");
  }
  const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
  redirect(next ? stepUrl(next) : "/dashboard/setup");
}

export async function chooseAppTypeAction(formData: FormData): Promise<void> {
  const context = await requireActiveClient();
  if (formData.get("appType") !== "lms") redirect("/dashboard/app-type");
  if (!context.app) {
    const store = await getStore();
    await store.createApp(newApp(context.client.id, context.client.siteUrl, new Date()));
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
  await store.updateApp(context.app.id, { siteUrl: parsed.data.siteUrl, websiteDoneAt: now }, now);
  return afterStep(context, "website");
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
  const now = new Date();
  await store.updateApp(context.app.id, { ...parsed.data, listingDoneAt: now }, now);
  return afterStep(context, "listing");
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
  const parsed = appStoreKeySchema.safeParse({
    issuerId: issuerId || app.ascIssuerId || "",
    keyId: keyId || app.ascKeyId || "",
    privateKey: p8 ?? (app.ascPrivateKeyEncrypted ? "-----BEGIN PRIVATE KEY-----kept-----END PRIVATE KEY-----" : ""),
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
  const errors: Record<string, string> = { ...appStore.errors };
  const patch: AppPatch = { ...appStore.patch };
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

/** Uploads an app icon (PNG, 1024 × 1024, no transparency) or a logo (PNG or SVG). */
export async function uploadAssetAction(formData: FormData): Promise<UploadResult> {
  const context = await requireActiveClient();
  const kind = formData.get("kind") as AssetKind | null;
  const file = formData.get("file");
  if ((kind !== "icon" && kind !== "logo") || !file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
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
  const id = newId();
  const blobKey = `assets/${context.client.id}/${id}.${contentType === "image/png" ? "png" : "svg"}`;
  await getBlobStore().put(blobKey, data, contentType);
  const store = await getStore();
  await store.createAsset({ id, clientId: context.client.id, kind, blobKey, contentType, size: data.length, createdAt: new Date() });
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
