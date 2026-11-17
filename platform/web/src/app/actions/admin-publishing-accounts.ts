"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PublishingAccount } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { accountCounts, DEFAULT_ACCOUNT_LIMIT, isAccountEmail, MAX_ACCOUNT_LIMIT, moveAppAccount, newAccount, readAccounts } from "@/lib/publishing/accounts";
import { tellAccountOfApp } from "@/lib/publishing/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/**
 * 138 Admin › Settings › Publishing accounts: the team adds, deactivates and
 * removes the accounts clients invite, and sets each one's limit; Admin ›
 * Publishing moves an app to another account. Every change is audited. The
 * emails are only ever typed here.
 */

const PAGE = "/admin/settings/publishing-accounts";
const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function write(admin: { id: string; email: string }, next: PublishingAccount[], summary: string, before: unknown, after: unknown) {
  const store = await getStore();
  await store.setPlatformSetting("publishingAccounts", { accounts: next }, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({ actor: admin, action: "publishing.accounts", target: { type: "setting", id: "publishingAccounts" }, summary, before, after });
  revalidatePath(PAGE);
  revalidatePath("/admin/publishing");
}

function limitOf(text: string): number | null {
  if (!/^\d{1,5}$/.test(text)) return null;
  const n = Number(text);
  return n <= MAX_ACCOUNT_LIMIT ? n : null;
}

/** Adds an account with its limit (50 unless the team types another). */
export async function addPublishingAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const values = { email: str(formData, "email").toLowerCase(), limit: str(formData, "limit") };
  const errors: Record<string, string> = {};
  if (!isAccountEmail(values.email)) errors.email = "Enter an email address.";
  const limit = values.limit ? limitOf(values.limit) : DEFAULT_ACCOUNT_LIMIT;
  if (limit === null) errors.limit = `Enter a whole number of apps, up to ${MAX_ACCOUNT_LIMIT.toLocaleString("en")}.`;
  const accounts = await readAccounts(await getStore(), true);
  if (!errors.email && accounts.some((a) => a.email === values.email)) errors.email = "This account is in the list already.";
  if (Object.keys(errors).length) return { errors, values };
  const added = newAccount(values.email, new Date(), limit!);
  await write(admin, [...accounts, added], `Added the publishing account ${added.email} (up to ${added.limit} apps)`, null, added);
  return { ok: true, message: `${added.email} added. New apps go to the account with the fewest apps.`, values: { email: "", limit: "" } };
}

/** An account's limit, and whether it takes new apps. */
export async function updatePublishingAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const id = str(formData, "id");
  const values = { limit: str(formData, "limit"), active: formData.get("active") === "on" ? "on" : "" };
  const accounts = await readAccounts(await getStore(), true);
  const current = accounts.find((a) => a.id === id);
  if (!current) return { message: "This account isn't in the list any more. Reload the page." };
  const limit = limitOf(values.limit);
  if (limit === null) return { errors: { limit: `Enter a whole number of apps, up to ${MAX_ACCOUNT_LIMIT.toLocaleString("en")}.` }, values };
  const next = { ...current, limit, active: values.active === "on" };
  await write(admin, accounts.map((a) => (a.id === id ? next : a)), `Changed the publishing account ${current.email}: up to ${limit} apps${next.active ? "" : ", takes no new apps"}`, current, next);
  return { ok: true, message: `${current.email} saved.`, values };
}

/** Removes an account that has no apps (otherwise: move them, or deactivate it). */
export async function removePublishingAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const id = str(formData, "id");
  const store = await getStore();
  const accounts = await readAccounts(store, true);
  const current = accounts.find((a) => a.id === id);
  if (!current) return { message: "This account isn't in the list any more. Reload the page." };
  const apps = accountCounts(await store.listApps()).get(id) ?? 0;
  if (apps > 0) return { message: `${current.email} has ${apps} ${apps === 1 ? "app" : "apps"}: move them to another account in Publishing first, or deactivate it so it takes no new ones.` };
  await write(admin, accounts.filter((a) => a.id !== id), `Removed the publishing account ${current.email}`, current, null);
  return { ok: true, message: `${current.email} removed.` };
}

/** Admin › Publishing: the team moves an app to another account; its email is told, as for a new app. */
export async function moveAppAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("publishing.manage");
  const store = await getStore();
  const app = await store.getAppById(str(formData, "appId"));
  const to = str(formData, "account");
  if (!app) return { message: "This app isn't here any more." };
  const accounts = await readAccounts(store, true);
  const account = accounts.find((a) => a.id === to);
  if (!account) return { message: "Choose an account from the list." };
  const before = accounts.find((a) => a.id === app.rollout?.publishingAccount?.id)?.email ?? null;
  if (before === account.email) return { ok: true, message: "It's on this account already." };
  const now = new Date();
  await moveAppAccount(store, app.id, account.id, now);
  await recordAudit({ actor: admin, action: "publishing.move", target: { type: "app", id: app.id }, clientId: app.clientId, summary: `${appLabel(app)}: publishing account ${before ?? "none"} → ${account.email}`, before: { account: before }, after: { account: account.email } });
  await tellAccountOfApp(store, (await store.getAppById(app.id)) ?? app, account);
  revalidatePath("/admin/publishing");
  revalidatePath(PAGE);
  return { ok: true, message: `Moved to ${account.email}. The client's Publishing page shows it now; they invite it to their store accounts.` };
}
