"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard } from "@/lib/auth/session";
import { parsePrice } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { answerStoreRequest, isRequestStatus, REQUEST_REPLY_MAX } from "@/lib/selling/requests";
import { recordTeamActivity } from "@/lib/team/activity";

/** 210 The shop's answer to a custom-order request: its status, the price quoted and a reply. */
export async function answerRequestAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || app.connector?.kind !== "catalog") redirect("/dashboard");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const request = Number.isSafeInteger(id) ? await store.getStoreRequest(app.id, id) : null;
  if (!request) return { message: "This request doesn't exist anymore." };
  const status = formData.get("status");
  if (!isRequestStatus(status)) return { message: "Choose where the request is." };
  const reply = String(formData.get("reply") ?? "").trim();
  if (reply.length > REQUEST_REPLY_MAX) return { errors: { reply: `Keep it under ${REQUEST_REPLY_MAX} characters.` } };
  const quoteText = String(formData.get("quote") ?? "").trim();
  const quote = quoteText ? parsePrice(quoteText, request.currency) : null;
  if (quoteText && (quote === null || quote === 0)) return { errors: { quote: "Enter a price, like 450 or 450.50." } };
  const now = new Date();
  await answerStoreRequest(store, app.id, request.id, { status, reply: reply || null, quoteCents: quote }, now);
  await recordTeamActivity(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), action: "shop.request", target: { type: "app", id: app.id }, summary: `Answered the custom-order request #${request.id} (${status})` }, now);
  revalidatePath("/dashboard/catalog/requests");
  revalidatePath("/studio/project/catalog/requests");
  return { ok: true, message: "Saved the answer." };
}
