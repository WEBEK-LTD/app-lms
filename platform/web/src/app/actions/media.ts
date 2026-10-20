"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, requestIp, type ClientContext } from "@/lib/auth/session";
import type { TeamPermission } from "@/lib/team/permissions";
import { readBilling } from "@/lib/billing/plan-payment";
import { getStore } from "@/lib/data";
import type { App, MediaFile, MediaKind } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { cleanName, completeUpload, deleteMedia, fileUrl, isMediaId, isPublic, mediaLink, uploadUrl } from "@/lib/media/files";
import { cannotBuy, cardOffers, packOffers, startStoragePayment } from "@/lib/media/packs";
import { formatBytes } from "@/lib/media/quota";
import { MEDIA_CHUNK_BYTES } from "@/lib/media/signing";
import { getMediaStorage } from "@/lib/media/storage";
import { startAppUpload } from "@/lib/media/start";
import { resolveStorageNotices } from "@/lib/media/usage";
import { PaymentError } from "@/lib/payments/errors";
import { explainPaymentError } from "@/lib/payments/explain";
import { callbackUrls } from "@/lib/payments/routes";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { priceView } from "@/lib/billing/display";
import { platformSetting, yallappPlanAccount } from "@/lib/settings/platform";

/**
 * 51 The Media library: uploads go from the browser to the media gate in
 * chunks (the actions only sign the way and check what arrived), and the
 * owner renames, shares, deletes and buys more storage.
 */

type MediaContext = ClientContext & { app: App };

async function mediaContext(permission: TeamPermission | readonly TeamPermission[] = "media"): Promise<MediaContext> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard");
  return context as MediaContext;
}

/** The app the uploader was shown for: a switch of app in another tab never uploads into another app. */
function sameApp(context: MediaContext, appId: string): boolean {
  return context.app.id === appId;
}

export type StartUploadState =
  | { ok: true; id: string; uploadUrl: string; chunkBytes: number; size: number }
  | { ok: false; message: string; storageFull?: boolean };

export async function startMediaUploadAction(input: { appId: string; name: string; size: number; type: string }): Promise<StartUploadState> {
  const context = await mediaContext();
  if (!sameApp(context, input.appId)) return { ok: false, message: "You switched to another app in another tab. Reload the page." };
  const result = await startAppUpload({ store: await getStore(), storage: getMediaStorage(), now: new Date() }, context.app, context.state, input);
  if (!result.ok) return { ok: false, message: result.message, storageFull: result.code === "storage_full" };
  revalidatePath("/dashboard/media");
  return result;
}

/** A fresh link to carry on with an upload (after a reload, or a broken connection). */
export async function resumeMediaUploadAction(input: { appId: string; id: string; size: number }): Promise<StartUploadState> {
  const context = await mediaContext();
  if (!sameApp(context, input.appId) || !isMediaId(input.id)) return { ok: false, message: "This upload can't be resumed." };
  const storage = getMediaStorage();
  const file = await (await getStore()).getMediaFile(context.app.id, input.id);
  if (!storage || !file || file.status !== "uploading" || file.sizeBytes !== input.size) return { ok: false, message: "This upload can't be resumed." };
  return { ok: true, id: file.id, uploadUrl: uploadUrl(storage, file), chunkBytes: MEDIA_CHUNK_BYTES, size: file.sizeBytes };
}

