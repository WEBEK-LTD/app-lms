"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readProfileForm, STAFF_PHOTO_PREFIX } from "@/lib/admin/account-managers";
import { recordAudit } from "@/lib/admin/audit";
import { listTeam } from "@/lib/admin/team";
import { requireAdmin } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { isDay } from "@/lib/analytics/days";
import { checkPhoto } from "@/lib/reviews/reviews";

/**
 * 125 VIP in Admin: a team member's contact card and whether they manage
 * accounts (Team, owners), the client's account manager and the calls their
 * people asked for (Clients and Calls), each change in the audit log.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Back to an admin page (the form's `back`), with what happened. */
function back(formData: FormData, fallback: string, query: Record<string, string>): never {
  const raw = String(formData.get("back") ?? "");
  const path = raw.startsWith("/admin/") && !raw.startsWith("//") ? raw.split("?")[0]! : fallback;
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams(query)}`);
}

/** Admin › Team: a member's photo, WhatsApp, phone, hours and "Account manager". */
export async function saveStaffProfileAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("team.manage");
  const userId = String(formData.get("userId") ?? "");
  const store = await getStore();
  const member = UUID.test(userId) ? (await listTeam(store)).find((m) => m.userId === userId) : undefined;
  if (!member) back(formData, "/admin/team", { profile_error: "This person isn't on the team any more." });
  const form: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    form[key] = key === "days" ? [...((form[key] as string[] | undefined) ?? []), value] : value;
  }
  const parsed = readProfileForm(form);
  if (!parsed.ok) back(formData, "/admin/team", { profile_error: Object.values(parsed.errors)[0]!, for: userId });
  const before = await store.getStaffProfile(userId);
  let photo = formData.get("removePhoto") === "on" ? null : (before?.photo ?? null);
  const file = formData.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    const data = Buffer.from(await file.arrayBuffer());
    const checked = checkPhoto(file.size, data);
    if (!checked.ok) back(formData, "/admin/team", { profile_error: checked.error, for: userId });
    photo = `${newId()}.${checked.type.extension}`;
    await getBlobStore().put(`${STAFF_PHOTO_PREFIX}${photo}`, data, checked.type.contentType);
  }
  if (before?.photo && before.photo !== photo) await getBlobStore().delete(`${STAFF_PHOTO_PREFIX}${before.photo}`).catch(() => undefined);
  const now = new Date();
  await store.saveStaffProfile({ userId, photo, ...parsed.value, updatedBy: admin.email, updatedAt: now });
  await recordAudit({
    actor: admin,
    action: "team.profile",
    target: { type: "admin", id: userId },
    summary: `Saved the contact card of ${member.email}${parsed.value.accountManager ? " (account manager)" : ""}`,
    before: before ? { whatsapp: before.whatsapp, phone: before.phone, hours: before.hours, accountManager: before.accountManager, photo: Boolean(before.photo) } : null,
    after: { whatsapp: parsed.value.whatsapp, phone: parsed.value.phone, hours: parsed.value.hours, accountManager: parsed.value.accountManager, photo: Boolean(photo) },
  });
  back(formData, "/admin/team", { done: "profile" });
}

/** Admin › Clients › a client: its account manager, one of the team marked "Account manager", or none. */
export async function setAccountManagerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.edit");
  const clientId = String(formData.get("clientId") ?? "");
  const managerId = String(formData.get("managerId") ?? "");
  const store = await getStore();
  const client = UUID.test(clientId) ? await store.getClientById(clientId) : null;
  if (!client) redirect("/admin/clients");
  const path = `/admin/clients/${client.id}`;
  let name = "nobody";
  if (managerId) {
    const [profile, user] = UUID.test(managerId) ? await Promise.all([store.getStaffProfile(managerId), store.getUserById(managerId)]) : [null, null];
    if (!profile?.accountManager || !user) back(formData, path, { manager_error: "Choose someone of the team marked as an account manager." });
    name = user.email;
  }
  const before = client.accountManagerId ?? null;
  await store.updateClient(client.id, { accountManagerId: managerId || null }, new Date());
  await recordAudit({ actor: admin, action: "client.account_manager", target: { type: "client", id: client.id }, clientId: client.id, summary: `Account manager: ${name}`, before: { accountManagerId: before }, after: { accountManagerId: managerId || null } });
  back(formData, path, { done: "manager" });
}

/** A call a client asked for: confirmed, moved to another day and time, or cancelled. */
export async function updateCallAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.edit");
  const id = Number(formData.get("id"));
  const op = String(formData.get("op") ?? "");
  const store = await getStore();
  const call = Number.isSafeInteger(id) && id > 0 ? await store.getAccountManagerCall(id) : null;
  if (!call) back(formData, "/admin/calls", { call_error: "This call isn't there any more." });
  const now = new Date();
  let summary: string;
  let ok: boolean;
  if (op === "confirm") {
    ok = await store.updateAccountManagerCall(call.id, { status: "confirmed", updatedAt: now });
    summary = `Confirmed the call on ${call.date} at ${call.time}`;
  } else if (op === "cancel") {
    ok = await store.updateAccountManagerCall(call.id, { status: "cancelled", updatedAt: now });
    summary = `Cancelled the call on ${call.date} at ${call.time}`;
  } else if (op === "move") {
    const date = String(formData.get("date") ?? "");
    const time = String(formData.get("time") ?? "");
    if (!isDay(date) || !TIME.test(time)) back(formData, "/admin/calls", { call_error: "Enter the new day and time, like 2026-11-20 and 14:30." });
    ok = await store.updateAccountManagerCall(call.id, { date, time, status: "moved", updatedAt: now });
    if (!ok) back(formData, "/admin/calls", { call_error: "The manager has another call at that time." });
    summary = `Moved the call from ${call.date} ${call.time} to ${date} ${time}`;
  } else {
    back(formData, "/admin/calls", { call_error: "Choose what to do with the call." });
  }
  if (!ok) back(formData, "/admin/calls", { call_error: "This call isn't there any more." });
  await recordAudit({ actor: admin, action: "client.call", target: { type: "client", id: call.clientId }, clientId: call.clientId, summary, before: { date: call.date, time: call.time, status: call.status } });
  revalidatePath("/admin/calls");
  back(formData, "/admin/calls", { done: "call" });
}
