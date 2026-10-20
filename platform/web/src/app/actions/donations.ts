"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, Campaign } from "@/lib/data/types";
import { CAMPAIGN_IMAGE_MAX_BYTES, CAMPAIGN_IMAGES_MAX, parseCampaignForm, parseCampaignUpdate, parseDonationSettings } from "@/lib/donations/forms";
import { donationSettingsOf } from "@/lib/donations/service";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { notifyCampaignDonors, serviceAccountOf } from "@/lib/hosted/notify";
import { imageType } from "@/lib/images";
import { hasFeature } from "@/lib/plans";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * 29 The Campaigns and Donations pages of Charity & donations apps: campaigns
 * (drafts, open, closed, featured), how the app takes donations, and updates
 * sent to a campaign's donors. Payment keys are saved with the shop's
 * actions (app/actions/catalog.ts), own payment keys only.
 */

async function requireCharityApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("donations");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "campaigns") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/campaigns", "layout");
  revalidatePath("/dashboard/donations", "layout");
}

/** Saves the pictures a form sent: their asset IDs, or an error. */
async function savePictures(context: ClientContext, formData: FormData, now: Date, room: number): Promise<{ assetIds: string[] } | { error: string }> {
  const files = formData.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > room) return { error: `A campaign can have up to ${CAMPAIGN_IMAGES_MAX} pictures.` };
  const out: { data: Buffer; type: NonNullable<ReturnType<typeof imageType>> }[] = [];
  for (const file of files) {
    if (file.size > CAMPAIGN_IMAGE_MAX_BYTES) return { error: `Each picture can be up to ${CAMPAIGN_IMAGE_MAX_BYTES / 1024 / 1024} MB.` };
    const data = Buffer.from(await file.arrayBuffer());
    const type = imageType(data);
    if (!type) return { error: "Pictures must be PNG or JPEG files." };
    out.push({ data, type });
  }
  const assetIds: string[] = [];
  for (const { data, type } of out) {
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
    await getBlobStore().put(blobKey, data, type.contentType);
    await (await getStore()).createAsset({
      id: assetId,
      clientId: context.client.id,
      kind: "product_image",
      blobKey,
      contentType: type.contentType,
      size: data.length,
      createdAt: now,
    });
    assetIds.push(assetId);
  }
  return { assetIds };
}

