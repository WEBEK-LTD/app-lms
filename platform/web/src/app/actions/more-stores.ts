"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { managedPublishing } from "@/lib/app/setup";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getBlobStore } from "@/lib/blobs";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { AppPatch } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import {
  checkAgconnectServices,
  checkGalaxyContentId,
  checkGalaxyPrivateKey,
  checkGalaxyServiceAccountId,
  checkHuaweiAppId,
  checkHuaweiClientId,
  checkHuaweiSecret,
  checkXiaomiCertificate,
  checkXiaomiPassword,
  checkXiaomiReleaseNotes,
  checkXiaomiUserName,
} from "@/lib/publishing/more-stores";

/**
 * 35, 36, 42 The dashboard's "More Android stores" page: Samsung Galaxy Store,
 * Huawei AppGallery and Xiaomi GetApps. Upload keys are kept only on plans
 * with "We publish for you" (the pipeline uploads with them); Huawei push
 * (agconnect-services.json and the app secret) works on every plan, like
 * Firebase. Keys are encrypted and never shown again; fields left empty keep
 * what was saved.
 */

const PAGE = "/dashboard/publishing/more-stores";
const AGCONNECT_MAX_BYTES = 20_000;

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

/** Whether the app's plan uploads builds to the stores ("We publish for you"). */
async function uploadsAllowed(context: ClientContext): Promise<boolean> {
  const store = await getStore();
  return managedPublishing(context.license ? currentPlanId(context.license, new Date()) : null, await effectivePlans(store));
}

async function fileText(value: FormDataEntryValue | null, maxBytes: number): Promise<string | null> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > maxBytes) return "";
  return (await value.text()).trim();
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/** Samsung Galaxy Store: content ID, service account ID and its private key (pasted or as a file). */
export async function saveGalaxyStoreAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const app = context.app;
  const values = { galaxyContentId: field(formData, "galaxyContentId"), galaxyServiceAccountId: field(formData, "galaxyServiceAccountId") };
  if (!(await uploadsAllowed(context))) return { message: "Uploading to Galaxy Store is part of “We publish for you”. Upgrade the app's plan to use it.", values };
  const pasted = field(formData, "galaxyPrivateKey");
  const file = await fileText(formData.get("galaxyPrivateKeyFile"), 10_000);
  const keyText = pasted || file;
  const errors: Record<string, string> = {};
  const contentId = values.galaxyContentId || app.galaxyContentId || "";
  const accountId = values.galaxyServiceAccountId || app.galaxyServiceAccountId || "";
  const contentProblem = checkGalaxyContentId(contentId);
  if (contentProblem) errors.galaxyContentId = contentProblem;
  const accountProblem = checkGalaxyServiceAccountId(accountId);
  if (accountProblem) errors.galaxyServiceAccountId = accountProblem;
  const patch: AppPatch = { galaxyContentId: contentId, galaxyServiceAccountId: accountId };
  if (keyText === "") errors.galaxyPrivateKey = "This file is too large for a private key.";
  else if (keyText) {
    const key = checkGalaxyPrivateKey(keyText);
    if (!key.ok) errors.galaxyPrivateKey = key.error;
    else patch.galaxyKeyEncrypted = encrypt(key.value, encryptionKey(), keyContext.galaxyStore(app.id));
  } else if (!app.galaxyKeyEncrypted) errors.galaxyPrivateKey = "Paste the service account's private key, or upload its file.";
  if (Object.keys(errors).length) return { errors, values };
  const store = await getStore();
  await store.updateApp(app.id, patch, new Date());
  await recordStaffChange(context, "Saved the Galaxy Store keys", { galaxyContentId: app.galaxyContentId ?? null }, { galaxyContentId: contentId });
  revalidatePath(PAGE);
  return { ok: true, message: "Saved. Every new build is uploaded to Galaxy Store and sent for review." };
}

/**
 * Huawei AppGallery: the app ID, agconnect-services.json and the Push Kit app
 * secret (every plan), and the Connect API client for uploads ("We publish for
 * you"). The app ID can come from agconnect-services.json.
 */
