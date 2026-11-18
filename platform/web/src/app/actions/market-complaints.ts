"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { notifyDeps } from "@/lib/delivery/flow";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { tellComplaint } from "@/lib/market/notify";
import { agentFirstName, supportReply, takeComplaint } from "@/lib/market/complaints";
import { complaintReference } from "@/lib/market/json";
import { marketSettingsOf } from "@/lib/market/settings";
import { supportTeam } from "@/lib/market/complaint-team";

/**
 * 115.53 The complaints queue's own actions (design 11 and 12): answering
 * or taking a ticket from the queue's side panel, giving it to someone on
 * the team, and the owner's colours for "since last reply". The page's
 * other actions are app/actions/market.ts's.
 */

async function requireMarketApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const person = (context: ClientContext) => context.member ?? context.staff ?? context.user;
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function complaintOf(context: ClientContext & { app: App }, formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return null;
  return (await getStore()).getMarketComplaint(context.app.id, id);
}

/** Back where the form was: the queue with the ticket chosen, or the ticket's page. */
function backTo(formData: FormData, id: number | null, message?: string): never {
  revalidatePath("/dashboard/market/complaints", "layout");
  revalidatePath("/studio/project/market/complaints", "layout");
  const error = message ? `error=${encodeURIComponent(message)}` : "";
  if (formData.get("from") === "queue") {
    const queue = text(formData, "queue");
    const params = [queue ? `queue=${encodeURIComponent(queue)}` : "", id ? `c=${id}` : "", error].filter(Boolean).join("&");
    redirect(`/dashboard/market/complaints${params ? `?${params}` : ""}`);
  }
  redirect(id ? `/dashboard/market/complaints/${id}${error ? `?${error}` : ""}` : "/dashboard/market/complaints");
}

/** The side panel's Send: the customer reads it as "<App> support" with the person's first name. */
export async function replyFromQueueAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) backTo(formData, null);
  const me = person(context);
  const patch = supportReply(c, text(formData, "text"), me.email, new Date(), agentFirstName(me.name, me.email));
  if (patch) {
    const store = await getStore();
    await store.updateMarketComplaint(context.app.id, c.id, { ...patch, assignee: c.assignee ?? me.email });
    // 115.22 The customer is told (`complaint_update`).
    await tellComplaint(notifyDeps({ store, app: context.app, now: new Date() }), { ...c, ...patch }, "reply");
    await recordStaffChange(context, `Answered complaint ${complaintReference(c)}`);
  }
  backTo(formData, c.id);
}

/** "Take it", from the queue or the page: theirs, and the customer reads who took it. */
export async function takeFromQueueAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) backTo(formData, null);
  const me = person(context);
  await (await getStore()).updateMarketComplaint(context.app.id, c.id, takeComplaint(c, me.email, agentFirstName(me.name, me.email), new Date()));
  backTo(formData, c.id);
}

/** "Assigned to": someone on the account's team (or nobody). */
export async function assignComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) backTo(formData, null);
  const store = await getStore();
  const email = text(formData, "assignee");
  const now = new Date();
  if (!email) {
    await store.updateMarketComplaint(context.app.id, c.id, { assignee: null, updatedAt: now });
  } else {
    const team = await supportTeam(store, context.client.id, context.user);
    const who = team.find((p) => p.email === email);
    if (!who) backTo(formData, c.id, "Choose someone on your team.");
    await store.updateMarketComplaint(context.app.id, c.id, takeComplaint(c, who.email, who.firstName, now));
  }
  await recordStaffChange(context, `Gave complaint ${complaintReference(c)} to ${email || "nobody"}`);
  backTo(formData, c.id);
}

const MAX_MINUTES = 7 * 24 * 60;

/** The owner's colours for "since last reply": amber and red after these minutes (15 and 60 unless set). */
export async function saveReplyColoursAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const amber = Number(text(formData, "amber"));
  const red = Number(text(formData, "red"));
  if (!Number.isInteger(amber) || !Number.isInteger(red) || amber < 1 || red > MAX_MINUTES || red <= amber) backTo(formData, null, "colours");
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(context.app.id));
  const current = marketSettingsOf(settings);
  await store.saveDeliverySettings(context.app.id, { ...settings, marketApp: { ...current, supportReply: { amberMinutes: amber, redMinutes: red } } }, new Date());
  await recordStaffChange(context, `Set the complaints' reply colours to ${amber} and ${red} minutes`);
  backTo(formData, null);
}