export async function completeMediaUploadAction(input: { appId: string; id: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await mediaContext();
  if (!sameApp(context, input.appId) || !isMediaId(input.id)) return { ok: false, message: "This upload was cancelled." };
  const storage = getMediaStorage();
  if (!storage) return { ok: false, message: "Uploads aren't available right now." };
  const result = await completeUpload({ store: await getStore(), storage, now: new Date() }, context.app.id, input.id);
  revalidatePath("/dashboard/media");
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/** Cancels an upload in progress, or deletes a file: its space comes back. */
export async function deleteMediaAction(formData: FormData): Promise<void> {
  const context = await mediaContext();
  const id = String(formData.get("id") ?? "");
  if (isMediaId(id)) {
    const store = await getStore();
    const file = await store.getMediaFile(context.app.id, id);
    try {
      if (await deleteMedia({ store, storage: getMediaStorage() }, context.app.id, id)) {
        await recordStaffChange(context, `Deleted ${file?.name ?? "a file"} from Media`);
        await resolveStorageNotices(store, context.app, await effectivePlans(store), new Date());
      }
    } catch (e) {
      console.error(`[media] delete ${id}: ${e instanceof Error ? e.message : String(e)}`);
      redirect("/dashboard/media?deleted=failed");
    }
  }
  revalidatePath("/dashboard/media");
}

/** Called by the uploader's Cancel button (no form). */
export async function cancelMediaUploadAction(input: { appId: string; id: string }): Promise<void> {
  const context = await mediaContext();
  if (!sameApp(context, input.appId) || !isMediaId(input.id)) return;
  const store = await getStore();
  const file = await store.getMediaFile(context.app.id, input.id);
  if (file?.status === "uploading") await deleteMedia({ store, storage: getMediaStorage() }, context.app.id, input.id).catch(() => false);
  revalidatePath("/dashboard/media");
}

export async function renameMediaAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await mediaContext();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { errors: { name: "Enter a name." }, values: { name } };
  if (name.length > 200) return { errors: { name: "Use at most 200 characters." }, values: { name } };
  const store = await getStore();
  if (!isMediaId(id) || !(await store.getMediaFile(context.app.id, id))) return { message: "This file no longer exists." };
  await store.updateMediaFile(context.app.id, id, { name: cleanName(name), updatedAt: new Date() });
  revalidatePath("/dashboard/media");
  return { ok: true, message: "Renamed.", values: { name: cleanName(name) } };
}

/** Who may open a video or PDF from its link: anyone (pages, sharing), or only students in lessons. */
export async function setMediaPublicAction(formData: FormData): Promise<void> {
  const context = await mediaContext();
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  const file = isMediaId(id) ? await store.getMediaFile(context.app.id, id) : null;
  if (file && file.kind !== "image") {
    await store.updateMediaFile(context.app.id, id, { public: formData.get("public") === "on", updatedAt: new Date() });
  }
  revalidatePath("/dashboard/media");
}

export interface PickableMedia {
  id: string;
  name: string;
  kind: MediaKind;
  size: string;
  link: string;
  /** A picture's small preview (a signed link for an hour). */
  thumbUrl: string | null;
  public: boolean;
}

/** The app's ready files for a picker (lesson videos, pictures in pages, products and listings). */
export async function listMediaAction(input: { kind: MediaKind }): Promise<{ items: PickableMedia[]; available: boolean }> {
  const context = await mediaContext(["media", "catalog", "settings"]);
  const storage = getMediaStorage();
  const files = await (await getStore()).listMediaFiles(context.app.id, { kind: input.kind, status: "ready", limit: 300 });
  return { items: files.map((f) => pickable(f, storage)), available: storage !== null };
}

function pickable(file: MediaFile, storage: ReturnType<typeof getMediaStorage>): PickableMedia {
  return {
    id: file.id,
    name: file.name,
    kind: file.kind,
    size: formatBytes(file.sizeBytes),
    link: mediaLink(appUrl(), file.id),
    thumbUrl: file.kind === "image" && storage ? fileUrl(storage, file, { ttlSeconds: 3600 }).url : null,
    public: isPublic(file),
  };
}

/** A video picked for a page block: anyone with the app may watch it, so its link opens for everyone. */
export async function shareMediaAction(input: { id: string }): Promise<{ ok: boolean }> {
  const context = await mediaContext(["media", "catalog", "settings"]);
  if (!isMediaId(input.id)) return { ok: false };
  const store = await getStore();
  const file = await store.getMediaFile(context.app.id, input.id);
  if (!file) return { ok: false };
  if (!file.public) await store.updateMediaFile(context.app.id, file.id, { public: true, updatedAt: new Date() });
  return { ok: true };
}

/** Buys a storage pack by card: off to the provider's page. It runs until the plan's period ends. */
export async function buyStorageAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await mediaContext("billing");
  const values: Record<string, string> = {};
  for (const name of ["offer", "city", "address"]) values[name] = String(formData.get(name) ?? "").trim();
  if (String(formData.get("appId") ?? "") !== context.app.id) {
    return { message: "You switched to another app in the meantime. Reload the page and check which app you're paying for.", values };
  }
  if (context.client.status === "suspended") return { message: "This account is suspended. Message us on WhatsApp.", values };
  const now = new Date();
  const blocked = cannotBuy(context.license, now);
  if (blocked || !context.license) return { message: blocked ?? "Choose your plan first.", values };
  const store = await getStore();
  // 52 Paid like the plans: into Yallapp's account with the plans' gateway (Kashier, in pounds), shown in the client's currency.
  const account = await yallappPlanAccount(store, encryptionKey());
  if (!account) return { message: "Card payments aren't available right now. Message us on WhatsApp to add storage.", values };
  const view = await priceView(store, context.client, { fresh: true });
  const offers = cardOffers(packOffers((await platformSetting(store, "storagePacks", { fresh: true }))?.value), account.provider, view);
  const offer = offers.find((o) => o.offer.id === values.offer)?.offer;
  if (!offer) return { errors: { offer: "Choose a storage pack." }, values };
  const billing = readBilling(values);
  if (!billing.ok) return { errors: billing.errors, values };
  if (!(await hitRateLimit(store, RATE_LIMITS.planPayment, context.client.id, now)).allowed) {
    return { message: "Too many payment attempts. Try again in an hour, or message us on WhatsApp.", values };
  }
  let url: string;
  try {
    url = await startStoragePayment({
      store,
      account,
      urls: paymentApiUrls(),
      now,
      client: context.client,
      app: context.app,
      license: context.license,
      user: context.user,
      offer,
      view,
      billing: billing.billing,
      ip: await requestIp(),
      callbackUrls: (token) => callbackUrls(appUrl(), "plan", account.provider, token),
    });
  } catch (e) {
    if (e instanceof PaymentError) return { message: `The payment couldn't start: ${explainPaymentError(account.provider, e, { whose: "yallapp" })}`, values };
    throw e;
  }
  redirect(url);
}
