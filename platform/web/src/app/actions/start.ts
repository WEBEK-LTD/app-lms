"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { chooseApp, clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { demoKind } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoOfSlug, pickerPath } from "@/lib/demo/picker";
import { DEMO_NAME_MAX, firstStepsOf, makeFromDemo } from "@/lib/demo/start";
import { appPlan } from "@/lib/entitlements";
import { appTypeOn, getSwitches } from "@/lib/switches";

/**
 * 127 Choosing an app from our demos (/start): making it from "Make it
 * yours", with the same checks as the app type step and Studio's new
 * project (switches, the number of apps), and its first steps in the editor.
 */

async function requireStartClient(permission: "apps" | "settings") {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

/** An asset of this account of this kind, else null. */
async function ownAsset(clientId: string, id: FormDataEntryValue | null, kind: "logo" | "icon"): Promise<string | null | false> {
  if (typeof id !== "string" || !id) return null;
  if (!/^[\w-]{1,64}$/.test(id)) return false;
  const asset = await (await getStore()).getAsset(id);
  return asset && asset.clientId === clientId && asset.kind === kind ? id : false;
}

/** "Create my app": the app made from the demo, with the owner's name, logo, icon and colour, opened in its editor. */
export async function startFromDemoAction(formData: FormData): Promise<void> {
  const context = await requireStartClient("apps");
  const demo = demoOfSlug(String(formData.get("demo") ?? ""));
  if (!demo) redirect(pickerPath({ adding: context.apps.length > 0 }));
  const adding = context.apps.length > 0;
  const back = (problem: string): never => redirect(`${pickerPath({ demo, make: true, adding })}${adding ? "&" : "?"}error=${problem}`);
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (!name || name.length > DEMO_NAME_MAX) back("name");
  if (context.apps.length >= MAX_APPS_PER_CLIENT) back("limit");
  const typed = String(formData.get("colour") ?? "");
  const colour = /^#[0-9a-f]{6}$/i.test(typed) ? typed.toUpperCase() : DEMO_BRANDS[demo].primaryColor;
  const logoAssetId = await ownAsset(context.client.id, formData.get("logoAssetId"), "logo");
  const iconAssetId = await ownAsset(context.client.id, formData.get("iconAssetId"), "icon");
  if (logoAssetId === false || iconAssetId === false) back("logo");
  const store = await getStore();
  // The account's first app may have its plan already; an added app has none until it's paid.
  const license = context.apps.length ? null : context.license;
  const kind = demoKind(demo);
  // 11.5 A type the team switched off can't be chosen.
  if (!appTypeOn(await getSwitches(store), kind.engine, license?.plan ?? null)) back("unavailable");
  const now = new Date();
  let open: string;
  try {
    const made = await makeFromDemo(
      store,
      { clientId: context.client.id, plan: await appPlan(store, license, now) },
      { demo, name, colour, logoAssetId: logoAssetId || null, iconAssetId: iconAssetId || null },
      now,
    );
    await chooseApp(made.app.id);
    await recordStaffChange({ ...context, app: made.app }, `Started an app from the ${DEMO_BRANDS[demo].appName} demo`, { appType: null }, { appType: kind.engine, vertical: kind.vertical, section: made.app.section ?? "regular" });
    open = made.open;
  } catch (error) {
    console.error(`[demo start] ${error instanceof Error ? error.message : String(error)}`);
    return back("failed");
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
  redirect(open);
}

/** The editors the first steps are shown in, to go back to. */
const EDITORS = ["/dashboard/pages", "/studio/editor"] as const;

/** "Your first steps": a step marked done by hand (`photos`), or the steps hidden. */
export async function firstStepsAction(formData: FormData): Promise<void> {
  const context = await requireStartClient("settings");
  const app = context.app;
  const back = String(formData.get("back") ?? "");
  const to = (EDITORS as readonly string[]).includes(back) ? back : "/dashboard";
  const steps = app ? firstStepsOf(app) : null;
  if (!app || !steps) redirect(to);
  const what = formData.get("step");
  const now = new Date();
  const next = what === "hide" ? { ...steps, hiddenAt: now.toISOString() } : what === "photos" ? { ...steps, done: [...new Set([...steps.done, "photos"])] } : steps;
  await (await getStore()).updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), firstSteps: next } }, now);
  await recordStaffChange(context, what === "hide" ? "Hid the first steps" : "Marked a first step done");
  revalidatePath(to);
  redirect(to);
}
