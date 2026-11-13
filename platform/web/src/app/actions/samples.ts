"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { isSampleList, LIST_PAGE, type SampleList } from "@/lib/samples/lists";
import { removeAllSamples, removeSamples } from "@/lib/samples/remove";
import { seedSamplesFor } from "@/lib/samples/demo";
import type { SampleDeps } from "@/lib/samples/seed";

/** 110.2 Sample entries: removing a list's samples, and Studio's editor asking for them after a whole design. */

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

/** Back to the page the button was on (one of the dashboard's or a Studio project's), else the list's own. */
function backTo(value: FormDataEntryValue | null, list: SampleList): string {
  const back = typeof value === "string" ? value : "";
  return /^\/(dashboard|studio\/project)(\/[a-z0-9-]+)*$/.test(back) ? back : LIST_PAGE[list];
}

/** "Remove all samples": the list's sample entries, with their pictures. */
export async function removeSamplesAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const list = formData.get("list");
  if (!isSampleList(list)) redirect("/dashboard");
  const blobs = getBlobStore();
  const removed = await removeSamples({ store: await getStore(), deleteBlob: (key) => blobs.delete(key), now: new Date() }, context.app.id, list);
  if (removed > 0) await recordStaffChange(context, `Removed ${removed} sample ${removed === 1 ? "entry" : "entries"}`);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
  redirect(`${backTo(formData.get("back"), list)}?samplesRemoved=${list}.${removed}`);
}

/** Templates = demos: "Remove all sample data", every list's at once, back to the page the button was on. */
export async function removeAllSamplesAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  const blobs = getBlobStore();
  const removed = await removeAllSamples({ store: await getStore(), deleteBlob: (key) => blobs.delete(key), now: new Date() }, context.app.id);
  if (removed > 0) await recordStaffChange(context, `Removed all sample data (${removed} ${removed === 1 ? "entry" : "entries"})`);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
  const back = String(formData.get("back") ?? "");
  // 127 Also from the editors' first steps ("Remove the demo's things").
  redirect(`${["/studio/project", "/dashboard/pages", "/studio/editor"].includes(back) ? back : "/dashboard"}?samplesRemoved=all.${removed}`);
}

/**
 * 108.7 Studio's editor took a whole design: the empty lists its pages show
 * get samples; (templates = demos) the demo's own entries when it is the
 * project's kind's demo's design, as "Start from demo" brings them.
 */
export async function seedSamplesAction(sources: string[], demo: string | null = null): Promise<{ ok: boolean; lists: SampleList[] }> {
  const { app } = await requireApp();
  if (!Array.isArray(sources) || sources.some((s) => typeof s !== "string")) return { ok: false, lists: [] };
  const blobs = getBlobStore();
  const deps: SampleDeps = { store: await getStore(), putBlob: (key, data, type) => blobs.put(key, data, type), now: new Date() };
  const lists = await seedSamplesFor(deps, app, sources.slice(0, 20), demo);
  if (lists.length) revalidatePath("/dashboard", "layout");
  return { ok: true, lists };
}