export async function saveCampaignAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCharityApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getCampaign(app.id, id) : null;
  if (id !== null && !existing) return { message: "This campaign doesn't exist anymore." };

  const values = formValues(formData);
  const parsed = parseCampaignForm(values, now, { newCampaign: !existing });
  if (!parsed.ok) return { errors: parsed.errors, values };
  const removed = new Set(formData.getAll("removeImage").map(String));
  const kept = (existing?.imageAssetIds ?? []).filter((a) => !removed.has(a));
  const pictures = await savePictures(context, formData, now, CAMPAIGN_IMAGES_MAX - kept.length);
  if ("error" in pictures) return { errors: { images: pictures.error }, values };
  const imageAssetIds = [...kept, ...pictures.assetIds];

  const publish = formData.get("intent") === "publish";
  let campaign: Campaign;
  if (existing) {
    const patch = { ...parsed.value, imageAssetIds, ...(publish && existing.status === "draft" ? { status: "open" as const, publishedAt: existing.publishedAt ?? now } : {}) };
    await store.updateCampaign(app.id, existing.id, patch, now);
    campaign = { ...existing, ...patch };
  } else {
    campaign = await store.createCampaign(
      { ...parsed.value, appId: app.id, imageAssetIds, featured: false, status: publish ? "open" : "draft", publishedAt: publish ? now : null },
      now,
    );
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the campaign "${campaign.title}"`);
  refresh();
  const query = new URLSearchParams({ saved: campaign.title });
  if (publish && existing?.status !== "open") query.set("published", "1");
  redirect(`/dashboard/campaigns?${query}`);
}

/** Open (publish or reopen), close, or back to a draft. */
export async function setCampaignStatusAction(formData: FormData): Promise<void> {
  const context = await requireCharityApp();
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = formData.get("status");
  const campaign = Number.isSafeInteger(id) ? await store.getCampaign(app.id, id) : null;
  if (campaign && (status === "open" || status === "closed" || status === "draft") && campaign.status !== status) {
    const now = new Date();
    // Reopening a campaign whose end date has passed drops the end date: otherwise it would stay closed.
    const reopenPast = status === "open" && campaign.endsAt !== null && campaign.endsAt.getTime() <= now.getTime();
    await store.updateCampaign(
      app.id,
      campaign.id,
      { status, ...(status === "open" && !campaign.publishedAt ? { publishedAt: now } : {}), ...(reopenPast ? { endsAt: null } : {}) },
      now,
    );
    await recordStaffChange(context, `Set the campaign "${campaign.title}" to ${status}`);
  }
  refresh();
  redirect(`/dashboard/campaigns/${id}`);
}

export async function setCampaignFeaturedAction(formData: FormData): Promise<void> {
  const { app } = await requireCharityApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id) && (await store.getCampaign(app.id, id))) {
    await store.updateCampaign(app.id, id, { featured: formData.get("featured") === "on" }, new Date());
  }
  refresh();
  redirect(`/dashboard/campaigns/${id}`);
}

/** Deletes a campaign. One with donations can only be closed: its donations keep their receipts either way. */
export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const context = await requireCharityApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const campaign = Number.isSafeInteger(id) ? await store.getCampaign(context.app.id, id) : null;
  if (!campaign) redirect("/dashboard/campaigns");
  const given = await store.listDonations({ appId: context.app.id, campaignId: campaign.id, statuses: ["paid", "refunded"], offset: 0, limit: 1 });
  if (given.total > 0) redirect(`/dashboard/campaigns/${campaign.id}?cannotDelete=1`);
  await store.deleteCampaign(context.app.id, campaign.id);
  await recordStaffChange(context, `Deleted the campaign "${campaign.title}"`);
  refresh();
  redirect(`/dashboard/campaigns?deleted=${encodeURIComponent(campaign.title)}`);
}

export async function saveDonationSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCharityApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const current = donationSettingsOf(await store.getDonationSettings(app.id));
  const given = await store.listDonations({ appId: app.id, statuses: ["paid", "refunded"], offset: 0, limit: 1 });
  const parsed = parseDonationSettings(values, given.total > 0, current);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveDonationSettings(app.id, parsed.value, new Date());
  await recordStaffChange(context, `Saved the donation settings (${parsed.value.currency}, iPhone: ${parsed.value.iosMode})`);
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values };
}

/** Sends an update to the people who gave to a campaign: their inbox, and their phones when they allow campaign updates. */
export async function sendCampaignUpdateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCharityApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = Number(formData.get("id"));
  const campaign = Number.isSafeInteger(id) ? await store.getCampaign(app.id, id) : null;
  if (!campaign) return { message: "This campaign doesn't exist anymore." };
  const parsed = parseCampaignUpdate(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const now = new Date();
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
  if (!limit.allowed) return { message: "You've sent many notifications in a short time. Try again in an hour.", values };
  const push = hasFeature(await appPlan(store, context.license, now), "push");
  const result = await notifyCampaignDonors({
    store,
    app,
    campaignId: campaign.id,
    title: parsed.value.title,
    body: parsed.value.body,
    account: push ? serviceAccountOf(app, encryptionKey()) : null,
    now,
  });
  if (result.donors === 0) return { message: "Nobody signed in to the app has given to this campaign yet, so there's no one to send it to.", values };
  await recordStaffChange(context, `Sent the update "${parsed.value.title}" to the donors of "${campaign.title}"`);
  const donors = `${result.donors} ${result.donors === 1 ? "donor" : "donors"}`;
  const phones = !push || result.pushError ? "" : ` and ${result.pushed} ${result.pushed === 1 ? "phone" : "phones"} that allow campaign updates`;
  return { ok: true, message: `Sent to the app inbox of ${donors}${phones}.` };
}
