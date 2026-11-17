"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import type { AuditAction } from "@/lib/admin/audit-actions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { parsePrice } from "@/lib/catalog/money";
import type { FormState } from "@/lib/forms";
import { ICON_NAMES } from "@/components/icon-names";
import { isIncludedFeature, isPlan, PLAN_FEATURE_IDS, planFamily, type Plan, type PlanFeature } from "@/lib/plans";
import { clearPlatformSettingsCache, platformSetting } from "@/lib/settings/platform";
import { ADDON_ID, addonById, addonsOf, isAddonBilling, isAddonLimit, isBuiltInAddon, topPlansOf } from "@/lib/addons/catalog";
import { grantAddon } from "@/lib/addons/payment";
import { addonRetired } from "@/lib/addons/rules";
import { notifyAddonTask } from "@/lib/addons/notify";
import { ADDON_BILLINGS, ADDON_KINDS, ADDON_TASK_STATUSES, type AddonDef, type AddonKind, type AddonPrice, type AddonsSetting, type AddonTaskStatus } from "@/lib/addons/types";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";

/**
 * 133 Admin › Add-ons: the team defines what clients can buy on top of
 * their plan (Plans and prices permission), works on the services' tasks
 * (Publishing permission, like the publishing queue), and gives a client an
 * add-on by hand with no charge (Clients › licenses permission). Every
 * change is audited. Prices are only what the team types.
 */

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function setting(): Promise<AddonsSetting> {
  const saved = (await platformSetting(await getStore(), "addons", { fresh: true }))?.value;
  return { addons: Array.isArray(saved?.addons) ? saved.addons : [], ...(saved?.top ? { top: saved.top } : {}) };
}

