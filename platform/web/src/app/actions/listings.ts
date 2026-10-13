"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, ListingInput, ListingStatus } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { imageType } from "@/lib/images";
import { LISTING_IMAGE_MAX_BYTES, LISTING_IMAGES_MAX, OFFICE_REPLY_MAX, parseListingForm, parseOfficeForm } from "@/lib/listings/forms";
import { notifyInquiryReply } from "@/lib/listings/notify";
import { listingSettingsFor } from "@/lib/listings/types";

/** An active client whose app is a Real estate app with listings in the dashboard, or a redirect. */
async function requireListingsApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "listings") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const STATUSES: ListingStatus[] = ["draft", "published", "archived"];

function refresh() {
  revalidatePath("/dashboard/listings", "layout");
  revalidatePath("/dashboard/inquiries", "layout");
}

// Listings

export async function saveListingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireListingsApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getListing(app.id, id) : null;
  if (id !== null && !existing) return { message: "This listing doesn't exist anymore." };

  const values = formValues(formData);
  const parsed = parseListingForm(values, now);
  const errors: Record<string, string> = parsed.ok ? {} : { ...parsed.errors };

  // Photos: the saved ones in the order the form sends them (minus removed ones), then the new uploads.
  const saved = new Set(existing?.imageAssetIds ?? []);
  const kept = [...new Set(formData.getAll("imageOrder").map(String))].filter((a) => saved.has(a));
  const files = formData.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (kept.length + files.length > LISTING_IMAGES_MAX) errors.images = `A listing can have up to ${LISTING_IMAGES_MAX} photos.`;
  const uploads: { data: Buffer; type: { contentType: string; extension: string } }[] = [];
  for (const file of errors.images ? [] : files) {
    if (file.size > LISTING_IMAGE_MAX_BYTES) {
      errors.images = `Each photo can be up to ${LISTING_IMAGE_MAX_BYTES / 1024 / 1024} MB.`;
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
  if (!parsed.ok || Object.keys(errors).length > 0) return { errors, values };

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
  if (existing) {
    await store.updateListing(app.id, existing.id, { ...parsed.value, imageAssetIds }, now);
  } else {
    const publish = formData.get("intent") === "publish";
    const input: ListingInput = {
      ...parsed.value,
      appId: app.id,
      imageAssetIds,
      featured: false,
      status: publish ? "published" : "draft",
      publishedAt: publish ? now : null,
    };
    await store.createListing(input, now);
  }
  refresh();
  redirect(`/dashboard/listings?saved=${encodeURIComponent(parsed.value.title)}`);
}

/** Publish, back to drafts, or archive. */
export async function setListingStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireListingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as ListingStatus;
  const listing = Number.isSafeInteger(id) ? await store.getListing(app.id, id) : null;
  if (listing && STATUSES.includes(status)) {
    const now = new Date();
    await store.updateListing(app.id, listing.id, { status, ...(status === "published" && !listing.publishedAt ? { publishedAt: now } : {}) }, now);
  }
  refresh();
  redirect(`/dashboard/listings/${id}`);
}

export async function setListingFeaturedAction(formData: FormData): Promise<void> {
  const { app } = await requireListingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id) && (await store.getListing(app.id, id))) {
    await store.updateListing(app.id, id, { featured: formData.get("featured") === "on" }, new Date());
  }
  refresh();
  redirect(`/dashboard/listings/${id}`);
}

// The office

export async function saveOfficeAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireListingsApp();
  const values = formValues(formData);
  const parsed = parseOfficeForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).saveListingSettings(app.id, parsed.value, new Date());
  refresh();
  return { ok: true, message: "Office settings saved." };
}

// Inquiries

export async function replyInquiryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireListingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const inquiry = Number.isSafeInteger(id) ? await store.getListingInquiry(app.id, id) : null;
  if (!inquiry) return { message: "This conversation doesn't exist anymore." };
  const text = String(formData.get("message") ?? "").trim();
  if (!text) return { errors: { message: "Write your reply." } };
  if (text.length > OFFICE_REPLY_MAX) return { errors: { message: `Keep your reply to ${OFFICE_REPLY_MAX} characters.` }, values: { message: text } };
  const now = new Date();
  // The office has read everything up to its reply.
  await store.markListingInquiryRead(app.id, inquiry.id, "user", now);
  if (inquiry.status === "closed") await store.updateListingInquiry(app.id, inquiry.id, { status: "open" });
  await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "office", text, createdAt: now });
  const [listing, settings] = await Promise.all([store.getListing(app.id, inquiry.listingId), store.getListingSettings(app.id)]);
  const result = await notifyInquiryReply({
    store,
    app,
    inquiry,
    listing,
    officeName: listingSettingsFor(app, settings).contactName,
    text,
    account: serviceAccountOf(app, encryptionKey()),
    now,
  });
  refresh();
  return {
    ok: true,
    message: result.pushed > 0 ? "Reply sent. It's in their app inbox and went to their phone." : "Reply sent. It's in their app inbox.",
  };
}

export async function setInquiryStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireListingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = formData.get("status");
  if (Number.isSafeInteger(id) && (status === "open" || status === "closed") && (await store.getListingInquiry(app.id, id))) {
    await store.updateListingInquiry(app.id, id, { status });
  }
  refresh();
  redirect(`/dashboard/inquiries/${id}`);
}
