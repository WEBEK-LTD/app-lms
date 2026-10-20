"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { checkInMember, type MemberCheckInAnswer } from "@/lib/bookings/door";
import { freezeMembership, unfreezeMembership } from "@/lib/bookings/freeze";
import { memberKey } from "@/lib/bookings/member-codes";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { signingSecret } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { recordFreeze } from "@/lib/team/activity";

/**
 * 63 Members › Check-in of a gym: a member code scanned or typed, or a
 * member chosen by name (lib/bookings/door.ts, as the Owner API).
 */

async function requireGym(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("bookings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "bookings" || context.app.vertical !== "fitness") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

export interface MemberCheckInState {
  answer?: MemberCheckInAnswer;
  /** When it was answered, so the page shows each answer (and clears the code). */
  at?: string;
}

export async function memberCheckInAction(_: MemberCheckInState, formData: FormData): Promise<MemberCheckInState> {
  const context = await requireGym();
  const { app } = context;
  const scanned = String(formData.get("code") ?? "").slice(0, 300);
  const idText = String(formData.get("membershipId") ?? "");
  const membershipId = /^\d{1,15}$/.test(idText) ? Number(idText) : undefined;
  const now = new Date();
  const answer = await checkInMember({
    store: await getStore(),
    app,
    key: memberKey(signingSecret(), app.id),
    ...(membershipId !== undefined ? { membershipId } : { scanned }),
    by: actorOf(context).name,
    now,
  });
  if (answer.outcome === "admitted") revalidatePath("/dashboard/members", "layout");
  return { answer, at: now.toISOString() };
}

// 64 Members: freezing a membership (lib/bookings/freeze.ts, as the Owner API), with the activity on the Team page.

async function requireBookings(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("bookings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "bookings") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

async function ownMembership(formData: FormData) {
  const context = await requireBookings();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const membership = Number.isSafeInteger(id) ? await store.getMembership(context.app.id, id) : null;
  return { context, store, membership };
}

export async function freezeMembershipAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, store, membership } = await ownMembership(formData);
  const values = { from: String(formData.get("from") ?? ""), until: String(formData.get("until") ?? "") };
  if (!membership) return { message: "This membership no longer exists." };
  const now = new Date();
  const result = await freezeMembership(store, context.app, membership, values, now);
  if (!result.ok) return result.status === 409 ? { message: Object.values(result.errors)[0] } : { errors: result.errors, values };
  const user = await store.getHostedUser(context.app.id, membership.userId);
  await recordFreeze(store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), membershipId: membership.id, name: user?.name ?? "", frozen: true }, now);
  revalidatePath("/dashboard/members", "layout");
  return { ok: true, message: "The membership is frozen." };
}

export async function unfreezeMembershipAction(formData: FormData): Promise<void> {
  const { context, store, membership } = await ownMembership(formData);
  if (!membership) return;
  const now = new Date();
  const result = await unfreezeMembership(store, context.app, membership, now);
  if (result.ok) {
    const user = await store.getHostedUser(context.app.id, membership.userId);
    await recordFreeze(store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), membershipId: membership.id, name: user?.name ?? "", frozen: false }, now);
  }
  revalidatePath("/dashboard/members", "layout");
}
