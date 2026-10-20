"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { checkInMember, type MemberCheckInAnswer } from "@/lib/bookings/door";
import { memberKey } from "@/lib/bookings/member-codes";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { signingSecret } from "@/lib/env";

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
