"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { SwitchesSetting } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { isPlan } from "@/lib/plans";
import { getPlans, clearPlatformSettingsCache } from "@/lib/settings/platform";
import { allSwitchKeys, cleanSwitches, getSwitches, LICENSE_FEATURE_SWITCHES, switchKey } from "@/lib/switches";

/** Saves the switches and logs which ones changed. */
async function saveSwitches(next: SwitchesSetting, before: SwitchesSetting | null, admin: { id: string; email: string }, summary: string, action: "switches.save" | "plan.availability", targetId: string) {
  const store = await getStore();
  const empty = next.off.length === 0 && Object.keys(next.offByPlan).length === 0;
  await store.setPlatformSetting("switches", empty ? null : next, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action,
    target: action === "plan.availability" ? { type: "plan", id: targetId } : { type: "switches", id: targetId },
    summary,
    before: { off: before?.off ?? [], ...Object.fromEntries(Object.entries(before?.offByPlan ?? {}).map(([plan, keys]) => [`off_${plan}`, keys])) },
    after: { off: next.off, ...Object.fromEntries(Object.entries(next.offByPlan).map(([plan, keys]) => [`off_${plan}`, keys])) },
  });
  // The dashboard's app types and Website step, and the plans page, follow at once.
  revalidatePath("/", "layout");
}

function describe(turnedOff: string[], turnedOn: string[]): string {
  const parts = [turnedOff.length ? `off: ${turnedOff.join(", ")}` : "", turnedOn.length ? `on: ${turnedOn.join(", ")}` : ""].filter(Boolean);
  return parts.length ? parts.join("; ") : "no change";
}

/** Everything on the Switches page: each checkbox `on` that's ticked is on for everyone. */
export async function saveSwitchesAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("switches.edit");
  const store = await getStore();
  const before = await getSwitches(store, { fresh: true });
  const on = new Set(formData.getAll("on").map(String));
  const off = allSwitchKeys().filter((key) => !on.has(key));
  const next = cleanSwitches(off, before?.offByPlan ?? {});
  const was = new Set(before?.off ?? []);
  const turnedOff = next.off.filter((k) => !was.has(k));
  const turnedOn = [...was].filter((k) => !next.off.includes(k));
  await saveSwitches(next, before, admin, `Switches ${describe(turnedOff, turnedOn)}`, "switches.save", "global");
  return { ok: true, message: turnedOff.length || turnedOn.length ? "Switches saved. The dashboard follows them now." : "Nothing changed." };
}

/** What one plan offers: app types, websites and features (ticked `on`), on top of the global switches. */
export async function savePlanAvailabilityAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const plan = String(formData.get("plan") ?? "");
  if (!isPlan(plan)) return { message: "Unknown plan." };
  const store = await getStore();
  const before = await getSwitches(store, { fresh: true });
  const on = new Set(formData.getAll("on").map(String));
  // License features (push, offline downloads, automatic publishing) are set in the plan's own form.
  const licenseKeys = new Set(LICENSE_FEATURE_SWITCHES.map((f) => switchKey("feature", f)));
  const planOff = allSwitchKeys().filter((key) => !licenseKeys.has(key) && !on.has(key));
  const next = cleanSwitches(before?.off ?? [], { ...(before?.offByPlan ?? {}), [plan]: planOff });
  const was = new Set(before?.offByPlan[plan] ?? []);
  const now = new Set(next.offByPlan[plan] ?? []);
  const name = (await getPlans(store))[plan].name;
  await saveSwitches(
    next,
    before,
    admin,
    `${name} plan: ${describe([...now].filter((k) => !was.has(k)), [...was].filter((k) => !now.has(k)))}`,
    "plan.availability",
    plan,
  );
  revalidatePath("/admin/plans");
  return { ok: true, message: `Saved what the ${name} plan offers.` };
}