export async function saveHuaweiAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const app = context.app;
  const values = { huaweiAppId: field(formData, "huaweiAppId"), huaweiClientId: field(formData, "huaweiClientId") };
  const errors: Record<string, string> = {};
  const patch: AppPatch = {};
  const key = encryptionKey();

  const agconnect = await fileText(formData.get("huaweiAgconnectFile"), AGCONNECT_MAX_BYTES);
  let fileAppId: string | null = null;
  let agconnectBody: string | null = null;
  if (agconnect === "") errors.huaweiAgconnectFile = "This file is too large for agconnect-services.json.";
  else if (agconnect !== null) {
    if (!app.androidPackage) errors.huaweiAgconnectFile = "Set your app's package name in App setup › Store listing first.";
    else {
      const checked = checkAgconnectServices(agconnect, app.androidPackage);
      if (!checked.ok) errors.huaweiAgconnectFile = checked.error;
      else {
        fileAppId = checked.value.appId;
        agconnectBody = agconnect;
      }
    }
  }
  const appId = values.huaweiAppId || fileAppId || app.huaweiAppId || "";
  if (appId) {
    const problem = checkHuaweiAppId(appId);
    if (problem) errors.huaweiAppId = problem;
    else if (fileAppId && fileAppId !== appId) errors.huaweiAgconnectFile = `This file is for the app ID ${fileAppId}, not ${appId}.`;
    else patch.huaweiAppId = appId;
  }

  const pushSecret = field(formData, "huaweiPushSecret");
  if (pushSecret) {
    const problem = checkHuaweiSecret(pushSecret, "push");
    if (problem) errors.huaweiPushSecret = problem;
    else patch.huaweiPushSecretEncrypted = encrypt(pushSecret, key, keyContext.huaweiPush(app.id));
  }

  const clientId = values.huaweiClientId;
  const clientSecret = field(formData, "huaweiClientSecret");
  if (clientId || clientSecret) {
    if (!(await uploadsAllowed(context))) {
      errors.huaweiClientId = "Uploading to AppGallery is part of “We publish for you”. Upgrade the app's plan to use it.";
    } else {
      const idProblem = checkHuaweiClientId(clientId || app.huaweiClientId || "");
      if (idProblem) errors.huaweiClientId = idProblem;
      else patch.huaweiClientId = clientId || app.huaweiClientId;
      if (clientSecret) {
        const problem = checkHuaweiSecret(clientSecret, "client");
        if (problem) errors.huaweiClientSecret = problem;
        else patch.huaweiClientSecretEncrypted = encrypt(clientSecret, key, keyContext.appGallery(app.id));
      } else if (!app.huaweiClientSecretEncrypted) errors.huaweiClientSecret = "Paste the API client's key too.";
    }
  }
  if ((patch.huaweiClientId || patch.huaweiPushSecretEncrypted) && !appId) errors.huaweiAppId = "Add the app ID, or upload agconnect-services.json.";
  if (Object.keys(errors).length) return { errors, values };
  if (agconnectBody !== null) patch.huaweiAgconnectAssetId = await saveAgconnect(context.client.id, agconnectBody);
  if (Object.keys(patch).length === 0) return { message: "Fill in at least one field.", values };

  const store = await getStore();
  await store.updateApp(app.id, patch, new Date());
  await recordStaffChange(context, "Saved the Huawei AppGallery settings", { huaweiAppId: app.huaweiAppId ?? null }, { huaweiAppId: patch.huaweiAppId ?? app.huaweiAppId ?? null });
  revalidatePath(PAGE);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: agconnectBody ? "Saved. Your next build includes Huawei push." : "Saved." };
}

/**
 * 42 Xiaomi GetApps: the developer account's email, the automatic publishing
 * API's private key (encrypted with its own context), Xiaomi's public
 * certificate (a file, checked as an X.509 RSA certificate) and what's new in
 * each update (optional: a short default otherwise).
 */
