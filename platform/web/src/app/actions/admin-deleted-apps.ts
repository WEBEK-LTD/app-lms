"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { purgeApp, restoreApp } from "@/lib/apps/deletion";
import { purgeDeps } from "@/lib/apps/purge-env";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/**
 * 73 Admin › Deleted apps: our team restores an app its owner deleted, as it
 * was, while it waits (7 days), or deletes it for good at once ("Delete
 * now"), which the daily job does otherwise. Owners and admins only
 * (`clients.suspend`), and in the audit log.
 */

export async function restoreDeletedAppAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.suspend");
  const store = await getStore();
  const deletion = await store.getAppDeletion(String(formData.get("id") ?? ""));
  if (!deletion) redirect("/admin/deleted-apps");
  const ok = await restoreApp({ store, now: new Date() }, deletion.id, admin.email);
  if (ok) {
    await recordAudit({
      actor: admin,
      action: "app_deletion.restore",
      target: { type: "app_deletion", id: deletion.id },
      clientId: deletion.clientId,
      summary: `Restored ${deletion.appName}, deleted by ${deletion.deletedBy}`,
    });
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/deleted-apps?done=${ok ? "restored" : "not_waiting"}`);
}

export async function purgeDeletedAppAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.suspend");
  const store = await getStore();
  const deletion = await store.getAppDeletion(String(formData.get("id") ?? ""));
  if (!deletion) redirect("/admin/deleted-apps");
  if (formData.get("confirm") !== "on") redirect(`/admin/deleted-apps?done=confirm#d-${deletion.id}`);
  const outcome = await purgeApp(purgeDeps(store, new Date()), deletion, admin.email);
  if (outcome === "purged") {
    await recordAudit({
      actor: admin,
      action: "app_deletion.purge",
      target: { type: "app_deletion", id: deletion.id },
      clientId: deletion.clientId,
      summary: `Deleted ${deletion.appName} for good (its rows and files)`,
    });
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/deleted-apps?done=${outcome}`);
}
