"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import type { AuditAction } from "@/lib/admin/audit-actions";
import { requireAdmin, type AdminUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import {
  cleanLimitDefs,
  isAddedPlan,
  isPlan,
  limitIdOf,
  PLAN_TEXT_LANGS,
  planFamily,
  planSettingOf,
  plansInOrder,
  plansOfFamily,
  plansShown,
  plansWith,
  type Plan,
  type PlanExtrasSetting,
  type PlanLimitDef,
  type PlanSetting,
} from "@/lib/plans";
import { refreshPlanSitesSoon } from "@/lib/license/refresh-soon";
import { clearPlatformSettingsCache, platformSetting } from "@/lib/settings/platform";

/**
 * 133 Admin › Plans, for regular apps and Studio alike: add a plan (from
 * one to start from), duplicate one, put them in order, archive one (hidden
 * from new sales; its clients keep it) and remove an added one that no
 * client was ever on. Every change is a full edit of the "plans" setting,
 * audited. Prices are never set here: a copy keeps the prices the team
 * entered on the plan it copies, and starts hidden.
 */

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function savedPlans(): Promise<Partial<Record<Plan, PlanSetting>>> {
  return (await platformSetting(await getStore(), "plans", { fresh: true }))?.value ?? {};
}

async function writePlans(admin: AdminUser, next: Partial<Record<Plan, PlanSetting>>, audit: { action: AuditAction; plan: Plan; summary: string; before: unknown; after: unknown }) {
  const store = await getStore();
  await store.setPlatformSetting("plans", Object.keys(next).length ? next : null, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({ actor: admin, action: audit.action, target: { type: "plan", id: audit.plan }, summary: audit.summary, before: audit.before, after: audit.after });
  revalidatePlanPages();
}

function revalidatePlanPages() {
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/");
  for (const lang of PLAN_TEXT_LANGS) {
    revalidatePath(`/${lang}/pricing`);
    revalidatePath(`/${lang}`);
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
}

const back = (plan: Plan | null, extra = "") => `/admin/plans?${planFamily(plan ?? "starter") === "studio" ? "family=studio&" : ""}${plan ? `plan=${plan}` : ""}${extra}`;

/** The next free slot of a family: one the team hasn't added. */
function freeSlot(saved: Partial<Record<Plan, PlanSetting>>, family: "regular" | "studio"): Plan | null {
  const shown = new Set(plansShown(family, saved));
  return plansOfFamily(family).find((p) => !shown.has(p) && isAddedPlan(p)) ?? null;
}

/** A copy of a plan's edit for another slot: hidden, not archived, last in the order. */
function copyOf(from: Plan, saved: Partial<Record<Plan, PlanSetting>>, name: string): PlanSetting {
  const plans = plansWith(saved);
  const ordered = plansInOrder(plansShown(planFamily(from), saved), plans);
  const last = ordered.at(-1);
  const order = last ? Math.max(...ordered.map((p) => plans[p].order ?? plansOfFamily(planFamily(p)).indexOf(p))) + 1 : 0;
  const setting = planSettingOf(plans[from]);
  const copy: PlanSetting = { ...setting, name: name.slice(0, 30), offered: false, order, featured: false };
  delete copy.archived;
  delete copy.badge;
  return copy;
}

/** Adds a plan to a family, a copy of the plan the team starts it from (hidden until the team offers it). */
export async function addPlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const from = str(formData, "from");
  if (!isPlan(from)) redirect("/admin/plans");
  const saved = await savedPlans();
  const family = planFamily(from);
  const slot = freeSlot(saved, family);
  if (!slot) redirect(back(from, "&added=full"));
  const setting = copyOf(from, saved, `${plansWith(saved)[from].name} (new)`);
  await writePlans(admin, { ...saved, [slot]: setting }, { action: "plan.add", plan: slot, summary: `Added a plan from ${plansWith(saved)[from].name}`, before: null, after: setting });
  redirect(back(slot, "&added=1"));
}

/** Duplicates a plan: the same features, limits, texts and the prices the team set, hidden until offered. */
export async function duplicatePlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const from = str(formData, "plan");
  if (!isPlan(from)) redirect("/admin/plans");
  const saved = await savedPlans();
  const slot = freeSlot(saved, planFamily(from));
  if (!slot) redirect(back(from, "&added=full"));
  const setting = copyOf(from, saved, `${plansWith(saved)[from].name} (copy)`);
  await writePlans(admin, { ...saved, [slot]: setting }, { action: "plan.duplicate", plan: slot, summary: `Duplicated ${plansWith(saved)[from].name}`, before: null, after: setting });
  redirect(back(slot, "&added=1"));
}

/** Moves a plan one place lower or higher in its family (the pricing page's order, and what counts as an upgrade). */
export async function movePlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  const direction = str(formData, "direction") === "down" ? -1 : 1;
  if (!isPlan(plan)) redirect("/admin/plans");
  const saved = await savedPlans();
  const plans = plansWith(saved);
  const family = planFamily(plan);
  const ordered = plansInOrder(plansShown(family, saved, plan), plans);
  const i = ordered.indexOf(plan);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ordered.length) redirect(back(plan));
  [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
  // Every shown plan of the family gets its place, so the order is kept as a whole.
  const next = { ...saved };
  ordered.forEach((id, index) => {
    next[id] = { ...(next[id] ?? planSettingOf(plans[id])), order: index };
  });
  await writePlans(admin, next, { action: "plan.order", plan, summary: `Moved ${plans[plan].name} ${direction > 0 ? "higher" : "lower"}`, before: ordered.map((id) => plans[id].name), after: ordered.map((id) => plans[id].name) });
  redirect(back(plan));
}