async function write(admin: { email: string; id: string }, next: AddonsSetting, audit: { action: AuditAction; id: string; summary: string; before: unknown; after: unknown }) {
  const store = await getStore();
  await store.setPlatformSetting("addons", next, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({ actor: admin, action: audit.action, target: { type: "addon", id: audit.id }, summary: audit.summary, before: audit.before, after: audit.after });
  revalidatePath("/admin/addons");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
}

/** Saves an add-on (a new one with the id the team gives it): its texts, icon, what it does, its prices, who may buy it and whether it's offered. */
export async function saveAddonAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("addons.edit");
  const fields = ["id", "original", "kind", "icon", "enName", "enDescription", "arName", "arDescription", "trName", "trDescription", "limit", "amount", "feature", "family", "order"] as const;
  const values = Object.fromEntries(fields.map((name) => [name, str(formData, name)])) as Record<(typeof fields)[number], string> & Record<string, string>;
  for (const flag of ["belowTop", "repeatable", "active"]) values[flag] = formData.get(flag) === "on" ? "on" : "";
  const plans = formData.getAll("plans").map(String).filter(isPlan);
  values.plans = plans.join(",");
  const errors: Record<string, string> = {};
  const id = values.original || values.id;
  if (!ADDON_ID.test(id)) errors.id = "Use 2 to 40 lower-case letters, digits or -, like pages-10.";
  const kind = ADDON_KINDS.find((k) => k === values.kind) as AddonKind | undefined;
  if (!kind) errors.kind = "Choose what it is.";
  if (!values.enName || values.enName.length > 60) errors.enName = "Enter a name of up to 60 characters.";
  if (values.enDescription.length > 300) errors.enDescription = "Use at most 300 characters.";
  for (const lang of ["ar", "tr"]) {
    if (values[`${lang}Name`]!.length > 60) errors[`${lang}Name`] = "Use at most 60 characters.";
    if (values[`${lang}Description`]!.length > 300) errors[`${lang}Description`] = "Use at most 300 characters.";
  }
  if (!(ICON_NAMES as readonly string[]).includes(values.icon)) errors.icon = "Choose an icon.";
  const feature = values.feature ? ((PLAN_FEATURE_IDS as readonly string[]).includes(values.feature) ? (values.feature as PlanFeature) : undefined) : undefined;
  if (values.feature && !feature) errors.feature = "Choose a feature.";
  if (kind === "feature" && !feature) errors.feature = "Choose the feature it switches on.";
  // 138 What every plan includes ("We publish for you") is never sold.
  if (feature && isIncludedFeature(feature)) errors.feature = "Every plan includes this feature now, so an add-on can't switch it on.";
  const amount = Number(values.amount.replace(/,/g, ""));
  if (kind === "quantity") {
    if (!isAddonLimit(values.limit)) errors.limit = "Choose the limit it adds to.";
    if (!values.amount || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) errors.amount = "Enter how much one adds, like 10.";
  }
  // The ways to pay: each switched on and priced by the team (pounds charged; dollars shown outside Egypt).
  const prices: Partial<Record<(typeof ADDON_BILLINGS)[number], AddonPrice>> = {};
  for (const billing of ADDON_BILLINGS) {
    const on = formData.get(`price_${billing}_on`) === "on";
    const egp = (values[`price_${billing}_egp`] = str(formData, `price_${billing}_egp`));
    const usd = (values[`price_${billing}_usd`] = str(formData, `price_${billing}_usd`));
    values[`price_${billing}_on`] = on ? "on" : "";
    const egpCents = egp ? parsePrice(egp) : null;
    const usdCents = usd ? parsePrice(usd) : null;
    if (egp && (egpCents === null || egpCents === 0)) errors[`price_${billing}_egp`] = "Enter a price in Egyptian pounds, like 500, or leave it empty.";
    if (usd && (usdCents === null || usdCents === 0)) errors[`price_${billing}_usd`] = "Enter a price in US dollars, like 10, or leave it empty to use the rate.";
    else if (usdCents && !egpCents) errors[`price_${billing}_egp`] = "Enter the price in Egyptian pounds too: that's what is charged.";
    if (on || egpCents || usdCents) prices[billing] = { on, egpCents: egpCents || null, usdCents: usdCents || null };
  }
  const order = values.order ? Number(values.order) : 0;
  if (!Number.isFinite(order)) errors.order = "Enter a number.";
  const current = await setting();
  if (!values.original && addonsOf(current).some((a) => a.id === id)) errors.id = "Another add-on has this id.";
  if (Object.keys(errors).length || !kind) return { errors, values, message: "Check the fields marked below. Nothing was saved." };
  const text = (lang: "ar" | "tr") => {
    const name = values[`${lang}Name`]!;
    const description = values[`${lang}Description`]!;
    return name || description ? { [lang]: { ...(name ? { name } : {}), ...(description ? { description } : {}) } } : {};
  };
  const addon: AddonDef = {
    id,
    kind,
    icon: values.icon,
    en: { name: values.enName, description: values.enDescription },
    ...text("ar"),
    ...text("tr"),
    ...(kind === "quantity" ? { limit: values.limit as AddonDef["limit"], amount } : {}),
    ...(kind !== "quantity" && feature ? { feature } : {}),
    prices,
    rule: { family: values.family === "regular" || values.family === "studio" ? values.family : "both", belowTop: values.belowTop === "on", plans: plans.length ? plans : null },
    repeatable: values.repeatable === "on",
    active: values.active === "on",
    order,
  };
  const before = addonById(current, id);
  const list = current.addons.filter((a) => a && typeof a === "object" && (a as AddonDef).id !== id);
  await write(admin, { ...current, addons: [...list, addon] }, { action: "addon.save", id, summary: `Saved the add-on ${addon.en.name}${addon.active ? "" : " (not offered)"}`, before, after: addon });
  return { ok: true, message: addon.active ? `${addon.en.name} saved and offered to the clients its rules allow.` : `${addon.en.name} saved. It isn't offered: clients don't see it.`, values };
}

/** Removes an add-on the team made, while no app ever had it (otherwise it can only be switched off). */
export async function deleteAddonAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("addons.edit");
  const id = str(formData, "id");
  const current = await setting();
  const addon = addonById(current, id);
  if (!addon || isBuiltInAddon(id)) redirect("/admin/addons");
  if ((await (await getStore()).listAppAddons({ addonId: id, limit: 1 })).length) redirect(`/admin/addons?addon=${id}&removed=used`);
  await write(admin, { ...current, addons: current.addons.filter((a) => (a as AddonDef).id !== id) }, { action: "addon.delete", id, summary: `Removed the add-on ${addon.en.name}`, before: addon, after: null });
  redirect("/admin/addons?removed=1");
}

