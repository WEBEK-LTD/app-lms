"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { findRated, ratedReference, removeRatingReply, replyToRating } from "@/lib/owner/rating-replies";
import { recordTeamActivity } from "@/lib/team/activity";

/**
 * 132 The business's reply under a customer's rating of a food order, a
 * marketplace order or a ride (Dashboard › the order's or the ride's page,
 * the marketplace's orders): written, changed, removed. The customer is
 * told the first time.
 */

async function rated(formData: FormData) {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard");
  const store = await getStore();
  const found = await findRated(store, app, String(formData.get("source") ?? ""), Number(formData.get("id")));
  return { context, app, store, found };
}

function refresh() {
  revalidatePath("/dashboard/food-orders", "layout");
  revalidatePath("/dashboard/rides", "layout");
  revalidatePath("/dashboard/market/orders");
}

export async function replyRatingAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app, store, found } = await rated(formData);
  const values = { text: String(formData.get("text") ?? "") };
  if (!found) return { ok: false, message: "Not found.", values };
  const now = new Date();
  const user = actorOf(context);
  const done = await replyToRating({ store, app, now, account: serviceAccountOf(app, encryptionKey()) }, found, values.text, user.name?.trim() || user.email);
  if (!done.ok) return { errors: { text: done.error }, values };
  await recordTeamActivity(store, { clientId: context.client.id, appId: app.id, actor: user, action: "rating.reply", target: { type: found.source, id: found.item.id }, summary: `Replied to the rating of ${ratedReference(found)}` }, now);
  refresh();
  return { ok: true, message: done.first ? "Reply saved. The customer was told." : "Reply saved." };
}

export async function deleteRatingReplyAction(formData: FormData): Promise<void> {
  const { app, store, found } = await rated(formData);
  if (found) await removeRatingReply(store, app, found, new Date());
  refresh();
}