export async function saveXiaomiAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const app = context.app;
  const values = { xiaomiUserName: field(formData, "xiaomiUserName"), xiaomiReleaseNotes: field(formData, "xiaomiReleaseNotes") };
  if (!(await uploadsAllowed(context))) return { message: "Uploading to Xiaomi GetApps is part of “We publish for you”. Upgrade the app's plan to use it.", values };
  const errors: Record<string, string> = {};
  const userName = values.xiaomiUserName || app.xiaomiUserName || "";
  const nameProblem = checkXiaomiUserName(userName);
  if (nameProblem) errors.xiaomiUserName = nameProblem;
  const patch: AppPatch = { xiaomiUserName: userName, xiaomiReleaseNotes: values.xiaomiReleaseNotes || null };
  const notesProblem = checkXiaomiReleaseNotes(values.xiaomiReleaseNotes);
  if (notesProblem) errors.xiaomiReleaseNotes = notesProblem;

  const password = field(formData, "xiaomiPassword");
  if (password) {
    const problem = checkXiaomiPassword(password);
    if (problem) errors.xiaomiPassword = problem;
    else patch.xiaomiPasswordEncrypted = encrypt(password, encryptionKey(), keyContext.xiaomi(app.id));
  } else if (!app.xiaomiPasswordEncrypted) errors.xiaomiPassword = "Paste the private key from the automatic publishing page.";

  const file = formData.get("xiaomiCertificateFile");
  if (file && typeof file !== "string" && file.size > 0) {
    const checked = checkXiaomiCertificate(Buffer.from(await file.arrayBuffer()), new Date());
    if (!checked.ok) errors.xiaomiCertificateFile = checked.error;
    else patch.xiaomiCertificate = checked.value;
  } else if (!app.xiaomiCertificate) errors.xiaomiCertificateFile = "Upload Xiaomi's public certificate from the automatic publishing page.";

  if (Object.keys(errors).length) return { errors, values };
  const store = await getStore();
  await store.updateApp(app.id, patch, new Date());
  await recordStaffChange(context, "Saved the Xiaomi GetApps keys", { xiaomiUserName: app.xiaomiUserName ?? null }, { xiaomiUserName: userName });
  revalidatePath(PAGE);
  return { ok: true, message: "Saved. Every new build is uploaded to Xiaomi GetApps and sent for review." };
}

async function saveAgconnect(clientId: string, body: string): Promise<string> {
  const id = newId();
  const blobKey = `assets/${clientId}/${id}.json`;
  const data = Buffer.from(body);
  await getBlobStore().put(blobKey, data, "application/json");
  await (await getStore()).createAsset({ id, clientId, kind: "huawei_agconnect", blobKey, contentType: "application/json", size: data.length, createdAt: new Date() });
  return id;
}

const REMOVE: Record<string, { patch: AppPatch; label: string }> = {
  galaxy: { patch: { galaxyKeyEncrypted: null, galaxyServiceAccountId: null, galaxyContentId: null }, label: "the Galaxy Store keys" },
  "huawei-upload": { patch: { huaweiClientId: null, huaweiClientSecretEncrypted: null }, label: "the AppGallery API client" },
  "huawei-push": { patch: { huaweiPushSecretEncrypted: null }, label: "the Huawei Push Kit app secret" },
  "huawei-agconnect": { patch: { huaweiAgconnectAssetId: null }, label: "agconnect-services.json" },
  // 42
  xiaomi: { patch: { xiaomiUserName: null, xiaomiPasswordEncrypted: null, xiaomiCertificate: null, xiaomiReleaseNotes: null }, label: "the Xiaomi GetApps keys" },
};

export async function removeMoreStoreKeyAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const what = REMOVE[String(formData.get("key") ?? "")];
  if (what) {
    await (await getStore()).updateApp(context.app.id, what.patch, new Date());
    await recordStaffChange(context, `Removed ${what.label}`);
  }
  revalidatePath(PAGE);
  redirect(PAGE);
}