/**
 * Archives a plan (hidden from new sales: the pricing page, the plan
 * cards and the payment form of apps not on it; its clients keep it and
 * may renew it), or brings it back.
 */
export async function archivePlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  const archive = str(formData, "archive") !== "0";
  if (!isPlan(plan)) redirect("/admin/plans");
  const saved = await savedPlans();
  const before = saved[plan] ?? null;
  const setting: PlanSetting = { ...(saved[plan] ?? planSettingOf(plansWith(saved)[plan])) };
  if (archive) setting.archived = true;
  else delete setting.archived;
  await writePlans(admin, { ...saved, [plan]: setting }, {
    action: archive ? "plan.archive" : "plan.unarchive",
    plan,
    summary: `${archive ? "Archived" : "Brought back"} ${plansWith(saved)[plan].name}`,
    before,
    after: setting,
  });
  refreshPlanSitesSoon(plan);
  redirect(back(plan, `&archived=${archive ? 1 : 0}`));
}

/** Whether any client was ever on the plan: a license on it now or next, or a payment for it. */
async function planEverUsed(plan: Plan): Promise<boolean> {
  const store = await getStore();
  if ((await store.listLicenses()).some((l) => l.plan === plan || l.nextPlan === plan)) return true;
  return (await store.listPlanPayments({ limit: 100_000 })).some((p) => p.plan === plan);
}

/** Removes a plan the team added, while no client was ever on it: otherwise it can only be archived. */
export async function removePlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  if (!isPlan(plan) || !isAddedPlan(plan)) redirect("/admin/plans");
  const saved = await savedPlans();
  if (saved[plan]?.offered || (await planEverUsed(plan))) redirect(back(plan, "&removed=used"));
  const { [plan]: removed, ...rest } = saved;
  await writePlans(admin, rest, { action: "plan.reset", plan, summary: `Removed ${removed?.name ?? plan}`, before: removed ?? null, after: null });
  redirect(`/admin/plans${planFamily(plan) === "studio" ? "?family=studio" : ""}`);
}

/**
 * 133 Admin › Plans › Limits: the team's own limits (a name in English,
 * and in Arabic and Turkish if it likes), shown with each plan and handled
 * by the team, and its own wording of what "lifetime" covers.
 */
export async function savePlanExtrasAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const store = await getStore();
  const before = (await platformSetting(store, "planExtras", { fresh: true }))?.value ?? null;
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const limits: PlanLimitDef[] = [];
  for (let i = 0; i < 20; i++) {
    for (const field of ["id", "name", "ar", "tr"]) values[`${field}${i}`] = str(formData, `${field}${i}`);
    if (formData.get(`remove${i}`) === "on") continue;
    const name = values[`name${i}`]!;
    if (!name) continue;
    if (name.length > 40) errors[`name${i}`] = "Use at most 40 characters.";
    const id = values[`id${i}`] || limitIdOf(name);
    if (!/^[a-z0-9_]{1,40}$/.test(id)) errors[`name${i}`] = "Use letters or digits in the name.";
    else if (limits.some((l) => l.id === id)) errors[`name${i}`] = "Another limit has this name.";
    else limits.push({ id, name, ...(values[`ar${i}`] ? { ar: values[`ar${i}`]!.slice(0, 40) } : {}), ...(values[`tr${i}`] ? { tr: values[`tr${i}`]!.slice(0, 40) } : {}) });
  }
  const lifetimeNote: PlanExtrasSetting["lifetimeNote"] = {};
  for (const lang of ["en", "ar", "tr"] as const) {
    const note = (values[`note_${lang}`] = str(formData, `note_${lang}`));
    if (note.length > 600) errors[`note_${lang}`] = "Use at most 600 characters.";
    else if (note) lifetimeNote[lang] = note;
  }
  if (Object.keys(errors).length) return { errors, values, message: "Check the fields marked below. Nothing was saved." };
  const next: PlanExtrasSetting = { limits: cleanLimitDefs({ limits }), ...(Object.keys(lifetimeNote).length ? { lifetimeNote } : {}) };
  await store.setPlatformSetting("planExtras", next, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({ actor: admin, action: "plan.extras", target: { type: "setting", id: "planExtras" }, summary: "Saved the plans' own limits and the lifetime note", before, after: next });
  revalidatePlanPages();
  return { ok: true, message: "Saved. The plans show these limits where a plan has a value for them." };
}