/** The top plan of each family: add-ons "only below the top plan" are offered to apps on lower plans. Empty: the default (138 the highest offered plan). */
export async function saveTopPlansAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("addons.edit");
  const current = await setting();
  const values = { regular: str(formData, "regular"), studio: str(formData, "studio") };
  const errors: Record<string, string> = {};
  const top: Partial<Record<"regular" | "studio", Plan>> = {};
  for (const family of ["regular", "studio"] as const) {
    const v = values[family];
    if (!v) continue;
    if (!isPlan(v) || planFamily(v) !== family) errors[family] = "Choose one of the family's plans.";
    else top[family] = v;
  }
  if (Object.keys(errors).length) return { errors, values };
  const next: AddonsSetting = { addons: current.addons, ...(Object.keys(top).length ? { top } : {}) };
  await write(admin, next, { action: "addon.top", id: "top", summary: "Changed the top plans for add-ons", before: topPlansOf(current), after: top });
  return { ok: true, message: "Top plans saved.", values };
}

/** A service's task: its status and the team's note. */
export async function updateAddonTaskAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("addons.tasks");
  const store = await getStore();
  const id = str(formData, "id");
  const status = str(formData, "status") as AddonTaskStatus;
  const note = str(formData, "note").slice(0, 2000);
  const addon = await store.getAppAddon(id);
  if (!addon || addon.kind !== "service" || !ADDON_TASK_STATUSES.includes(status)) redirect("/admin/addons?tab=tasks");
  await store.updateAppAddon(id, { taskStatus: status, taskNote: note || null, updatedAt: new Date() });
  await recordAudit({
    actor: admin,
    action: "addon.task",
    target: { type: "app", id: addon.appId },
    clientId: addon.clientId,
    summary: `${addon.name}: ${status === "done" ? "done" : status === "in_progress" ? "in progress" : "new"}`,
    before: { status: addon.taskStatus, note: addon.taskNote },
    after: { status, note: note || null },
  });
  revalidatePath("/admin/addons");
  redirect(`/admin/addons?tab=tasks&saved=${id}`);
}

/** Gives a client's app an add-on by hand, with no charge: it runs as if bought, and a service opens its task. */
export async function grantAddonAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.license");
  const store = await getStore();
  const clientId = str(formData, "clientId");
  const appId = str(formData, "appId");
  const billing = str(formData, "billing");
  const back = `/admin/clients/${clientId}`;
  const client = await store.getClientById(clientId);
  const app = await store.getAppById(appId);
  const addon = addonById((await platformSetting(store, "addons", { fresh: true }))?.value, str(formData, "addon"));
  // 138 Never what every plan includes now (publishing).
  if (!client || !app || app.clientId !== client.id || !addon || addonRetired(addon) || !isAddonBilling(billing)) redirect(`${back}?addon=invalid#addons`);
  const given = await grantAddon(store, { client, app, addon, billing, admin: admin.email, now: new Date() });
  await recordAudit({ actor: admin, action: "addon.grant", target: { type: "app", id: app.id }, clientId: client.id, summary: `Gave ${addon.en.name} (${billing === "once" ? "one-time" : billing === "lifetime" ? "lifetime" : `${billing} months`}) with no charge`, before: null, after: given });
  await notifyAddonTask(store, client, app, given);
  refreshSitesSoon([app.id]);
  revalidatePath(back);
  redirect(`${back}?addon=given#addons`);
}

/** Ends a client's add-on now (it stops counting at once); the payment, if any, stays as it was. */
export async function cancelAddonAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.license");
  const store = await getStore();
  const id = str(formData, "id");
  const addon = await store.getAppAddon(id);
  if (!addon) redirect("/admin/clients");
  await store.updateAppAddon(id, { status: "cancelled", updatedAt: new Date() });
  await recordAudit({ actor: admin, action: "addon.cancel", target: { type: "app", id: addon.appId }, clientId: addon.clientId, summary: `Ended ${addon.name}`, before: addon, after: { ...addon, status: "cancelled" } });
  refreshSitesSoon([addon.appId]);
  revalidatePath(`/admin/clients/${addon.clientId}`);
  redirect(`/admin/clients/${addon.clientId}?addon=ended#addons`);
}
