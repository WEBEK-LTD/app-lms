"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/** 78.3 Admin › Watching's "Done": closes an open alert (it opens again if the problem comes back). */
export async function resolveAlertAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("builds.manage");
  const store = await getStore();
  const id = String(formData.get("alertId") ?? "");
  const open = /^[0-9a-f-]{36}$/i.test(id) ? (await store.listTeamAlerts({ open: true, limit: 500 })).find((a) => a.id === id) : undefined;
  if (open && (await store.resolveTeamAlert(open.id, admin.email, new Date()))) {
    await recordAudit({ actor: admin, action: "alert.resolve", target: { type: "alert", id: open.id }, summary: `Marked done: ${open.title}` });
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/watching");
}
