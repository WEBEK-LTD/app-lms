"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { findClient } from "@/lib/live-activity/entries";
import { checkPhoto, moveReview, newReview, readReviewForm, REVIEW_PHOTO_PREFIX } from "@/lib/reviews/reviews";
import { clearPlatformSettingsCache, getPlans, platformSetting } from "@/lib/settings/platform";

/** Admin › Reviews: real customers' reviews on the home page. */

// The home page is rendered per request, so it shows a change at once.
function refresh() {
  revalidatePath("/admin/reviews");
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const FIELDS = ["name", "role", "city", "appName", "plan", "client", "rating", "lang", "source", "sourceUrl", "text", "text_en", "text_ar", "text_tr", "reviewedOn", "consent"];

/** A review the team has from a real customer, only with the box "This is a real review and the customer agreed to it being shown". */
export async function addReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("marketing.edit");
  const values: Record<string, string> = {};
  for (const name of FIELDS) values[name] = field(formData, name);
  const store = await getStore();
  const now = new Date();
  const read = readReviewForm(values, await getPlans(store), now);
  if (!read.ok) return { errors: read.errors, values };
  const client = read.form.client ? await findClient(store, read.form.client) : null;
  if (read.form.client && !client) return { errors: { client: "No client has this email or ID. Leave it empty to add the review without one." }, values };
  const file = formData.get("photo");
  let photo: string | null = null;
  if (file instanceof File && file.size > 0) {
    const data = Buffer.from(await file.arrayBuffer());
    const checked = checkPhoto(file.size, data);
    if (!checked.ok) return { errors: { photo: checked.error }, values };
    photo = `${randomUUID()}.${checked.type.extension}`;
    await getBlobStore().put(`${REVIEW_PHOTO_PREFIX}${photo}`, data, checked.type.contentType);
  }
  const all = await store.listSiteReviews();
  const position = all.reduce((max, r) => Math.max(max, r.position), 0) + 1;
  const review = newReview(read.form, { clientId: client?.id ?? null, photo, position, createdBy: admin.email, now });
  await store.saveSiteReview(review);
  await recordAudit({
    actor: admin,
    action: "review.add",
    target: { type: "review", id: review.id },
    clientId: review.clientId,
    summary: `Added ${review.name}'s ${review.rating}-star review to the home page, as a real review they agreed to show`,
    after: { name: review.name, role: review.role, city: review.city, rating: review.rating, lang: review.lang, text: review.text, reviewedAt: review.reviewedAt, photo: Boolean(photo), consent: review.consent },
  });
  refresh();
  return { ok: true, message: `Added ${review.name}'s review. It shows on the home page now.`, values: {} };
}

/** Hides a review from the home page, or shows it again. */
export async function hideReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const review = await store.getSiteReview(field(formData, "id"));
  if (!review) return;
  const hidden = field(formData, "hidden") === "true";
  if (review.hidden === hidden) return;
  await store.saveSiteReview({ ...review, hidden });
  await recordAudit({
    actor: admin,
    action: "review.hide",
    target: { type: "review", id: review.id },
    clientId: review.clientId,
    summary: `${hidden ? "Hid" : "Showed again"} ${review.name}'s review on the home page`,
    before: { hidden: review.hidden },
    after: { hidden },
  });
  refresh();
}

/** Moves a review one place up or down. */
export async function moveReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const review = await store.getSiteReview(field(formData, "id"));
  const direction = field(formData, "direction") === "up" ? "up" : "down";
  if (!review || !(await moveReview(store, review.id, direction))) return;
  await recordAudit({ actor: admin, action: "review.move", target: { type: "review", id: review.id }, summary: `Moved ${review.name}'s review ${direction}` });
  refresh();
}

/** Deletes a review and its photo. */
export async function deleteReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const review = await store.getSiteReview(field(formData, "id"));
  if (!review || !(await store.deleteSiteReview(review.id))) return;
  if (review.photo) await getBlobStore().delete(`${REVIEW_PHOTO_PREFIX}${review.photo}`).catch(() => {});
  await recordAudit({
    actor: admin,
    action: "review.delete",
    target: { type: "review", id: review.id },
    clientId: review.clientId,
    summary: `Deleted ${review.name}'s review`,
    before: { name: review.name, rating: review.rating, text: review.text },
  });
  refresh();
}

/** "Show sample cards until real reviews are added": once a real review is shown, samples never show, whatever this says. */
export async function saveReviewsSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("marketing.edit");
  const samples = field(formData, "samples") === "on";
  const store = await getStore();
  const before = (await platformSetting(store, "reviews", { fresh: true }))?.value ?? null;
  await store.setPlatformSetting("reviews", { samples }, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action: "settings.save",
    target: { type: "setting", id: "reviews" },
    summary: samples ? "Sample review cards on until a real review is shown" : "Sample review cards off",
    before,
    after: { samples },
  });
  refresh();
  return { ok: true, message: samples ? "Saved. Until a real review is shown, the home page shows the labelled sample cards." : "Saved. Until a real review is shown, the home page has no reviews section.", values: { samples: samples ? "on" : "" } };
}
