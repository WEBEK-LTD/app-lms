"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { removeProductReviewReply, replyToProductReview, setProductReviewHidden } from "@/lib/selling/product-reviews-admin";
import { shopFeaturesOn } from "@/lib/selling/shop-features";

/**
 * 212 Delivery & offers › Reviews: the shop's one reply under a review, and
 * hiding an abusive one (the same functions as the Owner API's).
 */

async function requireShop(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("catalog");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || !shopFeaturesOn(context.app)) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

async function ownReview(formData: FormData) {
  const context = await requireShop();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const review = Number.isSafeInteger(id) ? await store.getProductReview(context.app.id, id) : null;
  return { store, review };
}

export async function replyProductReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const { store, review } = await ownReview(formData);
  if (!review) return { message: "This review no longer exists." };
  const text = String(formData.get("text") ?? "");
  const result = await replyToProductReview(store, review, text, new Date());
  if (!result.ok) return { errors: { text: result.error }, ...(text.trim() ? { values: { text } } : {}) };
  revalidatePath("/dashboard/selling/reviews");
  return { ok: true, message: "Your reply is under the review in the app." };
}

export async function removeProductReviewReplyAction(formData: FormData): Promise<void> {
  const { store, review } = await ownReview(formData);
  if (review) await removeProductReviewReply(store, review, new Date());
  revalidatePath("/dashboard/selling/reviews");
}

export async function setProductReviewHiddenAction(formData: FormData): Promise<void> {
  const { store, review } = await ownReview(formData);
  const hidden = formData.get("hidden") === "1";
  if (review && review.hidden !== hidden) await setProductReviewHidden(store, review, hidden, new Date());
  revalidatePath("/dashboard/selling/reviews");
}
