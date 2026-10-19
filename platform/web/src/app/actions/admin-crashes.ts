"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/** 46 Admin › Crashes: mark a crash group resolved, or open it again. A resolved group reported again opens by itself. */
export async function setCrashStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("builds.manage");
  const store = await getStore();
  const id = String(formData.get("issueId") ?? "");
  const status = formData.get("status") === "open" ? "open" : "resolved";
  const issue = /^[0-9a-f-]{36}$/i.test(id) ? await store.getCrashIssue(id) : null;
  const back = String(formData.get("back") ?? "/admin/crashes");
  const safeBack = back.startsWith("/admin/crashes") ? back : "/admin/crashes";
  if (!issue || issue.status === status) redirect(safeBack);
  await store.setCrashIssueStatus(issue.id, status, new Date());
  const app = await store.getAppById(issue.appId);
  await recordAudit({
    actor: admin,
    action: "crash.status",
    target: { type: "app", id: issue.appId },
    clientId: app?.clientId ?? null,
    summary: `${status === "resolved" ? "Marked resolved" : "Opened again"}: ${issue.title.slice(0, 120)} (${appLabel(app)})`,
    before: { status: issue.status },
    after: { status },
  });
  revalidatePath("/admin/crashes");
  redirect(safeBack);
}
