"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { DESIGNER_LINKS_MAX, designerPath, PAGE_MESSAGES, rateTemplate, readDesignerLinks, readDesignerPhoto, replyToRating } from "@/lib/studio-market/designer-page";
import { DESIGNER_MESSAGES, nextProfileReview, readDesignerProfile } from "@/lib/studio-market/designers";

/**
 * 106.14 A designer's public page from the dashboard: the designer's own
 * profile (their photo, name, address, line, country and links, and what
 * shows), a buyer's rating of a template they got (once, changed in
 * place), and the designer's one answer under a rating of their template.
 * Only the account's owner (the dashboard's owner-only `billing`, as for
 * buying and selling).
 */

async function owner(): Promise<ClientContext> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Paths that show the designer: their page in each language, and the market's. */
function refreshDesigner(slug: string) {
  for (const prefix of ["", "/ar", "/tr"]) revalidatePath(`${prefix}${designerPath(slug)}`);
  revalidatePath("/templates", "layout");
  revalidatePath("/studio/market", "layout");
}

/** Designer area › Your page › Save. */
export async function saveDesignerPageAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const now = new Date();
  const links = Array.from({ length: DESIGNER_LINKS_MAX }, (_, i) => text(formData, `link${i + 1}`).slice(0, 400));
  const values: Record<string, string> = {
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    country: text(formData, "country"),
    bio: text(formData, "bio"),
    showCountry: formData.get("showCountry") === "on" ? "on" : "",
    showLinks: formData.get("showLinks") === "on" ? "on" : "",
    ...Object.fromEntries(links.map((link, i) => [`link${i + 1}`, link])),
  };

  const read = readDesignerProfile({ name: values.name!, slug: values.slug!, country: values.country!, bio: values.bio! }, designer.slug);
  const errors: Record<string, string> = read.ok ? {} : { ...read.errors };
  const readLinks = readDesignerLinks(links);
  if (!readLinks.ok) errors.links = readLinks.error;
  // The photo: PNG or JPEG by its first bytes, up to 2 MB (the file's own type and name aren't trusted).
  const file = formData.get("photo");
  let photoData: Buffer | null = null;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > 2 * 1024 * 1024 + 1) errors.photo = PAGE_MESSAGES.photo;
    else photoData = Buffer.from(await file.arrayBuffer());
  }
  const photo = errors.photo ? null : readDesignerPhoto(photoData);
  if (photo && !photo.ok) errors.photo = photo.error;
  if (!read.ok || !readLinks.ok || Object.keys(errors).length) return { errors, values };

  let photoAssetId = formData.get("removePhoto") === "on" ? null : designer.photoAssetId;
  if (photo?.ok && photo.photo) {
    photoAssetId = newId();
    // In the account's own folder: it goes with the account when it is deleted (lib/account/purge.ts).
    const blobKey = `assets/${context.client.id}/${photoAssetId}.${photo.photo.extension}`;
    await getBlobStore().put(blobKey, photo.photo.data, photo.photo.contentType);
    await store.createAsset({ id: photoAssetId, clientId: context.client.id, kind: "designer_photo", blobKey, contentType: photo.photo.contentType, size: photo.photo.data.length, createdAt: now });
  }
  const changed = read.value.bio !== designer.bio || photoAssetId !== designer.photoAssetId;
  const profileReview = nextProfileReview(designer, { bio: read.value.bio, photoAssetId, changed });
  const saved = await store.updateTemplateDesigner(
    designer.id,
    { ...read.value, photoAssetId, profileReview, ...(profileReview === "pending" && designer.profileReview !== "pending" ? { profileNote: null } : {}), showCountry: values.showCountry === "on", links: readLinks.links, showLinks: values.showLinks === "on" },
    now,
  );
  if (!saved) {
    if (photoAssetId && photoAssetId !== designer.photoAssetId) await dropPhoto(context.client.id, photoAssetId);
    return { errors: { slug: DESIGNER_MESSAGES.slugTaken }, values };
  }
  // The photo it replaced isn't needed any more.
  if (designer.photoAssetId && designer.photoAssetId !== photoAssetId) await dropPhoto(context.client.id, designer.photoAssetId);
  refreshDesigner(designer.slug);
  if (read.value.slug !== designer.slug) refreshDesigner(read.value.slug);
  revalidatePath("/designer", "layout");
  return { ok: true, message: PAGE_MESSAGES.saved, values };
}

async function dropPhoto(clientId: string, assetId: string): Promise<void> {
  const store = await getStore();
  const old = await store.getAsset(assetId);
  if (old && old.kind === "designer_photo" && old.clientId === clientId) {
    await getBlobStore().delete(old.blobKey).catch(() => undefined);
    await store.deleteAsset(old.id);
  }
}

/** A template's page › Rate this template (once per template and account; sent again, it changes the rating). */
export async function rateTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const values = { stars: text(formData, "stars"), comment: text(formData, "comment").slice(0, 2000) };
  const store = await getStore();
  if (!(await hitRateLimit(store, RATE_LIMITS.marketRating, context.client.id)).allowed) return { errors: { form: PAGE_MESSAGES.busy }, values };
  const template = await store.getMarketTemplateBySlug(text(formData, "slug"));
  if (!template || template.status !== "published") return { errors: { form: PAGE_MESSAGES.gone }, values };
  const me = context.member ?? context.user;
  const result = await rateTemplate(store, template, { clientId: context.client.id, name: me.name }, values, new Date());
  if (!result.ok) return { errors: result.errors, values };
  const designer = await store.getTemplateDesigner(template.designerId);
  if (designer) refreshDesigner(designer.slug);
  for (const prefix of ["", "/ar", "/tr"]) revalidatePath(`${prefix}/templates/${template.slug}`);
  revalidatePath(`/studio/market/t/${template.slug}`);
  return { ok: true, message: result.created ? PAGE_MESSAGES.rated : PAGE_MESSAGES.ratingChanged, values };
}

/** Designer area › Ratings › Reply (one answer per rating; sent again, it changes it; empty, it takes it away). */
export async function replyRatingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const values = { reply: text(formData, "reply").slice(0, 2000) };
  if (!(await hitRateLimit(store, RATE_LIMITS.marketRating, context.client.id)).allowed) return { errors: { reply: PAGE_MESSAGES.busy }, values };
  const result = await replyToRating(store, designer, text(formData, "rating"), formData.get("remove") === "on" ? "" : values.reply, new Date());
  if (!result.ok) return { errors: { reply: result.error }, values };
  refreshDesigner(designer.slug);
  revalidatePath("/designer/ratings");
  return { ok: true, message: result.removed ? PAGE_MESSAGES.replyRemoved : PAGE_MESSAGES.replied, values: result.removed ? { reply: "" } : values };
}
