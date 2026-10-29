"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { isSampleList, LIST_PAGE, type SampleList } from "@/lib/samples/lists";
import { removeSamples } from "@/lib/samples/remove";
import { seedSamples } from "@/lib/samples/seed";

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

/** 108.7 Studio's editor took a whole design: the empty lists its pages show get samples. */
export async function seedSamplesAction(sources: string[]): Promise<{ ok: boolean; lists: SampleList[] }> {
  const { app } = await requireApp();
  if (!Array.isArray(sources) || sources.some((s) => typeof s !== "string")) return { ok: false, lists: [] };
  const blobs = getBlobStore();
  const lists = await seedSamples({ store: await getStore(), putBlob: (key, data, type) => blobs.put(key, data, type), now: new Date() }, app.id, { sources: sources.slice(0, 20) });
  if (lists.length) revalidatePath("/dashboard", "layout");
  return { ok: true, lists };
}
