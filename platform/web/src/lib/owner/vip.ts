import { CALL_NOTE_MAX, CALLS_WAITING_MAX, freeTimes, hoursLabel, managerWhatsappUrl } from "../admin/account-managers";
import type { App, Client, License } from "../data/types";
import { planOfLicense } from "../entitlements";
import type { Plan, PlanInfo } from "../plans";
import { getPlans } from "../settings/platform";
import { businessName } from "../team/service";
import { bodyObject, invalid, notAvailable, OwnerError, rateLimited, type OwnerContext, type OwnerResult } from "./http";
import { requireActive } from "./account";

/**
 * 125 VIP in Yallapp Business: the business's account manager (chosen by
 * Yallapp in Admin › Clients, from its own team), shown when one of the
 * person's apps has a plan with an account manager; their free times, and a
 * call asked for at one of them (the manager is emailed; Admin confirms or
 * moves it).
 */

/** Whether one of the apps' plans comes with an account manager. */
export function hasVip(plans: Record<Plan, PlanInfo>, apps: readonly App[], licenses: readonly License[], now: Date): boolean {
  return apps.some((app) => planOfLicense(plans, licenses.find((l) => l.appId === app.id) ?? null, now)?.limits.accountManager === true);
}

/** The manager of a business, when it has one marked as an account manager. */
async function managerOf(ctx: Pick<OwnerContext, "deps">, client: Client) {
  if (!client.accountManagerId) return null;
  const [user, profile] = await Promise.all([ctx.deps.store.getUserById(client.accountManagerId), ctx.deps.store.getStaffProfile(client.accountManagerId)]);
  return user && profile?.accountManager ? { user, profile } : null;
}

/** `AccountManager`, or null: no manager chosen, or none of these apps is VIP. */
export async function accountManagerJson(ctx: OwnerContext, client: Client, apps: readonly App[], licenses: readonly License[], plans: Record<Plan, PlanInfo>) {
  if (!hasVip(plans, apps, licenses, ctx.deps.now)) return null;
  const found = await managerOf(ctx, client);
  if (!found) return null;
  const { user, profile } = found;
  return {
    name: user.name,
    photo_url: profile.photo ? `${ctx.deps.baseUrl}/api/staff/photo/${profile.photo}` : null,
    whatsapp_url: managerWhatsappUrl(profile),
    phone: profile.phone,
    hours_label: hoursLabel(profile.hours, ctx.lang),
  };
}

/** The current business's manager, for the call paths: 404 `not_available` without one. */
async function currentManager(ctx: OwnerContext) {
  requireActive(ctx);
  const plans = await getPlans(ctx.deps.store);
  if (!hasVip(plans, ctx.apps, ctx.licenses, ctx.deps.now)) throw notAvailable();
  const found = await managerOf(ctx, ctx.client);
  if (!found?.profile.hours) throw notAvailable();
  return { ...found, hours: found.profile.hours };
}

export async function listSlots(ctx: OwnerContext): Promise<OwnerResult> {
  const { user, hours } = await currentManager(ctx);
  const taken = await ctx.deps.store.listAccountManagerCalls({ managerId: user.id, statuses: ["requested", "confirmed", "moved"] });
  return { status: 200, body: { time_zone: hours.timezone, days: freeTimes(hours, taken, ctx.deps.now, ctx.lang) } };
}

export async function requestCall(ctx: OwnerContext): Promise<OwnerResult> {
  const { user: manager, hours } = await currentManager(ctx);
  const body = bodyObject(ctx.req.body);
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > CALL_NOTE_MAX) throw invalid({ note: `Keep it under ${CALL_NOTE_MAX} characters.` });
  const { store, now } = ctx.deps;
  const waiting = await store.listAccountManagerCalls({ clientId: ctx.client.id, statuses: ["requested"] });
  if (waiting.length >= CALLS_WAITING_MAX) throw rateLimited(3600, "You've asked for a few calls already. Your account manager answers them first.");
  const taken = await store.listAccountManagerCalls({ managerId: manager.id, statuses: ["requested", "confirmed", "moved"] });
  const free = freeTimes(hours, taken, now, ctx.lang);
  if (!free.some((d) => d.date === date && d.times.includes(time))) throw invalid({ time: "This time isn't free. Please choose another one." }, "This time isn't free. Please choose another one.");
  const call = await store.createAccountManagerCall({
    clientId: ctx.client.id,
    managerId: manager.id,
    requestedBy: ctx.user.id,
    requesterName: ctx.user.name.slice(0, 120),
    date,
    time,
    note: note || null,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  });
  if (!call) throw new OwnerError(409, "slot_taken", "This time isn't free. Please choose another one.");
  // The manager hears of it by email; the call shows in Admin › Clients and Admin › Calls.
  try {
    await ctx.deps.staffMail?.(manager.email, {
      manager: manager.name,
      business: businessName((await store.getUserById(ctx.client.userId)) ?? ctx.user, ctx.apps),
      requester: ctx.user.name,
      requester_email: ctx.user.email,
      date,
      time,
      time_zone: hours.timezone,
      note: note || "-",
      link: `${ctx.deps.baseUrl}/admin/clients/${ctx.client.id}`,
    });
  } catch (error) {
    console.error("[account-manager] the call email couldn't be sent", error instanceof Error ? error.message : String(error));
  }
  return { status: 201, body: { id: call.id, date: call.date, time: call.time, status: call.status } };
}
